import "server-only";
import { createHash } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { VendorModel as Vendor, type VendorRecord } from "./vendor.model";
import { type VendorInput, type VendorQuery } from "./vendor.schema";
import type {
  VendorView,
  VendorList,
  VendorDetail,
  VendorOptions,
} from "./vendor.types";
import { permitVendors } from "./vendor.access";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { EventModel } from "@/modules/events/event.model";
import { RoleModel } from "@/modules/roles/role.model";
import { MemberModel } from "@/modules/members/member.model";
import { appendActivity } from "@/modules/activity/activity.repository";
import { vendorExpenseTotals } from "@/modules/expenses/expense.repository";
type Row = VendorRecord & { _id: Types.ObjectId };
const conflict = () => {
  throw new AccessError(
    409,
    "CONFLICT",
    "This vendor changed. Close and reload before continuing.",
  );
};
const missing = () => {
  throw new AccessError(404, "NOT_FOUND", "Vendor not found.");
};
async function views(ctx: TenantContext, rows: Row[]): Promise<VendorView[]> {
  const events = await EventModel.find({
    tenantId: ctx.tenantId,
    _id: { $in: rows.flatMap((r) => r.eventIds) },
  })
    .select("name")
    .lean();
  const names = new Map(events.map((e) => [String(e._id), e.name]));
  return rows.map((r) => ({
    id: String(r._id),
    name: r.name,
    category: r.category,
    contact: {
      personName: r.contact?.personName ?? "",
      phone: r.contact?.phone ?? "",
      email: r.contact?.email ?? "",
    },
    service: r.service,
    notes: r.notes,
    status: r.status as VendorView["status"],
    revision: r.revision,
    events: r.eventIds.map((id) => ({
      id: String(id),
      name: names.get(String(id)) ?? "Linked event",
    })),
  }));
}
export async function listVendors(
  ctx: TenantContext,
  q: VendorQuery,
): Promise<VendorList> {
  permitVendors(ctx);
  const filter = {
    tenantId: ctx.tenantId,
    status: q.status,
    ...(q.category ? { category: q.category } : {}),
    ...(q.eventId ? { eventIds: q.eventId } : {}),
    ...(q.search
      ? {
          $or: [
            "name",
            "contact.personName",
            "contact.phone",
            "contact.email",
          ].map((key) => ({
            [key]: {
              $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          })),
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    Vendor.find(filter)
      .sort(
        q.sort === "NAME" ? { name: 1, _id: 1 } : { createdAt: -1, _id: -1 },
      )
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);
  return {
    vendors: await views(ctx, rows),
    total,
    page: q.page,
    limit: q.limit,
  };
}
export async function getVendor(
  ctx: TenantContext,
  id: string,
): Promise<VendorDetail> {
  permitVendors(ctx);
  const row = await Vendor.findOne({ tenantId: ctx.tenantId, _id: id }).lean();
  if (!row) return missing();
  const [view] = await views(ctx, [row]);
  return {
    ...view,
    ...(ctx.permissions.includes("VIEW_EXPENSES")
      ? { financials: await vendorExpenseTotals(ctx, id) }
      : {}),
  };
}
export async function vendorOptions(
  ctx: TenantContext,
): Promise<VendorOptions> {
  permitVendors(ctx);
  const events = await EventModel.find({ tenantId: ctx.tenantId })
    .select("name")
    .sort({ startAt: 1, _id: 1 })
    .limit(500)
    .lean();
  return { events: events.map((e) => ({ id: String(e._id), name: e.name })) };
}
async function write<T>(
  ctx: TenantContext,
  operation: (session: ClientSession) => Promise<T>,
) {
  permitVendors(ctx, true);
  await Vendor.init();
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      // Recheck the explicit vendor-account restriction from current persisted roles.
      const member = await MemberModel.findOne({
        _id: ctx.memberId,
        tenantId: ctx.tenantId,
        membershipStatus: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!member)
        throw new AccessError(403, "FORBIDDEN", "Active membership required.");
      const roles = await RoleModel.find({
        tenantId: ctx.tenantId,
        _id: { $in: member.roleIds },
      })
        .session(session)
        .lean();
      if (roles.some((r) => r.key === "VENDOR"))
        throw new AccessError(
          403,
          "FORBIDDEN",
          "Vendor account access is not available in this slice.",
        );
      return operation(session);
    },
    { ctx, permission: ["VIEW_VENDORS", "MANAGE_VENDORS"] },
  );
}
async function events(
  ctx: TenantContext,
  input: VendorInput,
  session: ClientSession,
) {
  for (const id of input.eventIds) {
    const result = await EventModel.collection.updateOne(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(ctx.tenantId),
      },
      { $inc: { referenceVersion: 1 } },
      { session },
    );
    if (!result.matchedCount)
      throw new AccessError(
        400,
        "INVALID_REFERENCE",
        "Choose events from this wedding.",
      );
  }
}
async function audit(
  ctx: TenantContext,
  id: string,
  action: string,
  session: ClientSession,
) {
  await appendActivity(
    {
      tenantId: ctx.tenantId,
      actorMemberId: ctx.memberId,
      resourceType: "VENDOR",
      resourceId: id,
      action,
      summary: action.toLowerCase().replaceAll("_", " ") + ".",
    },
    session,
  );
}
export async function createVendor(
  ctx: TenantContext,
  input: VendorInput,
  requestId: string,
) {
  return write(ctx, async (session) => {
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const existing = await Vendor.findOne({ tenantId: ctx.tenantId, requestId })
      .select("+requestHash")
      .session(session)
      .lean();
    if (existing) {
      if (existing.requestHash !== hash) conflict();
      return { id: String(existing._id) };
    }
    await events(ctx, input, session);
    const [row] = await Vendor.create(
      [{ ...input, tenantId: ctx.tenantId, requestId, requestHash: hash }],
      { session, ordered: true },
    );
    await audit(ctx, String(row._id), "VENDOR_CREATED", session);
    return { id: String(row._id) };
  });
}
export async function updateVendor(
  ctx: TenantContext,
  id: string,
  input: VendorInput,
  revision: number,
) {
  return write(ctx, async (session) => {
    const row = await Vendor.findOne({ tenantId: ctx.tenantId, _id: id })
      .session(session)
      .lean();
    if (!row) return missing();
    if (row.revision !== revision || row.status !== "ACTIVE") conflict();
    await events(ctx, input, session);
    const changed = await Vendor.updateOne(
      { tenantId: ctx.tenantId, _id: id, revision },
      { $set: input, $inc: { revision: 1 } },
      { session, runValidators: true },
    );
    if (!changed.matchedCount) conflict();
    await audit(ctx, id, "VENDOR_UPDATED", session);
    return { id };
  });
}
export async function archiveVendor(
  ctx: TenantContext,
  id: string,
  revision: number,
  restore: boolean,
) {
  return write(ctx, async (session) => {
    const row = await Vendor.findOne({ tenantId: ctx.tenantId, _id: id })
      .session(session)
      .lean();
    if (!row) return missing();
    if (
      row.revision !== revision ||
      row.status !== (restore ? "ARCHIVED" : "ACTIVE")
    )
      conflict();
    const changed = await Vendor.updateOne(
      { tenantId: ctx.tenantId, _id: id, revision },
      {
        $set: { status: restore ? "ACTIVE" : "ARCHIVED" },
        $inc: { revision: 1 },
      },
      { session },
    );
    if (!changed.matchedCount) conflict();
    await audit(
      ctx,
      id,
      restore ? "VENDOR_RESTORED" : "VENDOR_ARCHIVED",
      session,
    );
    return { id };
  });
}

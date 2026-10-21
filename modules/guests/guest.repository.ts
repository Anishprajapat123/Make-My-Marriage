import "server-only";
import mongoose, { Types, type ClientSession } from "mongoose";
import { createHash } from "node:crypto";
import {
  GuestModel as Guest,
  GuestFamilyModel as Family,
  type GuestRecord,
  type FamilyRecord,
} from "./guest.model";
import { MemberModel } from "@/modules/members/member.model";
import { RoleModel } from "@/modules/roles/role.model";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { appendActivity } from "@/modules/activity/activity.repository";
import type { GuestInput, FamilyInput, GuestQuery } from "./guest.schema";
import type { GuestView, FamilyView, DuplicateDetails } from "./guest.types";
type GuestRow = GuestRecord & { _id: Types.ObjectId };
type FamilyRow = FamilyRecord & { _id: Types.ObjectId };
export const normalizeGuestName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function conflict(): never {
  throw new AccessError(
    409,
    "CONFLICT",
    "This record changed or is unavailable. Reload before editing.",
  );
}
export class GuestDuplicateError extends AccessError {
  constructor(public details: DuplicateDetails) {
    super(
      409,
      "POSSIBLE_DUPLICATE",
      "Please review possible matches before saving this guest.",
    );
  }
}
async function write<T>(
  ctx: TenantContext,
  operation: (session: ClientSession) => Promise<T>,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const member = await MemberModel.findOne({
        _id: ctx.memberId,
        tenantId: ctx.tenantId,
        membershipStatus: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!member)
        throw new AccessError(
          403,
          "FORBIDDEN",
          "Active guest management access is required.",
        );
      const roles = await RoleModel.find({
        tenantId: ctx.tenantId,
        _id: { $in: member.roleIds },
      })
        .session(session)
        .lean();
      if (!roles.some((r) => r.permissionKeys.includes("MANAGE_GUESTS")))
        throw new AccessError(
          403,
          "FORBIDDEN",
          "Guest management permission is required.",
        );
      await MemberModel.collection.updateOne(
        {
          _id: new Types.ObjectId(ctx.memberId),
          tenantId: new Types.ObjectId(ctx.tenantId),
        },
        { $inc: { accessVersion: 1 } },
        { session },
      );
      // Serialize guest/family writes per wedding: duplicate checks and family references
      // must observe the result of any concurrent mutation before committing.
      const wedding = await mongoose.connection
        .collection("weddings")
        .updateOne(
          { _id: new Types.ObjectId(ctx.tenantId) },
          { $inc: { guestWriteVersion: 1 } },
          { session },
        );
      if (!wedding.matchedCount)
        throw new AccessError(404, "NOT_FOUND", "Wedding unavailable.");
      return operation(session);
    });
  } finally {
    await session.endSession();
  }
}
async function audit(
  ctx: TenantContext,
  id: string,
  action: string,
  session: ClientSession,
  resourceType = "GUEST",
) {
  await appendActivity(
    {
      tenantId: ctx.tenantId,
      actorMemberId: ctx.memberId,
      resourceType,
      resourceId: id,
      action,
      summary: action.toLowerCase().replaceAll("_", " ") + ".",
    },
    session,
  );
}
function guestView(row: GuestRow, families: FamilyRow[]): GuestView {
  return {
    id: String(row._id),
    name: row.name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    familyId: row.familyId ? String(row.familyId) : null,
    familyName:
      families.find((f) => String(f._id) === String(row.familyId))?.name ??
      null,
    relationship: row.relationship,
    side: row.side,
    guestType: row.guestType,
    notes: row.notes,
    status: row.status,
    revision: row.revision,
  };
}
async function guestViews(tenantId: string, rows: GuestRow[]) {
  const families = await Family.find({
    tenantId,
    _id: { $in: rows.flatMap((r) => (r.familyId ? [r.familyId] : [])) },
  }).lean();
  return rows.map((r) => guestView(r, families));
}
export const guestRepository = {
  async list(tenantId: string, q: GuestQuery) {
    const filter = {
      tenantId,
      ...(q.status !== "ALL" ? { status: q.status } : {}),
      ...(q.familyId
        ? { familyId: q.familyId === "UNGROUPED" ? null : q.familyId }
        : {}),
      ...(q.side ? { side: q.side } : {}),
      ...(q.relationship
        ? { relationship: { $regex: escape(q.relationship), $options: "i" } }
        : {}),
      ...(q.search
        ? {
            $or: [
              {
                normalizedName: {
                  $regex: escape(normalizeGuestName(q.search) || q.search),
                },
              },
              {
                phone: {
                  $regex: escape(q.search.replace(/[\s().-]/g, "") || q.search),
                },
              },
              { email: { $regex: escape(q.search), $options: "i" } },
            ],
          }
        : {}),
    };
    const order = q.sortOrder === "desc" ? -1 : 1;
    const [rows, total, active, archived, families, ungrouped] =
      await Promise.all([
        Guest.find(filter)
          .sort({
            [q.sortBy === "name" ? "normalizedName" : "createdAt"]: order,
            _id: order,
          })
          .skip((q.page - 1) * q.limit)
          .limit(q.limit)
          .lean(),
        Guest.countDocuments(filter),
        Guest.countDocuments({ tenantId, status: "ACTIVE" }),
        Guest.countDocuments({ tenantId, status: "ARCHIVED" }),
        Family.countDocuments({ tenantId }),
        Guest.countDocuments({ tenantId, status: "ACTIVE", familyId: null }),
      ]);
    return {
      guests: await guestViews(tenantId, rows),
      total,
      page: q.page,
      limit: q.limit,
      counts: { active, archived, families, ungrouped },
    };
  },
  async get(tenantId: string, id: string) {
    const row = await Guest.findOne({ tenantId, _id: id }).lean();
    if (!row) throw new AccessError(404, "NOT_FOUND", "Guest not found.");
    return (await guestViews(tenantId, [row]))[0];
  },
  async family(tenantId: string, id: string) {
    const row = await Family.findOne({ tenantId, _id: id }).lean();
    if (!row) throw new AccessError(404, "NOT_FOUND", "Family not found.");
    return row;
  },
  async families(
    tenantId: string,
    q: { page: number; limit: number; search: string },
  ) {
    const filter = {
      tenantId,
      ...(q.search
        ? { normalizedName: { $regex: escape(normalizeGuestName(q.search)) } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      Family.find(filter)
        .sort({ normalizedName: 1, _id: 1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean(),
      Family.countDocuments(filter),
    ]);
    const ids = rows.map((r) => r._id);
    const [counts, contacts] = await Promise.all([
      Guest.aggregate<{
        _id: { familyId: Types.ObjectId; status: string };
        count: number;
      }>([
        {
          $match: {
            tenantId: new Types.ObjectId(tenantId),
            familyId: { $in: ids },
          },
        },
        {
          $group: {
            _id: { familyId: "$familyId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
      Guest.find({
        tenantId,
        status: "ACTIVE",
        _id: {
          $in: rows.flatMap((r) =>
            r.primaryContactGuestId ? [r.primaryContactGuestId] : [],
          ),
        },
      })
        .select("name familyId")
        .lean(),
    ]);
    const families: FamilyView[] = rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      side: r.side,
      notes: r.notes,
      revision: r.revision,
      primaryContactGuestId: r.primaryContactGuestId
        ? String(r.primaryContactGuestId)
        : null,
      primaryContactName:
        contacts.find(
          (c) =>
            String(c._id) === String(r.primaryContactGuestId) &&
            String(c.familyId) === String(r._id),
        )?.name ?? null,
      activeCount:
        counts.find(
          (c) =>
            String(c._id.familyId) === String(r._id) &&
            c._id.status === "ACTIVE",
        )?.count ?? 0,
      archivedCount:
        counts.find(
          (c) =>
            String(c._id.familyId) === String(r._id) &&
            c._id.status === "ARCHIVED",
        )?.count ?? 0,
    }));
    return { families, total, page: q.page, limit: q.limit };
  },
  async save(ctx: TenantContext, p: GuestInput, id?: string) {
    return write(ctx, async (session) => {
      const previous = id
        ? await Guest.findOne({
            tenantId: ctx.tenantId,
            _id: id,
            revision: p.revision,
          })
            .session(session)
            .lean()
        : null;
      if (id && !previous) conflict();
      if (previous?.status === "ARCHIVED")
        throw new AccessError(
          409,
          "ARCHIVED_GUEST",
          "Restore this guest before editing.",
        );
      if (
        p.familyId &&
        !(await Family.exists({
          tenantId: ctx.tenantId,
          _id: p.familyId,
        }).session(session))
      )
        throw new AccessError(
          400,
          "VALIDATION_ERROR",
          "Select a family from this wedding.",
        );
      const { revision, duplicateConfirmation, ...fields } = p;
      const normalizedName = normalizeGuestName(p.name);
      const checks: object[] = [{ normalizedName }];
      if (p.phone) checks.push({ phone: p.phone });
      if (p.email) checks.push({ email: p.email });
      const matches = await Guest.find({
        tenantId: ctx.tenantId,
        ...(id ? { _id: { $ne: id } } : {}),
        $or: checks,
      })
        .sort({ _id: 1 })
        .limit(11)
        .session(session)
        .lean();
      if (matches.length) {
        const confirmation = createHash("sha256")
          .update(
            JSON.stringify({
              tenant: ctx.tenantId,
              id,
              fields,
              matches: matches.map((m) => [String(m._id), m.revision]),
            }),
          )
          .digest("hex");
        if (duplicateConfirmation !== confirmation) {
          const families = await Family.find({
            tenantId: ctx.tenantId,
            _id: {
              $in: matches.flatMap((m) => (m.familyId ? [m.familyId] : [])),
            },
          })
            .session(session)
            .lean();
          throw new GuestDuplicateError({
            confirmation,
            matches: matches.slice(0, 10).map((m) => ({
              id: String(m._id),
              name: m.name,
              familyName:
                families.find((f) => String(f._id) === String(m.familyId))
                  ?.name ?? null,
              status: m.status,
              reasons: [
                ...(m.normalizedName === normalizedName
                  ? ["Matching name"]
                  : []),
                ...(p.phone && m.phone === p.phone ? ["Shared phone"] : []),
                ...(p.email && m.email === p.email ? ["Shared email"] : []),
              ],
            })),
          });
        }
      }
      let row;
      if (id)
        row = await Guest.findOneAndUpdate(
          { tenantId: ctx.tenantId, _id: id, revision },
          { $set: { ...fields, normalizedName }, $inc: { revision: 1 } },
          { session, returnDocument: "after", runValidators: true },
        ).lean();
      else {
        const [created] = await Guest.create(
          [
            {
              ...fields,
              normalizedName,
              tenantId: ctx.tenantId,
              source: ctx.roleKeys.includes("OWNER") ? "ADMIN" : "MEMBER",
            },
          ],
          { session, ordered: true },
        );
        row = created.toObject();
      }
      if (!row) conflict();
      if (previous?.familyId && String(previous.familyId) !== p.familyId)
        await Family.updateMany(
          { tenantId: ctx.tenantId, primaryContactGuestId: previous._id },
          { $set: { primaryContactGuestId: null }, $inc: { revision: 1 } },
          { session },
        );
      await audit(
        ctx,
        String(row._id),
        id ? "GUEST_UPDATED" : "GUEST_CREATED",
        session,
      );
      return { id: String(row._id) };
    });
  },
  async status(
    ctx: TenantContext,
    id: string,
    revision: number,
    status: "ACTIVE" | "ARCHIVED",
  ) {
    return write(ctx, async (session) => {
      const row = await Guest.findOneAndUpdate(
        {
          tenantId: ctx.tenantId,
          _id: id,
          revision,
          status: status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
        },
        { $set: { status }, $inc: { revision: 1 } },
        { session, returnDocument: "after" },
      ).lean();
      if (!row) conflict();
      if (status === "ARCHIVED")
        await Family.updateMany(
          { tenantId: ctx.tenantId, primaryContactGuestId: row._id },
          { $set: { primaryContactGuestId: null }, $inc: { revision: 1 } },
          { session },
        );
      await audit(
        ctx,
        id,
        status === "ACTIVE" ? "GUEST_RESTORED" : "GUEST_ARCHIVED",
        session,
      );
      return { id };
    });
  },
  async saveFamily(ctx: TenantContext, p: FamilyInput, id?: string) {
    return write(ctx, async (session) => {
      if (!id && p.primaryContactGuestId)
        throw new AccessError(
          400,
          "VALIDATION_ERROR",
          "Create the family and add its guests before choosing a primary contact.",
        );
      if (
        p.primaryContactGuestId &&
        !(await Guest.exists({
          tenantId: ctx.tenantId,
          _id: p.primaryContactGuestId,
          familyId: id,
          status: "ACTIVE",
        }).session(session))
      )
        throw new AccessError(
          400,
          "VALIDATION_ERROR",
          "Primary contact must be an active guest in this family.",
        );
      const { revision, ...fields } = p;
      const values = { ...fields, normalizedName: normalizeGuestName(p.name) };
      let row;
      if (id)
        row = await Family.findOneAndUpdate(
          { tenantId: ctx.tenantId, _id: id, revision },
          { $set: values, $inc: { revision: 1 } },
          { session, returnDocument: "after", runValidators: true },
        ).lean();
      else {
        const [created] = await Family.create(
          [{ ...values, tenantId: ctx.tenantId }],
          { session, ordered: true },
        );
        row = created.toObject();
      }
      if (!row) conflict();
      await audit(
        ctx,
        String(row._id),
        id ? "FAMILY_UPDATED" : "FAMILY_CREATED",
        session,
        "GUEST_FAMILY",
      );
      return { id: String(row._id) };
    });
  },
  async removeFamily(ctx: TenantContext, id: string, revision: number) {
    return write(ctx, async (session) => {
      if (
        await Guest.exists({ tenantId: ctx.tenantId, familyId: id }).session(
          session,
        )
      )
        throw new AccessError(
          409,
          "FAMILY_HAS_GUESTS",
          "Reassign or ungroup all guests, including archived guests, before deleting this family.",
        );
      const result = await Family.deleteOne(
        { tenantId: ctx.tenantId, _id: id, revision },
        { session },
      );
      if (!result.deletedCount) conflict();
      await audit(ctx, id, "FAMILY_DELETED", session, "GUEST_FAMILY");
      return { deleted: true };
    });
  },
};

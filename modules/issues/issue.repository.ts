import "server-only";
import { createHash } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import {
  IssueModel as Issue,
  IssueCommentModel as Comment,
  type IssueRecord,
} from "./issue.model";
import {
  issueScope,
  broadIssues,
  requireIssueManager,
  commentIssues,
} from "./issue.access";
import type { IssueInput, IssueEditInput, IssueQuery } from "./issue.schema";
import type {
  IssueView,
  IssueList,
  IssueOptions,
  IssueComments,
} from "./issue.types";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { MemberModel } from "@/modules/members/member.model";
import { RoleModel } from "@/modules/roles/role.model";
import { UserModel } from "@/modules/auth/user.model";
import { EventModel } from "@/modules/events/event.model";
import { VendorModel } from "@/modules/vendors/vendor.model";
import { appendActivity } from "@/modules/activity/activity.repository";
type Row = IssueRecord & { _id: Types.ObjectId };
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
function missing(): never {
  throw new AccessError(404, "NOT_FOUND", "Issue not found.");
}
function conflict(
  message = "This issue changed. Close and reload before continuing.",
): never {
  throw new AccessError(409, "CONFLICT", message);
}
const canVendors = (ctx: TenantContext) =>
  ctx.permissions.includes("VIEW_VENDORS") && !ctx.roleKeys.includes("VENDOR");
async function memberNames(tenantId: string, ids: unknown[]) {
  const members = await MemberModel.find({ tenantId, _id: { $in: ids } })
    .select("userId")
    .lean();
  const users = await UserModel.find({
    _id: { $in: members.map((m) => m.userId) },
  })
    .select("displayName")
    .lean();
  const names = new Map(
    users.map((u) => [String(u._id), String(u.displayName)]),
  );
  return new Map(
    members.map((m) => [
      String(m._id),
      names.get(String(m.userId)) ?? "Former member",
    ]),
  );
}
async function views(ctx: TenantContext, rows: Row[]): Promise<IssueView[]> {
  const [names, events, vendors] = await Promise.all([
    memberNames(
      ctx.tenantId,
      rows.flatMap((r) => [
        r.reportedByMemberId,
        ...(r.assignedToMemberId ? [r.assignedToMemberId] : []),
      ]),
    ),
    ctx.permissions.includes("VIEW_EVENTS")
      ? EventModel.find({
          tenantId: ctx.tenantId,
          _id: { $in: rows.flatMap((r) => (r.eventId ? [r.eventId] : [])) },
        })
          .select("name")
          .lean()
      : [],
    canVendors(ctx)
      ? VendorModel.find({
          tenantId: ctx.tenantId,
          _id: { $in: rows.flatMap((r) => (r.vendorId ? [r.vendorId] : [])) },
        })
          .select("name")
          .lean()
      : [],
  ]);
  const eventNames = new Map(
      events.map((e) => [String(e._id), String(e.name)]),
    ),
    vendorNames = new Map(vendors.map((v) => [String(v._id), v.name]));
  return rows.map((r) => ({
    id: String(r._id),
    title: r.title,
    description: r.description,
    priority: r.priority as IssueView["priority"],
    status: r.status as IssueView["status"],
    revision: r.revision,
    reportedByMemberId: String(r.reportedByMemberId),
    reporterName: names.get(String(r.reportedByMemberId)) ?? "Former member",
    assignedToMemberId: r.assignedToMemberId
      ? String(r.assignedToMemberId)
      : null,
    assigneeName: r.assignedToMemberId
      ? (names.get(String(r.assignedToMemberId)) ?? "Former member")
      : null,
    eventId: r.eventId ? String(r.eventId) : null,
    eventName: r.eventId ? (eventNames.get(String(r.eventId)) ?? null) : null,
    vendorId: r.vendorId ? String(r.vendorId) : null,
    vendorName: r.vendorId
      ? (vendorNames.get(String(r.vendorId)) ?? null)
      : null,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }));
}
export async function listIssues(
  ctx: TenantContext,
  q: IssueQuery,
): Promise<IssueList> {
  const scope = issueScope(ctx),
    filter = {
      ...scope,
      ...(q.search
        ? {
            title: {
              $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          }
        : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.priority ? { priority: q.priority } : {}),
      ...(q.eventId ? { eventId: q.eventId } : {}),
      ...(q.assignedToMemberId
        ? { assignedToMemberId: q.assignedToMemberId }
        : {}),
    };
  const [rows, total, open, inProgress, resolved] = await Promise.all([
    Issue.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Issue.countDocuments(filter),
    Issue.countDocuments({ ...scope, status: "OPEN" }),
    Issue.countDocuments({ ...scope, status: "IN_PROGRESS" }),
    Issue.countDocuments({ ...scope, status: "RESOLVED" }),
  ]);
  return {
    issues: await views(ctx, rows),
    total,
    page: q.page,
    limit: q.limit,
    counts: { open, inProgress, resolved },
  };
}
export async function getIssue(ctx: TenantContext, id: string) {
  const row = await Issue.findOne({ ...issueScope(ctx), _id: id }).lean();
  if (!row) missing();
  return (await views(ctx, [row]))[0];
}
async function eligibleMembers(ctx: TenantContext) {
  const roles = await RoleModel.find({ tenantId: ctx.tenantId })
    .select("key permissionKeys")
    .lean();
  const allowed = roles
      .filter((r) => r.permissionKeys.includes("VIEW_ISSUES"))
      .map((r) => r._id),
    vendors = roles.filter((r) => r.key === "VENDOR").map((r) => r._id);
  return MemberModel.find({
    tenantId: ctx.tenantId,
    membershipStatus: "ACTIVE",
    $and: [{ roleIds: { $in: allowed } }, { roleIds: { $nin: vendors } }],
  })
    .select("userId")
    .sort({ _id: 1 })
    .limit(500)
    .lean();
}
export async function issueOptions(ctx: TenantContext): Promise<IssueOptions> {
  issueScope(ctx);
  const [events, vendors, members] = await Promise.all([
    ctx.permissions.includes("VIEW_EVENTS")
      ? EventModel.find({ tenantId: ctx.tenantId })
          .select("name")
          .sort({ startAt: 1, _id: 1 })
          .limit(500)
          .lean()
      : [],
    canVendors(ctx)
      ? VendorModel.find({ tenantId: ctx.tenantId, status: "ACTIVE" })
          .select("name")
          .sort({ name: 1, _id: 1 })
          .limit(500)
          .lean()
      : [],
    broadIssues(ctx) && ctx.permissions.includes("MANAGE_ISSUES")
      ? eligibleMembers(ctx)
      : [],
  ]);
  const names = await memberNames(
    ctx.tenantId,
    members.map((m) => m._id),
  );
  return {
    events: events.map((e) => ({ id: String(e._id), name: String(e.name) })),
    vendors: vendors.map((v) => ({ id: String(v._id), name: v.name })),
    members: members.map((m) => ({
      id: String(m._id),
      name: names.get(String(m._id)) ?? "Member",
    })),
  };
}
async function write<T>(
  ctx: TenantContext,
  mode: "CREATE" | "MANAGE" | "COMMENT",
  operation: (fresh: TenantContext, session: ClientSession) => Promise<T>,
) {
  await Issue.init();
  await Comment.init();
  const permission =
    mode === "CREATE"
      ? "REPORT_ISSUES"
      : mode === "MANAGE"
        ? ["VIEW_ISSUES", "MANAGE_ISSUES"]
        : ctx.permissions.includes("REPORT_ISSUES")
          ? "REPORT_ISSUES"
          : ["VIEW_ISSUES", "MANAGE_ISSUES"];
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const member = await MemberModel.findOne({
        tenantId: ctx.tenantId,
        _id: ctx.memberId,
        membershipStatus: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!member)
        throw new AccessError(
          403,
          "FORBIDDEN",
          "Active membership is required.",
        );
      const roles = await RoleModel.find({
        tenantId: ctx.tenantId,
        _id: { $in: member.roleIds },
      })
        .session(session)
        .lean();
      const fresh = {
        ...ctx,
        permissions: [
          ...new Set<string>(roles.flatMap((r) => r.permissionKeys)),
        ],
        roleKeys: roles.map((r) => String(r.key)),
      };
      issueScope(fresh);
      if (mode === "MANAGE") requireIssueManager(fresh);
      if (mode === "COMMENT" && !commentIssues(fresh))
        throw new AccessError(
          403,
          "FORBIDDEN",
          "Commenting permission is required.",
        );
      return operation(fresh, session);
    },
    { ctx, permission },
  );
}
async function references(
  ctx: TenantContext,
  input: IssueInput,
  session: ClientSession,
  previous?: Row,
) {
  if (input.eventId) {
    if (
      input.eventId !== String(previous?.eventId ?? "") &&
      !ctx.permissions.includes("VIEW_EVENTS")
    )
      throw new AccessError(
        403,
        "FORBIDDEN",
        "Event lookup permission is required.",
      );
    const result = await EventModel.collection.updateOne(
      {
        tenantId: new Types.ObjectId(ctx.tenantId),
        _id: new Types.ObjectId(input.eventId),
      },
      { $inc: { referenceVersion: 1 } },
      { session },
    );
    if (!result.matchedCount)
      throw new AccessError(
        400,
        "INVALID_REFERENCE",
        "Choose an event from this wedding.",
      );
  }
  if (input.vendorId) {
    if (input.vendorId !== String(previous?.vendorId ?? "") && !canVendors(ctx))
      throw new AccessError(
        403,
        "FORBIDDEN",
        "Vendor lookup permission is required.",
      );
    const result = await VendorModel.collection.updateOne(
      {
        tenantId: new Types.ObjectId(ctx.tenantId),
        _id: new Types.ObjectId(input.vendorId),
        ...(input.vendorId === String(previous?.vendorId ?? "")
          ? {}
          : { status: "ACTIVE" }),
      },
      { $inc: { referenceVersion: 1 } },
      { session },
    );
    if (!result.matchedCount)
      throw new AccessError(
        400,
        "INVALID_REFERENCE",
        "Choose an active vendor from this wedding.",
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
      resourceType: "ISSUE",
      resourceId: id,
      action,
      summary: action.toLowerCase().replaceAll("_", " ") + ".",
    },
    session,
  );
}
export async function createIssue(
  ctx: TenantContext,
  input: IssueInput,
  requestId: string,
) {
  return write(ctx, "CREATE", async (fresh, session) => {
    const digest = hash(input),
      existing = await Issue.findOne({ tenantId: fresh.tenantId, requestId })
        .select("+requestHash")
        .session(session)
        .lean();
    if (existing) {
      if (
        String(existing.reportedByMemberId) !== fresh.memberId ||
        existing.requestHash !== digest
      )
        conflict("This save identifier was already used.");
      return { id: String(existing._id) };
    }
    await references(fresh, input, session);
    const [row] = await Issue.create(
      [
        {
          ...input,
          tenantId: fresh.tenantId,
          reportedByMemberId: fresh.memberId,
          requestId,
          requestHash: digest,
        },
      ],
      { session, ordered: true },
    );
    await audit(fresh, String(row._id), "ISSUE_REPORTED", session);
    return { id: String(row._id) };
  });
}
export async function updateIssue(
  ctx: TenantContext,
  id: string,
  input: IssueEditInput,
  revision: number,
) {
  return write(ctx, "MANAGE", async (fresh, session) => {
    const row = await Issue.findOne({ ...issueScope(fresh), _id: id })
      .session(session)
      .lean();
    if (!row) missing();
    if (row.revision !== revision) conflict();
    await references(fresh, input, session, row);
    if (
      input.assignedToMemberId &&
      input.assignedToMemberId !== String(row.assignedToMemberId ?? "")
    ) {
      const member = await MemberModel.findOne({
        tenantId: fresh.tenantId,
        _id: input.assignedToMemberId,
        membershipStatus: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!member)
        throw new AccessError(
          400,
          "INVALID_REFERENCE",
          "Choose an active issue reader.",
        );
      const roles = await RoleModel.find({
        tenantId: fresh.tenantId,
        _id: { $in: member.roleIds },
      })
        .session(session)
        .lean();
      if (
        roles.some((r) => r.key === "VENDOR") ||
        !roles.some((r) => r.permissionKeys.includes("VIEW_ISSUES"))
      )
        throw new AccessError(
          400,
          "INVALID_REFERENCE",
          "The assignee must have wedding-wide issue access.",
        );
      await MemberModel.collection.updateOne(
        { tenantId: new Types.ObjectId(fresh.tenantId), _id: member._id },
        { $inc: { accessVersion: 1 } },
        { session },
      );
    }
    const result = await Issue.updateOne(
      { tenantId: fresh.tenantId, _id: id, revision },
      { $set: input, $inc: { revision: 1 } },
      { session, runValidators: true },
    );
    if (!result.matchedCount) conflict();
    await audit(fresh, id, "ISSUE_UPDATED", session);
    return { id };
  });
}
export async function transitionIssue(
  ctx: TenantContext,
  id: string,
  revision: number,
  status: IssueView["status"],
) {
  return write(ctx, "MANAGE", async (fresh, session) => {
    const row = await Issue.findOne({ ...issueScope(fresh), _id: id })
      .session(session)
      .lean();
    if (!row) missing();
    if (row.revision !== revision || row.status === status) conflict();
    await Issue.updateOne(
      { tenantId: fresh.tenantId, _id: id, revision },
      {
        $set: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
        $inc: { revision: 1 },
      },
      { session },
    );
    await audit(
      fresh,
      id,
      status === "RESOLVED"
        ? "ISSUE_RESOLVED"
        : row.status === "RESOLVED"
          ? "ISSUE_REOPENED"
          : "ISSUE_STATUS_CHANGED",
      session,
    );
    return { id };
  });
}
export async function listComments(
  ctx: TenantContext,
  id: string,
  page: number,
): Promise<IssueComments> {
  if (!(await Issue.exists({ ...issueScope(ctx), _id: id }))) missing();
  const rows = await Comment.find({ tenantId: ctx.tenantId, issueId: id })
    .select("body authorMemberId createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * 25)
    .limit(26)
    .lean();
  const names = await memberNames(
    ctx.tenantId,
    rows.map((r) => r.authorMemberId),
  );
  return {
    comments: rows.slice(0, 25).map((r) => ({
      id: String(r._id),
      body: r.body,
      authorName: names.get(String(r.authorMemberId)) ?? "Former member",
      createdAt: r.createdAt.toISOString(),
    })),
    page,
    hasNext: rows.length > 25,
  };
}
export async function addComment(
  ctx: TenantContext,
  id: string,
  body: string,
  requestId: string,
) {
  return write(ctx, "COMMENT", async (fresh, session) => {
    if (
      !(await Issue.exists({ ...issueScope(fresh), _id: id }).session(session))
    )
      missing();
    const scope = {
        tenantId: fresh.tenantId,
        issueId: id,
        authorMemberId: fresh.memberId,
        requestId,
      },
      digest = hash(body),
      existing = await Comment.findOne(scope)
        .select("+requestHash")
        .session(session)
        .lean();
    if (existing) {
      if (existing.requestHash !== digest)
        conflict("This comment identifier was already used.");
      return { id: String(existing._id) };
    }
    const [row] = await Comment.create(
      [{ ...scope, body, requestHash: digest }],
      { session, ordered: true },
    );
    await audit(fresh, id, "ISSUE_COMMENTED", session);
    return { id: String(row._id) };
  });
}

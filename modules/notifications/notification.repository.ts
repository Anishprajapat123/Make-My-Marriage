import "server-only";
import { Types, type ClientSession } from "mongoose";
import { NotificationModel as Notification } from "./notification.model";
import type { NotificationQuery } from "./notification.schema";
import type { NotificationList } from "./notification.types";
import { TaskModel } from "@/modules/tasks/task.model";
import { taskScope, TASK_READ_PERMISSIONS } from "@/modules/tasks/task.access";
import { MemberModel } from "@/modules/members/member.model";
import { RoleModel } from "@/modules/roles/role.model";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
export async function prepareNotifications() {
  await Notification.init();
}
export async function notifyTaskAssignments(
  input: {
    tenantId: string;
    taskId: string;
    revision: number;
    actorMemberId: string;
    previous: string[];
    assigned: string[];
  },
  session: ClientSession,
) {
  const recipients = [...new Set(input.assigned)].filter(
    (id) => id !== input.actorMemberId && !input.previous.includes(id),
  );
  if (!recipients.length) return;
  const members = await MemberModel.find({
    tenantId: input.tenantId,
    _id: { $in: recipients },
    membershipStatus: "ACTIVE",
  })
    .select("roleIds")
    .session(session)
    .lean();
  const roles = await RoleModel.find({
    tenantId: input.tenantId,
    _id: { $in: members.flatMap((m) => m.roleIds) },
  })
    .select("permissionKeys")
    .session(session)
    .lean();
  const permittedRoles = new Set(
    roles
      .filter((r) =>
        TASK_READ_PERMISSIONS.some((p) => r.permissionKeys.includes(p)),
      )
      .map((r) => String(r._id)),
  );
  for (const member of members) {
    if (
      !member.roleIds.some((r: Types.ObjectId) => permittedRoles.has(String(r)))
    )
      continue;
    const filter = {
      tenantId: input.tenantId,
      recipientMemberId: member._id,
      eventKey: `task:${input.taskId}:revision:${input.revision}:assigned`,
    };
    await Notification.updateOne(
      filter,
      {
        $setOnInsert: {
          ...filter,
          type: "TASK_ASSIGNED",
          title: "Task assignment",
          body: "A task was assigned to you.",
          resourceType: "TASK",
          resourceId: input.taskId,
          isRead: false,
          readAt: null,
        },
      },
      { upsert: true, session, runValidators: true },
    );
  }
}
export async function listNotifications(
  ctx: TenantContext,
  q: NotificationQuery,
): Promise<NotificationList> {
  const scope = { tenantId: ctx.tenantId, recipientMemberId: ctx.memberId };
  const cursor = q.cursor?.split(":");
  const filter = {
    ...scope,
    ...(q.unread === "true" ? { isRead: false } : {}),
    ...(cursor
      ? {
          $or: [
            { createdAt: { $lt: new Date(Number(cursor[0])) } },
            {
              createdAt: new Date(Number(cursor[0])),
              _id: { $lt: new Types.ObjectId(cursor[1]) },
            },
          ],
        }
      : {}),
  };
  const [rows, unreadCount] = await Promise.all([
    Notification.find(filter)
      .select("resourceId isRead createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(q.limit + 1)
      .lean(),
    Notification.countDocuments({ ...scope, isRead: false }),
  ]);
  const page = rows.slice(0, q.limit);
  const tasks = TASK_READ_PERMISSIONS.some((p) => ctx.permissions.includes(p))
    ? await TaskModel.find({
        ...taskScope(ctx),
        _id: { $in: page.map((r) => r.resourceId) },
      })
        .select("title")
        .lean()
    : [];
  const titles = new Map(tasks.map((t) => [String(t._id), String(t.title)]));
  const last = page[page.length - 1];
  return {
    items: page.map((r) => {
      const title = titles.get(String(r.resourceId));
      return {
        id: String(r._id),
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
        taskTitle: title ?? null,
        taskHref: title ? `/tasks/${r.resourceId}` : null,
      };
    }),
    unreadCount,
    nextCursor:
      rows.length > q.limit && last
        ? `${last.createdAt.getTime()}:${last._id}`
        : null,
  };
}
export async function markNotificationRead(ctx: TenantContext, id: string) {
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const scope = {
        tenantId: ctx.tenantId,
        recipientMemberId: ctx.memberId,
        _id: id,
      };
      const row = await Notification.findOne(scope)
        .select("isRead")
        .session(session)
        .lean();
      if (!row)
        throw new AccessError(404, "NOT_FOUND", "Notification not found.");
      if (!row.isRead)
        await Notification.updateOne(
          { ...scope, isRead: false },
          { $set: { isRead: true, readAt: new Date() } },
          { session },
        );
      return { id, isRead: true };
    },
    { ctx, permission: "VIEW_WEDDING" },
  );
}

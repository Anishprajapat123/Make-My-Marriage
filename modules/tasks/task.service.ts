import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { taskScope, canManageTasks, requireTaskManager } from "./task.access";
import { taskRepository } from "./task.repository";
import {
  assignedTaskInputSchema,
  commentInputSchema,
  taskInputSchema,
  taskPatchSchema,
  taskQuerySchema,
} from "./task.schema";
import type { TaskView } from "./task.types";
import type { z } from "zod";
import { resourceActivity } from "@/modules/activity/activity.repository";
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const p = schema.safeParse(input);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" "),
    );
  return p.data;
}
function idCheck(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id))
    throw new AccessError(404, "NOT_FOUND", "Task not found.");
}
function dto(record: object): TaskView {
  const r = JSON.parse(JSON.stringify(record));
  return {
    id: r._id,
    title: r.title,
    description: r.description,
    eventId: r.eventId ?? null,
    assigneeMemberIds: r.assigneeMemberIds,
    dueAt: r.dueAt ?? null,
    priority: r.priority,
    status: r.status,
    checklist: r.checklist,
    completedAt: r.completedAt ?? null,
    revision: r.revision,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
export async function listTasks(ctx: TenantContext, query: unknown) {
  const scope = taskScope(ctx),
    q = parse(taskQuerySchema, query);
  const conditions: object[] = [];
  if (q.q)
    conditions.push({
      title: {
        $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      },
    });
  if (q.status) conditions.push({ status: q.status });
  if (q.priority) conditions.push({ priority: q.priority });
  if (q.eventId) conditions.push({ eventId: q.eventId });
  if (q.assigneeMemberId)
    conditions.push({ assigneeMemberIds: q.assigneeMemberId });
  if (q.mine === "true") conditions.push({ assigneeMemberIds: ctx.memberId });
  if (q.overdue === "true")
    conditions.push({
      dueAt: { $ne: null, $lt: new Date() },
      status: { $ne: "COMPLETED" },
    });
  const r = await taskRepository.list(
    scope,
    conditions.length ? { $and: conditions } : {},
    q.page,
  );
  return {
    tasks: await taskRepository.labels(ctx.tenantId, r.tasks.map(dto)),
    total: r.total,
    counts: {
      total: r.counts.total,
      todo: r.counts.todo,
      inProgress: r.counts.inProgress,
      completed: r.counts.completed,
      overdue: r.counts.overdue,
    },
    page: q.page,
    pageSize: 25,
  };
}
export async function getTask(ctx: TenantContext, id: string) {
  idCheck(id);
  const r = await taskRepository.get({ ...taskScope(ctx), _id: id });
  if (!r) throw new AccessError(404, "NOT_FOUND", "Task not found.");
  return (await taskRepository.labels(ctx.tenantId, [dto(r)]))[0];
}
export async function taskOptions(ctx: TenantContext) {
  requireTaskManager(ctx);
  return taskRepository.options(ctx.tenantId);
}
export async function saveTask(
  ctx: TenantContext,
  input: unknown,
  id?: string,
) {
  if (id) idCheck(id);
  const scope = taskScope(ctx);
  if (!id || canManageTasks(ctx)) {
    requireTaskManager(ctx);
    const p = id
        ? parse(taskPatchSchema, input)
        : parse(taskInputSchema, input),
      { revision, ...fields } = p;
    if (id && revision === undefined)
      throw new AccessError(
        400,
        "VALIDATION_ERROR",
        "The current task revision is required.",
      );
    const previous = id ? await getTask(ctx, id) : null;
    const status = fields.status ?? previous?.status;
    const completedAt =
      status === "COMPLETED"
        ? previous?.completedAt
          ? new Date(previous.completedAt)
          : new Date()
        : null;
    return dto(
      await taskRepository.save(
        { ...scope, ...(id ? { _id: id } : {}) },
        {
          ...fields,
          ...(fields.dueAt !== undefined
            ? { dueAt: fields.dueAt ? new Date(fields.dueAt) : null }
            : {}),
          completedAt,
        },
        revision,
        ctx.memberId,
      ),
    );
  }
  if (!ctx.permissions.includes("UPDATE_ASSIGNED_TASKS"))
    throw new AccessError(403, "FORBIDDEN", "You cannot update this task.");
  // Even a member with VIEW_TASKS and assigned-update permission may update only their own tasks.
  const assignedScope = {
    tenantId: ctx.tenantId,
    assigneeMemberIds: ctx.memberId,
    _id: id,
  };
  const r = await taskRepository.get(assignedScope);
  if (!r) throw new AccessError(404, "NOT_FOUND", "Task not found.");
  const current = dto(r),
    p = parse(assignedTaskInputSchema, input);
  const fields: Record<string, unknown> = {};
  if (p.checklist) {
    if (
      p.checklist.length !== current.checklist.length ||
      new Set(p.checklist.map((i) => i.id)).size !== p.checklist.length ||
      p.checklist.some((i) => !current.checklist.some((c) => c.id === i.id))
    )
      throw new AccessError(
        400,
        "VALIDATION_ERROR",
        "Only existing checklist completion can be updated.",
      );
    fields.checklist = current.checklist.map((c) => ({
      ...c,
      done: p.checklist!.find((i) => i.id === c.id)!.done,
    }));
  }
  if (p.status) {
    fields.status = p.status;
    fields.completedAt =
      p.status === "COMPLETED"
        ? current.completedAt
          ? new Date(current.completedAt)
          : new Date()
        : null;
  }
  return dto(
    await taskRepository.save(assignedScope, fields, p.revision, ctx.memberId),
  );
}
export async function deleteTask(
  ctx: TenantContext,
  id: string,
  revision: unknown,
) {
  requireTaskManager(ctx);
  idCheck(id);
  if (
    typeof revision !== "number" ||
    !Number.isInteger(revision) ||
    revision < 0
  )
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "The current task revision is required.",
    );
  await taskRepository.remove(
    { ...taskScope(ctx), _id: id },
    revision,
    ctx.memberId,
  );
}
export async function listTaskComments(
  ctx: TenantContext,
  id: string,
  page = 1,
) {
  idCheck(id);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new AccessError(400, "VALIDATION_ERROR", "Invalid comment page.");
  return taskRepository.comments({ ...taskScope(ctx), _id: id }, page);
}
export async function addTaskComment(
  ctx: TenantContext,
  id: string,
  input: unknown,
) {
  // Assigned access currently permits status/checklist updates only. Planners post comments.
  requireTaskManager(ctx);
  idCheck(id);
  const p = parse(commentInputSchema, input);
  await taskRepository.addComment(
    { ...taskScope(ctx), _id: id },
    ctx.memberId,
    p.body,
  );
}
export async function taskActivity(ctx: TenantContext, id: string, page = 1) {
  await getTask(ctx, id);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new AccessError(400, "VALIDATION_ERROR", "Invalid activity page.");
  const entries = await resourceActivity(ctx.tenantId, "TASK", id, page);
  return {
    entries: entries.slice(0, 25).map((e) => ({
      id: String(e._id),
      summary: String(e.summary),
      actorName: e.actorName,
      createdAt: new Date(e.createdAt).toISOString(),
    })),
    hasMore: entries.length > 25,
    page,
  };
}

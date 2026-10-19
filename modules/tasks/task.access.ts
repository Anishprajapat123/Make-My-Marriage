import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
export const TASK_READ_PERMISSIONS = [
  "VIEW_TASKS",
  "MANAGE_TASKS",
  "VIEW_ASSIGNED_TASKS",
  "UPDATE_ASSIGNED_TASKS",
] as const;
export function canManageTasks(ctx: TenantContext) {
  return ctx.permissions.includes("MANAGE_TASKS");
}
export function taskScope(ctx: TenantContext) {
  if (!TASK_READ_PERMISSIONS.some((p) => ctx.permissions.includes(p)))
    throw new AccessError(403, "FORBIDDEN", "You do not have access to tasks.");
  return {
    tenantId: ctx.tenantId,
    ...(ctx.permissions.includes("VIEW_TASKS") || canManageTasks(ctx)
      ? {}
      : { assigneeMemberIds: ctx.memberId }),
  };
}
export function requireTaskManager(ctx: TenantContext) {
  if (!canManageTasks(ctx))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Only task planners can change these details.",
    );
}

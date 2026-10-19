import "server-only";
import type { TenantContext } from "@/lib/tenant/context";
export function taskPageProps(ctx: TenantContext) {
  return {
    timezone: ctx.timezone,
    weddingTitle: ctx.weddingTitle,
    memberName: ctx.memberName,
    roleLabel: ctx.roleKeys.join(", "),
    memberId: ctx.memberId,
    canManage: ctx.permissions.includes("MANAGE_TASKS"),
    canUpdateAssigned: ctx.permissions.includes("UPDATE_ASSIGNED_TASKS"),
  };
}

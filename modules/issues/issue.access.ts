import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
export const ISSUE_READ_PERMISSIONS = ["VIEW_ISSUES", "REPORT_ISSUES"] as const;
export const broadIssues = (ctx: TenantContext) =>
  ctx.permissions.includes("VIEW_ISSUES") && !ctx.roleKeys.includes("VENDOR");
export const manageIssues = (ctx: TenantContext) =>
  broadIssues(ctx) && ctx.permissions.includes("MANAGE_ISSUES");
export const commentIssues = (ctx: TenantContext) =>
  ctx.permissions.includes("REPORT_ISSUES") || manageIssues(ctx);
export function issueScope(ctx: TenantContext) {
  if (!broadIssues(ctx) && !ctx.permissions.includes("REPORT_ISSUES"))
    throw new AccessError(403, "FORBIDDEN", "Issue access is restricted.");
  return {
    tenantId: ctx.tenantId,
    ...(broadIssues(ctx) ? {} : { reportedByMemberId: ctx.memberId }),
  };
}
export function requireIssueManager(ctx: TenantContext) {
  if (!manageIssues(ctx))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Issue management permission is required.",
    );
}

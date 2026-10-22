import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import {
  notificationId,
  notificationQuery,
  notificationRead,
} from "./notification.schema";
import * as repo from "./notification.repository";
function permit(ctx: TenantContext) {
  if (!ctx.permissions.includes("VIEW_WEDDING"))
    throw new AccessError(403, "FORBIDDEN", "Workspace access is required.");
}
export function list(ctx: TenantContext, input: unknown) {
  permit(ctx);
  const q = notificationQuery.safeParse(input);
  if (!q.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Invalid notification filters or cursor.",
    );
  return repo.listNotifications(ctx, q.data);
}
export function markRead(ctx: TenantContext, id: string, input: unknown) {
  permit(ctx);
  if (!notificationId.safeParse(id).success)
    throw new AccessError(404, "NOT_FOUND", "Notification not found.");
  if (!notificationRead.safeParse(input).success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Send an empty JSON object.",
    );
  return repo.markNotificationRead(ctx, id);
}

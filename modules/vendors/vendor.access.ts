import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
export function permitVendors(ctx: TenantContext, manage = false) {
  if (
    ctx.roleKeys.includes("VENDOR") ||
    !ctx.permissions.includes("VIEW_VENDORS") ||
    (manage && !ctx.permissions.includes("MANAGE_VENDORS"))
  )
    throw new AccessError(
      403,
      "FORBIDDEN",
      "You do not have access to this vendor action.",
    );
}

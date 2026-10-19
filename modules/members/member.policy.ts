import "server-only";
import { AccessError } from "@/lib/tenant/context";
export type AccessRole = {
  key: string;
  isSystemRole: boolean;
  permissionKeys: string[];
};
export function isOwner(roles: AccessRole[]) {
  return roles.some((r) => r.key === "OWNER" && r.isSystemRole);
}
export function mayGrant(actor: AccessRole[], offered: AccessRole[]) {
  if (!actor.some((r) => r.permissionKeys.includes("MANAGE_MEMBERS")))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Member management permission is required.",
    );
  if (isOwner(offered))
    throw new AccessError(
      403,
      "PROTECTED_OWNER",
      "Ownership changes are not available in this flow.",
    );
  const permissions = new Set(actor.flatMap((r) => r.permissionKeys));
  if (
    !isOwner(actor) &&
    offered.some((r) => r.permissionKeys.some((p) => !permissions.has(p)))
  )
    throw new AccessError(
      403,
      "FORBIDDEN",
      "You cannot assign or manage access beyond your own permissions.",
    );
}

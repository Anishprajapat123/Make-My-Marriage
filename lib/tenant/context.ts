import "server-only";
import { auth } from "@/auth";
import { getCurrentWeddingForUser } from "@/modules/wedding/wedding.service";
export class AccessError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type TenantContext = {
  tenantId: string;
  memberId: string;
  timezone: string;
  permissions: string[];
  weddingTitle: string;
  memberName: string;
  roleKeys: string[];
};
export async function requireTenant(
  permission: string,
): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user?.id)
    throw new AccessError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const current = await getCurrentWeddingForUser(session.user.id);
  if (!current.wedding || current.membership?.membershipStatus !== "ACTIVE")
    throw new AccessError(
      403,
      "NO_WORKSPACE",
      "An active wedding membership is required.",
    );
  if (!current.effectivePermissions.includes(permission))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  return {
    tenantId: current.membership.tenantId.toString(),
    memberId: current.membership._id.toString(),
    timezone: current.wedding.timezone,
    permissions: current.effectivePermissions,
    weddingTitle: current.wedding.title,
    memberName: session.user.name ?? "Member",
    roleKeys: current.roles.map((r) => r.key),
  };
}

import "server-only";
import { auth } from "@/auth";
import {
  AccessError,
  requireTenant,
  type TenantContext,
} from "@/lib/tenant/context";
import { errorResponse, successResponse } from "@/lib/http/responses";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/modules/auth/user.model";
export async function memberResponse(
  operation: () => Promise<unknown>,
  status = 200,
) {
  try {
    const response = successResponse(await operation(), status);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    if (e instanceof AccessError)
      return errorResponse(e.code, e.message, e.status);
    if (e instanceof SyntaxError)
      return errorResponse("VALIDATION_ERROR", "Invalid JSON body.", 400);
    console.error("MEMBER_REQUEST_FAILED");
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Members are temporarily unavailable. Please try again.",
      503,
    );
  }
}
export function memberRequest(
  operation: (ctx: TenantContext) => Promise<unknown>,
  status = 200,
) {
  return memberResponse(
    async () => operation(await requireTenant("MANAGE_MEMBERS")),
    status,
  );
}
export async function verifiedInvitee() {
  const session = await auth();
  if (!session?.user?.id)
    throw new AccessError(401, "UNAUTHENTICATED", "Sign in to continue.");
  await connectToDatabase();
  const user = await UserModel.findOne({
    _id: session.user.id,
    status: "ACTIVE",
    emailVerifiedAt: { $ne: null },
  })
    .select("email")
    .lean();
  if (!user)
    throw new AccessError(
      403,
      "FORBIDDEN",
      "A verified active account is required.",
    );
  return { id: session.user.id, email: String(user.email) };
}

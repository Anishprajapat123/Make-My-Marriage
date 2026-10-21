import "server-only";
import {
  requireTenant,
  AccessError,
  type TenantContext,
} from "@/lib/tenant/context";
import { connectToDatabase } from "@/lib/db/mongoose";
import { limitInvitation } from "@/lib/http/public-invitation-limit";
import { validGuestToken } from "./invitation.schema";
import { RsvpDuplicateError } from "@/modules/rsvp/rsvp.repository";
import { successResponse, errorResponse } from "@/lib/http/responses";
async function respond(operation: () => Promise<unknown>) {
  let r: Response;
  try {
    r = successResponse(await operation());
  } catch (e) {
    if (e instanceof RsvpDuplicateError)
      r = errorResponse(e.code, e.message, e.status, e.details);
    else if (e instanceof AccessError)
      r = errorResponse(e.code, e.message, e.status);
    else if (e instanceof SyntaxError)
      r = errorResponse("VALIDATION_ERROR", "Invalid JSON body.", 400);
    else {
      console.error("INVITATION_REQUEST_FAILED");
      r = errorResponse(
        "SERVICE_UNAVAILABLE",
        "Invitations are temporarily unavailable. Please try again.",
        503,
      );
    }
  }
  r.headers.set("Cache-Control", "no-store");
  r.headers.set("Referrer-Policy", "no-referrer");
  if (r.status === 429) r.headers.set("Retry-After", "60");
  return r;
}
export function invitationRequest(
  permission: string | readonly string[],
  operation: (ctx: TenantContext) => Promise<unknown>,
) {
  return respond(async () => operation(await requireTenant(permission)));
}
export function publicInvitationRequest(
  token: string,
  write: boolean,
  operation: () => Promise<unknown>,
) {
  return respond(async () => {
    if (!validGuestToken(token))
      throw new AccessError(
        410,
        "INVITATION_UNAVAILABLE",
        "This invitation is unavailable. Please contact the host for a new link.",
      );
    await connectToDatabase();
    await limitInvitation(token, write);
    return operation();
  });
}

import "server-only";
import {
  AccessError,
  requireTenant,
  type TenantContext,
} from "@/lib/tenant/context";
import { errorResponse, successResponse } from "@/lib/http/responses";
import { GuestDuplicateError } from "./guest.repository";
export async function guestRequest(
  operation: (ctx: TenantContext) => Promise<unknown>,
  write = false,
  status = 200,
) {
  let response: Response;
  try {
    response = successResponse(
      await operation(
        await requireTenant(
          write ? "MANAGE_GUESTS" : ["VIEW_GUESTS", "MANAGE_GUESTS"],
        ),
      ),
      status,
    );
  } catch (error) {
    if (error instanceof GuestDuplicateError)
      response = errorResponse(
        error.code,
        error.message,
        error.status,
        error.details,
      );
    else if (error instanceof AccessError)
      response = errorResponse(error.code, error.message, error.status);
    else if (error instanceof SyntaxError)
      response = errorResponse("VALIDATION_ERROR", "Invalid JSON body.", 400);
    else {
      console.error("GUEST_REQUEST_FAILED");
      response = errorResponse(
        "SERVICE_UNAVAILABLE",
        "Guests are temporarily unavailable. Please try again.",
        503,
      );
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

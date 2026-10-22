import "server-only";
import {
  requireTenant,
  AccessError,
  type TenantContext,
} from "@/lib/tenant/context";
import { successResponse, errorResponse } from "@/lib/http/responses";
export { readJsonBody } from "@/lib/http/json-body";
export async function notificationRequest(
  operation: (ctx: TenantContext) => Promise<unknown>,
) {
  let response: Response;
  try {
    response = successResponse(
      await operation(await requireTenant("VIEW_WEDDING")),
    );
  } catch (error) {
    if (error instanceof AccessError)
      response = errorResponse(error.code, error.message, error.status);
    else if (error instanceof SyntaxError)
      response = errorResponse("VALIDATION_ERROR", "Invalid JSON body.", 400);
    else {
      console.error("NOTIFICATION_REQUEST_FAILED");
      response = errorResponse(
        "SERVICE_UNAVAILABLE",
        "Notifications are temporarily unavailable. Please retry.",
        503,
      );
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

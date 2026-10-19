import "server-only";
import {
  requireTenant,
  AccessError,
  type TenantContext,
} from "@/lib/tenant/context";
import { errorResponse, successResponse } from "@/lib/http/responses";
export { readJsonBody as readEventBody } from "@/lib/http/json-body";
export async function eventRequest(
  permission: string,
  operation: (ctx: TenantContext) => Promise<unknown>,
  status = 200,
) {
  try {
    return successResponse(
      await operation(await requireTenant(permission)),
      status,
    );
  } catch (e) {
    if (e instanceof AccessError)
      return errorResponse(e.code, e.message, e.status);
    if (e instanceof SyntaxError)
      return errorResponse("VALIDATION_ERROR", "Invalid JSON body.", 400);
    console.error("EVENT_REQUEST_FAILED");
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Events are temporarily unavailable. Please try again.",
      503,
    );
  }
}

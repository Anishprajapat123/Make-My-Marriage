import "server-only";
import {
  requireTenant,
  AccessError,
  type TenantContext,
} from "@/lib/tenant/context";
import { errorResponse, successResponse } from "@/lib/http/responses";
export async function readEventBody(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new AccessError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send an application/json request body.",
    );
  }
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_BASE_URL ?? request.url).origin;
  if (origin && origin !== expected)
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Requests must come from this application.",
    );
  return request.json();
}
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

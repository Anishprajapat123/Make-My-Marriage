import "server-only";
import {
  requireTenant,
  AccessError,
  type TenantContext,
} from "@/lib/tenant/context";
import { successResponse, errorResponse } from "./responses";
export { readJsonBody } from "./json-body";
export async function workspaceRequest(
  operation: (ctx: TenantContext) => Promise<unknown>,
  permission: string | readonly string[] = "VIEW_WEDDING",
  status = 200,
) {
  let response: Response;
  try {
    response = successResponse(
      await operation(await requireTenant(permission)),
      status,
    );
  } catch (error) {
    if (error instanceof AccessError)
      response = errorResponse(error.code, error.message, error.status);
    else if (error instanceof SyntaxError)
      response = errorResponse(
        "VALIDATION_ERROR",
        "Invalid request body.",
        400,
      );
    else {
      console.error("WORKSPACE_REQUEST_FAILED");
      response = errorResponse(
        "SERVICE_UNAVAILABLE",
        "This service is temporarily unavailable. Please retry.",
        503,
      );
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

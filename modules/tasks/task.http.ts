import "server-only";
import {
  requireTenant,
  AccessError,
  type TenantContext,
} from "@/lib/tenant/context";
import { errorResponse, successResponse } from "@/lib/http/responses";
import { TASK_READ_PERMISSIONS } from "./task.access";
export async function taskRequest(
  operation: (ctx: TenantContext) => Promise<unknown>,
  status = 200,
) {
  try {
    return successResponse(
      await operation(await requireTenant(TASK_READ_PERMISSIONS)),
      status,
    );
  } catch (e) {
    if (e instanceof AccessError)
      return errorResponse(e.code, e.message, e.status);
    if (e instanceof SyntaxError)
      return errorResponse("VALIDATION_ERROR", "Invalid JSON body.", 400);
    console.error("TASK_REQUEST_FAILED");
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Tasks are temporarily unavailable. Please try again.",
      503,
    );
  }
}

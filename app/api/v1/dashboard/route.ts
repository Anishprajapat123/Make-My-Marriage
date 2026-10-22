import { requireTenant, AccessError } from "@/lib/tenant/context";
import { getDashboard } from "@/modules/dashboard/dashboard.service";
import { successResponse, errorResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
export async function GET() {
  let response: Response;
  try {
    response = successResponse(
      await getDashboard(await requireTenant("VIEW_WEDDING")),
    );
  } catch (error) {
    if (error instanceof AccessError)
      response = errorResponse(error.code, error.message, error.status);
    else {
      console.error("DASHBOARD_REQUEST_FAILED");
      response = errorResponse(
        "SERVICE_UNAVAILABLE",
        "Dashboard data is temporarily unavailable. Please try again.",
        503,
      );
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

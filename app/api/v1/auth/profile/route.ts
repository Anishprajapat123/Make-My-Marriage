import { readProfile, updateProfile } from "@/modules/auth/profile.service";
import { readJsonBody } from "@/lib/http/json-body";
import { AccessError } from "@/lib/tenant/context";
import { successResponse, errorResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
async function response(operation: () => Promise<unknown>) {
  let r;
  try {
    r = successResponse(await operation());
  } catch (e) {
    r =
      e instanceof AccessError
        ? errorResponse(e.code, e.message, e.status)
        : errorResponse(
            "UNAVAILABLE",
            "Profile is temporarily unavailable.",
            503,
          );
  }
  r.headers.set("Cache-Control", "no-store");
  return r;
}
export function GET() {
  return response(readProfile);
}
export function PATCH(request: Request) {
  return response(async () => updateProfile(await readJsonBody(request)));
}

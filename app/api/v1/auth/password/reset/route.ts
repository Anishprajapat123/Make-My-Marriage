import { errorResponse, successResponse } from "@/lib/http/responses";
import { resetLocalPassword } from "@/modules/auth/auth.service";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  try {
    if (!(await resetLocalPassword(input))) {
      return errorResponse(
        "INVALID_OR_EXPIRED_TOKEN",
        "This password reset link is invalid, expired, or has already been used.",
        400,
      );
    }

    return successResponse({ message: "Your password has been updated." });
  } catch {
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Password reset is temporarily unavailable. Please try again later.",
      503,
    );
  }
}

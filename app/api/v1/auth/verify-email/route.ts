import { errorResponse, successResponse } from "@/lib/http/responses";
import { verifyEmail } from "@/modules/auth/auth.service";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  try {
    if (!(await verifyEmail(input))) {
      return errorResponse(
        "INVALID_OR_EXPIRED_TOKEN",
        "This verification link is invalid, expired, or has already been used.",
        400,
      );
    }

    return successResponse({ message: "Email verified. You can now sign in." });
  } catch {
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Email verification is temporarily unavailable. Please try again later.",
      503,
    );
  }
}

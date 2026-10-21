import { errorResponse, successResponse } from "@/lib/http/responses";
import { requestPasswordReset } from "@/modules/auth/auth.service";
import { emailConfigured } from "@/lib/email/config";

export async function POST(request: Request) {
  if (!emailConfigured()) {
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Password reset emails are temporarily unavailable. Google accounts should use Continue with Google.",
      503,
    );
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  try {
    const result = await requestPasswordReset(input);
    if (result.invalid) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Enter a valid email address.",
        400,
      );
    }

    return successResponse(
      {
        message:
          "If an eligible account exists, password reset instructions will be sent shortly.",
      },
      202,
    );
  } catch {
    console.error("AUTH_PASSWORD_RESET_REQUEST_FAILED");
    return successResponse(
      {
        message:
          "If an eligible account exists, password reset instructions will be sent shortly.",
      },
      202,
    );
  }
}

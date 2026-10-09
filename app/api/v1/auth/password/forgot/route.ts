import { errorResponse, successResponse } from "@/lib/http/responses";
import { requestPasswordReset } from "@/modules/auth/auth.service";

export async function POST(request: Request) {
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

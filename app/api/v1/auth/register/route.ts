import { errorResponse, successResponse } from "@/lib/http/responses";
import { registerLocalAccount } from "@/modules/auth/auth.service";
import { emailConfigured } from "@/lib/email/config";

export async function POST(request: Request) {
  if (!emailConfigured()) {
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Email signup is temporarily unavailable. Use Google sign-in when available.",
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
    const result = await registerLocalAccount(input);
    if (result.invalid) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Check the name, email, and password and try again.",
        400,
      );
    }

    return successResponse(
      {
        message:
          "If this email can be registered, verification instructions will be sent shortly.",
      },
      202,
    );
  } catch {
    console.error("AUTH_REGISTER_REQUEST_FAILED");
    return successResponse(
      {
        message:
          "If this email can be registered, verification instructions will be sent shortly.",
      },
      202,
    );
  }
}

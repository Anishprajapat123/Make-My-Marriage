import { auth } from "@/auth";
import { errorResponse, successResponse } from "@/lib/http/responses";
import {
  createWeddingForUser,
  parseCreateWeddingInput,
  WeddingSetupError,
} from "@/modules/wedding/wedding.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHENTICATED", "Sign-in is required.", 401);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  const parsed = parseCreateWeddingInput(input);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Check the wedding details and try again.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const wedding = await createWeddingForUser(
      session.user.id,
      parsed.data.wedding,
    );
    return successResponse({ wedding }, 201);
  } catch (error) {
    if (error instanceof WeddingSetupError) {
      return errorResponse(
        error.code,
        "This account already belongs to a wedding workspace.",
        409,
      );
    }

    console.error("WEDDING_ONBOARDING_FAILED");
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Wedding setup is temporarily unavailable. Please try again.",
      503,
    );
  }
}

import { auth } from "@/auth";
import { errorResponse, successResponse } from "@/lib/http/responses";
import { getCurrentWeddingForUser } from "@/modules/wedding/wedding.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHENTICATED", "Sign-in is required.", 401);
  }

  const current = await getCurrentWeddingForUser(session.user.id);

  return successResponse({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    wedding:
      current.membership?.membershipStatus === "ACTIVE" && current.wedding
        ? {
            id: current.wedding._id.toString(),
            title: current.wedding.title,
            slug: current.wedding.slug,
            roles: current.roles.map((role) => role.key),
            permissions: current.effectivePermissions,
          }
        : null,
  });
}

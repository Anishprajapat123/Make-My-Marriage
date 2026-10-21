import { invitationRequest } from "@/modules/invitations/invitation.http";
import { listInvitationStatus } from "@/modules/invitations/invitation.service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return invitationRequest("MANAGE_INVITATIONS", (ctx) =>
    listInvitationStatus(
      ctx,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}

import { invitationRequest } from "@/modules/invitations/invitation.http";
import { listInvitationStatus } from "@/modules/invitations/invitation.service";
export const runtime = "nodejs";
export async function GET() {
  return invitationRequest("VIEW_RSVP", async (ctx) => ({
    counts: (await listInvitationStatus(ctx, { limit: 1 })).counts,
  }));
}

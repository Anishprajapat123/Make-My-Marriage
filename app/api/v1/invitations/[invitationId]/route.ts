import { invitationRequest } from "@/modules/invitations/invitation.http";
import {
  getInvitationConfig,
  configureInvitation,
} from "@/modules/invitations/invitation.service";
import { readJsonBody } from "@/lib/http/json-body";
import { AccessError } from "@/lib/tenant/context";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  return invitationRequest("MANAGE_INVITATIONS", async (ctx) => {
    const config = await getInvitationConfig(ctx);
    if (!config || config.id !== (await params).invitationId)
      throw new AccessError(404, "NOT_FOUND", "Invitation not found.");
    return configureInvitation(ctx, await readJsonBody(request));
  });
}

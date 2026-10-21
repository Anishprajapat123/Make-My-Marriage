import { invitationRequest } from "@/modules/invitations/invitation.http";
import {
  getInvitationConfig,
  configureInvitation,
} from "@/modules/invitations/invitation.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function GET() {
  return invitationRequest("MANAGE_INVITATIONS", async (ctx) => ({
    config: await getInvitationConfig(ctx),
  }));
}
export async function POST(request: Request) {
  return invitationRequest("MANAGE_INVITATIONS", async (ctx) =>
    configureInvitation(ctx, await readJsonBody(request)),
  );
}

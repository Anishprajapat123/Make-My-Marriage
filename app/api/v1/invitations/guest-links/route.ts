import { invitationRequest } from "@/modules/invitations/invitation.http";
import { generateGuestLink } from "@/modules/invitations/invitation.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return invitationRequest("MANAGE_INVITATIONS", async (ctx) =>
    generateGuestLink(ctx, await readJsonBody(request)),
  );
}

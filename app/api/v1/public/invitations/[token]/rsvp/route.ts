import { publicInvitationRequest } from "@/modules/invitations/invitation.http";
import { publicInvitation } from "@/modules/invitations/invitation.repository";
import { savePublicRsvp } from "@/modules/invitations/invitation.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  return publicInvitationRequest(token, false, () => publicInvitation(token));
}
export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  return publicInvitationRequest(token, true, async () =>
    savePublicRsvp(token, await readJsonBody(request)),
  );
}
export const PATCH = POST;

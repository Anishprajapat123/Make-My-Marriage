import { publicInvitationRequest } from "@/modules/invitations/invitation.http";
import { publicInvitation } from "@/modules/invitations/invitation.repository";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return publicInvitationRequest(token, false, () => publicInvitation(token));
}

import { memberResponse, verifiedInvitee } from "@/modules/members/member.http";
import { memberRepository } from "@/modules/members/member.repository";
import { validMemberToken } from "@/lib/auth/member-invitation";
import { AccessError } from "@/lib/tenant/context";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  return memberResponse(async () => {
    await readJsonBody(request);
    const user = await verifiedInvitee();
    const { invitationId: token } = await params;
    if (!validMemberToken(token))
      throw new AccessError(404, "INVALID_INVITATION", "Invitation not found.");
    await memberRepository.accept(token, user.id, user.email);
    return { accepted: true };
  });
}

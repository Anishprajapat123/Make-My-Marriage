import { cookies } from "next/headers";
import { memberResponse, verifiedInvitee } from "@/modules/members/member.http";
import { memberRepository } from "@/modules/members/member.repository";
import {
  MEMBER_INVITATION_COOKIE,
  validMemberToken,
  memberCookieOptions,
} from "@/lib/auth/member-invitation";
import { AccessError } from "@/lib/tenant/context";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
async function clearInvitation() {
  (await cookies()).set(MEMBER_INVITATION_COOKIE, "", {
    ...memberCookieOptions,
    maxAge: 0,
  });
}
async function token() {
  const value = (await cookies()).get(MEMBER_INVITATION_COOKIE)?.value ?? "";
  if (!validMemberToken(value))
    throw new AccessError(
      404,
      "INVALID_INVITATION",
      "Open the invitation link you received to continue.",
    );
  return value;
}
export async function GET() {
  return memberResponse(async () => {
    const user = await verifiedInvitee();
    try {
      return await memberRepository.preview(await token(), user.id, user.email);
    } catch (error) {
      if (error instanceof AccessError && [404, 410].includes(error.status))
        await clearInvitation();
      throw error;
    }
  });
}
export async function POST(request: Request) {
  return memberResponse(async () => {
    await readJsonBody(request);
    const user = await verifiedInvitee();
    await memberRepository.accept(await token(), user.id, user.email);
    await clearInvitation();
    return { accepted: true };
  });
}
export async function DELETE(request: Request) {
  return memberResponse(async () => {
    await readJsonBody(request);
    await clearInvitation();
    return { dismissed: true };
  });
}

import { memberRequest } from "@/modules/members/member.http";
import { changeInvitation } from "@/modules/members/member.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  return memberRequest(async (ctx) =>
    changeInvitation(
      ctx,
      (await params).invitationId,
      await readJsonBody(request),
    ),
  );
}

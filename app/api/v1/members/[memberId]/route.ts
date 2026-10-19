import { memberRequest } from "@/modules/members/member.http";
import { updateMember, getMember } from "@/modules/members/member.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
type Context = { params: Promise<{ memberId: string }> };
export async function GET(_request: Request, { params }: Context) {
  return memberRequest(async (ctx) => ({
    member: await getMember(ctx, (await params).memberId),
  }));
}
export async function PATCH(request: Request, { params }: Context) {
  return memberRequest(async (ctx) =>
    updateMember(ctx, (await params).memberId, await readJsonBody(request)),
  );
}
export async function DELETE(request: Request, { params }: Context) {
  return memberRequest(async (ctx) => {
    const body = await readJsonBody(request);
    return updateMember(ctx, (await params).memberId, {
      updatedAt: body?.updatedAt,
      status: "REMOVED",
    });
  });
}

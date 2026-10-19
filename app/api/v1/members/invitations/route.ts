import { memberRequest } from "@/modules/members/member.http";
import {
  inviteMember,
  listInvitations,
} from "@/modules/members/member.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return memberRequest((ctx) =>
    listInvitations(
      ctx,
      Number(new URL(request.url).searchParams.get("page") ?? 1),
    ),
  );
}
export async function POST(request: Request) {
  return memberRequest(
    async (ctx) => inviteMember(ctx, await readJsonBody(request)),
    201,
  );
}

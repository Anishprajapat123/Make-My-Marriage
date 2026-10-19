import { memberRequest } from "@/modules/members/member.http";
import { listMembers } from "@/modules/members/member.service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return memberRequest((ctx) =>
    listMembers(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}

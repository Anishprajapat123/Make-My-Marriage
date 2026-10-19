import { memberRequest } from "@/modules/members/member.http";
import { memberRoles } from "@/modules/members/member.service";
export const runtime = "nodejs";
export async function GET() {
  return memberRequest(async (ctx) => ({ roles: await memberRoles(ctx) }));
}

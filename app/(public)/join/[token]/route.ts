import { NextResponse } from "next/server";
import {
  MEMBER_INVITATION_COOKIE,
  memberCookieOptions,
  validMemberToken,
} from "@/lib/auth/member-invitation";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const response = NextResponse.redirect(
    new URL("/join", process.env.APP_BASE_URL ?? request.url),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(
    MEMBER_INVITATION_COOKIE,
    validMemberToken(token) ? token : "",
    {
      ...memberCookieOptions,
      ...(!validMemberToken(token) ? { maxAge: 0 } : {}),
    },
  );
  return response;
}

import "server-only";
export const MEMBER_INVITATION_COOKIE = "mmm-member-invitation";
export const validMemberToken = (token: string) =>
  /^[A-Za-z0-9_-]{43}$/.test(token);
export const memberCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 86400,
};

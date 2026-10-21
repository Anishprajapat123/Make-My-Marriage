import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";
import { cookies } from "next/headers";
import { emailConfigured } from "@/lib/email/config";
import {
  MEMBER_INVITATION_COOKIE,
  validMemberToken,
} from "@/lib/auth/member-invitation";

export const metadata: Metadata = {
  title: "Create account | Make My Marriage",
};

export default async function RegisterPage() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const invitation =
    (await cookies()).get(MEMBER_INVITATION_COOKIE)?.value ?? "";
  return (
    <AuthScreen
      returnTo={validMemberToken(invitation) ? "/join" : "/dashboard"}
      googleEnabled={googleEnabled}
      emailEnabled={emailConfigured()}
      variant="register"
    />
  );
}

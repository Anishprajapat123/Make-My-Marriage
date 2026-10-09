import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export const metadata: Metadata = {
  title: "Sign in | Make My Marriage",
};

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  return <AuthScreen googleEnabled={googleEnabled} variant="login" />;
}

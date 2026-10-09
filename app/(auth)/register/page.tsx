import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export const metadata: Metadata = {
  title: "Create account | Make My Marriage",
};

export default function RegisterPage() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  return <AuthScreen googleEnabled={googleEnabled} variant="register" />;
}

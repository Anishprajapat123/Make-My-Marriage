import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";
import { emailConfigured } from "@/lib/email/config";

export const metadata: Metadata = {
  title: "Password recovery | Make My Marriage",
};

export default function ForgotPasswordPage() {
  return (
    <AuthScreen variant="forgot-password" emailEnabled={emailConfigured()} />
  );
}

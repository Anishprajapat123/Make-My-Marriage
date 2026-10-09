import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export const metadata: Metadata = {
  title: "Password recovery | Make My Marriage",
};

export default function ForgotPasswordPage() {
  return <AuthScreen variant="forgot-password" />;
}

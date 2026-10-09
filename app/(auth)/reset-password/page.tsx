import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export const metadata: Metadata = {
  title: "Reset password | Make My Marriage",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthScreen
      token={Array.isArray(token) ? (token[0] ?? "") : (token ?? "")}
      variant="reset-password"
    />
  );
}

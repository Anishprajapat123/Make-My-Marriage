import type { Metadata } from "next";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export const metadata: Metadata = {
  title: "Verify email | Make My Marriage",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthScreen
      token={Array.isArray(token) ? (token[0] ?? "") : (token ?? "")}
      variant="verify-email"
    />
  );
}

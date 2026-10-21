import { PublicInvitationScreen } from "@/modules/invitations/components/public-invitation-screen";
export const metadata = {
  title: "Your wedding invitation | Make My Marriage",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function GuestInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicInvitationScreen key={token} token={token} />;
}

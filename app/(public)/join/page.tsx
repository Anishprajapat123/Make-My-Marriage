import { auth } from "@/auth";
import { JoinScreen } from "@/modules/members/components/join-screen";
export const metadata = {
  title: "Join wedding workspace | Make My Marriage",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};
export default async function JoinPage() {
  const session = await auth();
  return <JoinScreen signedIn={Boolean(session?.user?.id)} />;
}

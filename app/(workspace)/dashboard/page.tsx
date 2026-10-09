import { DashboardScreen } from "@/modules/dashboard/components/dashboard-screen";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getCurrentWeddingForUser } from "@/modules/wedding/wedding.service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const current = await getCurrentWeddingForUser(session.user.id);
  if (current.membership?.membershipStatus !== "ACTIVE") {
    redirect("/onboarding");
  }
  if (
    !current.wedding ||
    !current.effectivePermissions.includes("VIEW_WEDDING")
  ) {
    notFound();
  }

  const { q } = await searchParams;
  const searchQuery = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");

  return (
    <DashboardScreen
      memberName={session.user.name ?? "there"}
      searchQuery={searchQuery}
      wedding={current.wedding}
    />
  );
}

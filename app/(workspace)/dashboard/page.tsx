import { DashboardScreen } from "@/modules/dashboard/components/dashboard-screen";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getCurrentWeddingForUser } from "@/modules/wedding/wedding.service";
import { getDashboard } from "@/modules/dashboard/dashboard.service";

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

  let data: Awaited<ReturnType<typeof getDashboard>> | null = null;
  try {
    data = await getDashboard({
      tenantId: String(current.membership.tenantId),
      memberId: String(current.membership._id),
      timezone: current.wedding.timezone,
      permissions: current.effectivePermissions,
      weddingTitle: current.wedding.title,
      memberName: session.user.name ?? "Member",
      roleKeys: current.roles.map((r) => r.key),
    });
  } catch {
    console.error("DASHBOARD_LOAD_FAILED");
  }

  return (
    <DashboardScreen
      memberName={session.user.name ?? "there"}
      searchQuery={searchQuery}
      wedding={current.wedding}
      data={data}
      roleLabel={current.roles.map((r) => r.key).join(", ")}
    />
  );
}

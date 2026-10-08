import { DashboardScreen } from "@/modules/dashboard/components/dashboard-screen";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const searchQuery = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");

  return <DashboardScreen searchQuery={searchQuery} />;
}

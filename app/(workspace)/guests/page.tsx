import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { GuestsScreen } from "@/modules/guests/components/guests-screen";
export default async function GuestsPage() {
  let ctx;
  try {
    ctx = await requireTenant(["VIEW_GUESTS", "MANAGE_GUESTS"]);
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <GuestsScreen
      canView={Boolean(ctx)}
      canManage={ctx?.permissions.includes("MANAGE_GUESTS") ?? false}
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
    />
  );
}

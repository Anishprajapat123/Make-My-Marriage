import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { NotificationsScreen } from "@/modules/notifications/components/notifications-screen";
export default async function NotificationsPage() {
  let ctx;
  try {
    ctx = await requireTenant("VIEW_WEDDING");
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <NotificationsScreen
      canView={Boolean(ctx)}
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
      timezone={ctx?.timezone ?? "Asia/Kolkata"}
    />
  );
}

import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { permitVendors } from "@/modules/vendors/vendor.access";
import { VendorsScreen } from "@/modules/vendors/components/vendors-screen";
export default async function VendorsPage() {
  let ctx;
  try {
    const current = await requireTenant("VIEW_VENDORS");
    permitVendors(current);
    ctx = current;
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <VendorsScreen
      canView={Boolean(ctx)}
      canManage={ctx?.permissions.includes("MANAGE_VENDORS") ?? false}
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
    />
  );
}

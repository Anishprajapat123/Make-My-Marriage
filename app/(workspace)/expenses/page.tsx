import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { ExpensesScreen } from "@/modules/expenses/components/expenses-screen";
export default async function ExpensesPage() {
  let ctx;
  try {
    ctx = await requireTenant("VIEW_EXPENSES");
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <ExpensesScreen
      canView={Boolean(ctx)}
      canManage={ctx?.permissions.includes("MANAGE_EXPENSES") ?? false}
      canPay={ctx?.permissions.includes("MANAGE_PAYMENTS") ?? false}
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
      timezone={ctx?.timezone ?? "Asia/Kolkata"}
    />
  );
}

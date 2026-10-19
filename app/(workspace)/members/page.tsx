import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { MembersScreen } from "@/modules/members/components/members-screen";
async function context() {
  try {
    return await requireTenant("MANAGE_MEMBERS");
  } catch (e) {
    if (e instanceof AccessError) {
      if (e.status === 401) redirect("/login");
      if (e.code === "NO_WORKSPACE") redirect("/onboarding");
      return null;
    }
    throw e;
  }
}
export default async function MembersPage() {
  const ctx = await context();
  return (
    <MembersScreen
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
      timezone={ctx?.timezone ?? "UTC"}
      canManage={Boolean(ctx)}
    />
  );
}

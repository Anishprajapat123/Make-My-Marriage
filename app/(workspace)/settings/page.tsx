import { redirect } from "next/navigation";
import { AccessError, requireTenant } from "@/lib/tenant/context";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { SettingsScreen } from "@/modules/wedding/components/settings-screen";
export default async function SettingsPage() {
  let ctx;
  try {
    ctx = await requireTenant("VIEW_WEDDING");
  } catch (e) {
    if (!(e instanceof AccessError)) throw e;
    if (e.status === 401) redirect("/login");
    if (e.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <WorkspaceShell
      activePage="Settings"
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
    >
      {ctx ? (
        <>
          <SettingsScreen
            canManage={ctx.permissions.includes("MANAGE_WEDDING")}
          />
        </>
      ) : (
        <p>Settings access is restricted.</p>
      )}
    </WorkspaceShell>
  );
}

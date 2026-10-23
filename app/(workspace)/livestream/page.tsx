import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { LivestreamScreen } from "@/modules/livestream/components/livestream-screen";
export default async function LivestreamPage() {
  let ctx;
  try {
    ctx = await requireTenant("VIEW_LIVESTREAM");
  } catch (e) {
    if (!(e instanceof AccessError)) throw e;
    if (e.status === 401) redirect("/login");
    if (e.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <WorkspaceShell
      activePage="Livestream"
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
    >
      {ctx ? (
        <LivestreamScreen
          canManage={ctx.permissions.includes("MANAGE_LIVESTREAM")}
        />
      ) : (
        <p>Livestream access is restricted.</p>
      )}
    </WorkspaceShell>
  );
}

import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { InvitationsScreen } from "@/modules/invitations/components/invitations-screen";
export default async function InvitationsPage() {
  let ctx;
  try {
    ctx = await requireTenant(["MANAGE_INVITATIONS", "VIEW_RSVP"]);
  } catch (e) {
    if (!(e instanceof AccessError)) throw e;
    if (e.status === 401) redirect("/login");
    if (e.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <InvitationsScreen
      canView={Boolean(ctx)}
      canManage={ctx?.permissions.includes("MANAGE_INVITATIONS") ?? false}
      canRsvp={ctx?.permissions.includes("VIEW_RSVP") ?? false}
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
    />
  );
}

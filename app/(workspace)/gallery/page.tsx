import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { GalleryScreen } from "@/modules/gallery/components/gallery-screen";
export default async function GalleryPage() {
  let ctx;
  try {
    ctx = await requireTenant("VIEW_GALLERY");
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <WorkspaceShell
      activePage="Gallery"
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
    >
      {ctx ? (
        <GalleryScreen
          canManage={ctx.permissions.includes("MANAGE_ALBUMS")}
          canUpload={ctx.permissions.includes("UPLOAD_PHOTOS")}
        />
      ) : (
        <p>Gallery access is restricted.</p>
      )}
    </WorkspaceShell>
  );
}

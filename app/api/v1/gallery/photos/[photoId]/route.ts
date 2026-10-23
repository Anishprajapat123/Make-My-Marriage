import { workspaceRequest, readJsonBody } from "@/lib/http/workspace-request";
import { removePhoto } from "@/modules/gallery/gallery.service";
export const runtime = "nodejs";
export const maxDuration = 60;
export function DELETE(
  request: Request,
  context: { params: Promise<{ photoId: string }> },
) {
  return workspaceRequest(async (ctx) => {
    await readJsonBody(request);
    return removePhoto(ctx, (await context.params).photoId);
  }, "MANAGE_ALBUMS");
}

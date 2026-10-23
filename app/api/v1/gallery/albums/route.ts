import { workspaceRequest, readJsonBody } from "@/lib/http/workspace-request";
import { listGallery, createAlbum } from "@/modules/gallery/gallery.service";
export const runtime = "nodejs";
export function GET(request: Request) {
  return workspaceRequest(
    (ctx) =>
      listGallery(
        ctx,
        new URL(request.url).searchParams.get("album") ?? undefined,
      ),
    "VIEW_GALLERY",
  );
}
export function POST(request: Request) {
  return workspaceRequest(
    async (ctx) => createAlbum(ctx, await readJsonBody(request)),
    "MANAGE_ALBUMS",
    201,
  );
}

import { workspaceRequest } from "@/lib/http/workspace-request";
import { readPhotoFile } from "@/lib/storage/cloudinary";
import { uploadPhoto } from "@/modules/gallery/gallery.service";
export const runtime = "nodejs";
export const maxDuration = 60;
export function POST(
  request: Request,
  context: { params: Promise<{ albumId: string }> },
) {
  return workspaceRequest(
    async (ctx) =>
      uploadPhoto(
        ctx,
        (await context.params).albumId,
        await readPhotoFile(request),
      ),
    "UPLOAD_PHOTOS",
    201,
  );
}

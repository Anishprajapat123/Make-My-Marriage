import { workspaceRequest, readJsonBody } from "@/lib/http/workspace-request";
import {
  weddingSettings,
  updateWeddingSettings,
} from "@/modules/wedding/settings.service";
export const runtime = "nodejs";
export function GET() {
  return workspaceRequest(weddingSettings, "VIEW_WEDDING");
}
export function PATCH(request: Request) {
  return workspaceRequest(
    async (ctx) => updateWeddingSettings(ctx, await readJsonBody(request)),
    "MANAGE_WEDDING",
  );
}

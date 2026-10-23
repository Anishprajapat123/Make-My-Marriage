import { workspaceRequest, readJsonBody } from "@/lib/http/workspace-request";
import {
  listLivestreams,
  saveLivestream,
} from "@/modules/livestream/livestream.service";
export const runtime = "nodejs";
export function GET() {
  return workspaceRequest(listLivestreams, "VIEW_LIVESTREAM");
}
export function POST(request: Request) {
  return workspaceRequest(
    async (ctx) => saveLivestream(ctx, await readJsonBody(request)),
    "MANAGE_LIVESTREAM",
  );
}

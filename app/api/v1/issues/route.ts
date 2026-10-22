import { issueRequest, readJsonBody } from "@/modules/issues/issue.http";
import * as service from "@/modules/issues/issue.service";
export function GET(request: Request) {
  return issueRequest((ctx) =>
    service.list(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
export function POST(request: Request) {
  return issueRequest(
    async (ctx) => service.create(ctx, await readJsonBody(request)),
    201,
  );
}

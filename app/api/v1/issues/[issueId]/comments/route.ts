import { issueRequest, readJsonBody } from "@/modules/issues/issue.http";
import * as service from "@/modules/issues/issue.service";
type Context = { params: Promise<{ issueId: string }> };
export function GET(request: Request, { params }: Context) {
  return issueRequest(async (ctx) =>
    service.comments(
      ctx,
      (await params).issueId,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
export function POST(request: Request, { params }: Context) {
  return issueRequest(
    async (ctx) =>
      service.comment(ctx, (await params).issueId, await readJsonBody(request)),
    201,
  );
}

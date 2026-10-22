import { issueRequest, readJsonBody } from "@/modules/issues/issue.http";
import * as service from "@/modules/issues/issue.service";
type Context = { params: Promise<{ issueId: string }> };
export function GET(_: Request, { params }: Context) {
  return issueRequest(async (ctx) =>
    service.detail(ctx, (await params).issueId),
  );
}
export function PATCH(request: Request, { params }: Context) {
  return issueRequest(async (ctx) =>
    service.update(ctx, (await params).issueId, await readJsonBody(request)),
  );
}

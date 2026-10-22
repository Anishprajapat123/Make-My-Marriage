import { issueRequest, readJsonBody } from "@/modules/issues/issue.http";
import { transition } from "@/modules/issues/issue.service";
export function PATCH(
  request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  return issueRequest(async (ctx) =>
    transition(ctx, (await params).issueId, await readJsonBody(request)),
  );
}

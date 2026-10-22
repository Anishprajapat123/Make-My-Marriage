import { issueRequest } from "@/modules/issues/issue.http";
import { history } from "@/modules/issues/issue.service";
export function GET(
  request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  return issueRequest(async (ctx) =>
    history(
      ctx,
      (await params).issueId,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}

import { issueRequest } from "@/modules/issues/issue.http";
import { options } from "@/modules/issues/issue.service";
export function GET() {
  return issueRequest(options);
}

import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import {
  ISSUE_READ_PERMISSIONS,
  issueScope,
  broadIssues,
  manageIssues,
  commentIssues,
} from "@/modules/issues/issue.access";
import { IssuesScreen } from "@/modules/issues/components/issues-screen";
export default async function IssuesPage() {
  let ctx;
  try {
    const current = await requireTenant(ISSUE_READ_PERMISSIONS);
    issueScope(current);
    ctx = current;
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.code === "NO_WORKSPACE") redirect("/onboarding");
  }
  return (
    <IssuesScreen
      canView={Boolean(ctx)}
      canReport={ctx?.permissions.includes("REPORT_ISSUES") ?? false}
      canManage={ctx ? manageIssues(ctx) : false}
      canComment={ctx ? commentIssues(ctx) : false}
      ownOnly={ctx ? !broadIssues(ctx) : false}
      weddingTitle={ctx?.weddingTitle ?? "Wedding workspace"}
      memberName={ctx?.memberName ?? "Member"}
      roleLabel={ctx?.roleKeys.join(", ") ?? "Member"}
      timezone={ctx?.timezone ?? "Asia/Kolkata"}
    />
  );
}

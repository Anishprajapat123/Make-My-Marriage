import "server-only";
import { z } from "zod";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { issueScope, requireIssueManager, commentIssues } from "./issue.access";
import * as repo from "./issue.repository";
import { resourceActivity } from "@/modules/activity/activity.repository";
import type { IssueHistory } from "./issue.types";
import {
  issueId,
  issueQuery,
  issueCreate,
  issueEdit,
  issueTransition,
  issuePage,
  issueCommentInput,
} from "./issue.schema";
function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const p = schema.safeParse(value);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" "),
    );
  return p.data;
}
function id(value: string) {
  const p = issueId.safeParse(value);
  if (!p.success) throw new AccessError(404, "NOT_FOUND", "Issue not found.");
  return p.data;
}
export function list(ctx: TenantContext, input: unknown) {
  issueScope(ctx);
  return repo.listIssues(ctx, parse(issueQuery, input));
}
export function detail(ctx: TenantContext, value: string) {
  issueScope(ctx);
  return repo.getIssue(ctx, id(value));
}
export function options(ctx: TenantContext) {
  issueScope(ctx);
  return repo.issueOptions(ctx);
}
export function create(ctx: TenantContext, input: unknown) {
  if (!ctx.permissions.includes("REPORT_ISSUES"))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Reporting permission is required.",
    );
  const p = parse(issueCreate, input);
  return repo.createIssue(ctx, p.issue, p.requestId);
}
export function update(ctx: TenantContext, value: string, input: unknown) {
  requireIssueManager(ctx);
  const p = parse(issueEdit, input);
  return repo.updateIssue(ctx, id(value), p.issue, p.revision);
}
export function transition(ctx: TenantContext, value: string, input: unknown) {
  requireIssueManager(ctx);
  const p = parse(issueTransition, input);
  return repo.transitionIssue(ctx, id(value), p.revision, p.status);
}
export function comments(ctx: TenantContext, value: string, input: unknown) {
  issueScope(ctx);
  return repo.listComments(ctx, id(value), parse(issuePage, input).page);
}
export function comment(ctx: TenantContext, value: string, input: unknown) {
  issueScope(ctx);
  if (!commentIssues(ctx))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Commenting permission is required.",
    );
  const p = parse(issueCommentInput, input);
  return repo.addComment(ctx, id(value), p.body, p.requestId);
}
export async function history(
  ctx: TenantContext,
  value: string,
  input: unknown,
): Promise<IssueHistory> {
  issueScope(ctx);
  const issueId = id(value),
    page = parse(issuePage, input).page;
  await repo.getIssue(ctx, issueId);
  const entries = await resourceActivity(ctx.tenantId, "ISSUE", issueId, page);
  return {
    entries: entries.slice(0, 25).map((e) => ({
      id: String(e._id),
      action: String(e.action),
      actorName: e.actorName,
      createdAt: e.createdAt.toISOString(),
    })),
    page,
    hasNext: entries.length > 25,
  };
}

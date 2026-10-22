import { z } from "zod";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "./issue.types";
export const issueId = z
  .string()
  .regex(/^[a-f\d]{24}$/i)
  .transform((v) => v.toLowerCase());
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      "Remove control characters.",
    );
export const issueInput = z
  .object({
    title: text(180).min(1),
    description: text(4000).min(1),
    priority: z.enum(ISSUE_PRIORITIES).default("MEDIUM"),
    eventId: issueId.nullable().default(null),
    vendorId: issueId.nullable().default(null),
  })
  .strict();
export const issueCreate = z
  .object({ requestId: z.uuid(), issue: issueInput })
  .strict();
export const issueEdit = z
  .object({
    revision: z.number().int().min(0),
    issue: issueInput.extend({
      assignedToMemberId: issueId.nullable().default(null),
    }),
  })
  .strict();
export const issueTransition = z
  .object({ revision: z.number().int().min(0), status: z.enum(ISSUE_STATUSES) })
  .strict();
export const issueCommentInput = z
  .object({ requestId: z.uuid(), body: text(2000).min(1) })
  .strict();
export const issuePage = z
  .object({ page: z.coerce.number().int().min(1).max(10000).default(1) })
  .strict();
export const issueQuery = issuePage
  .extend({
    search: text(180).default(""),
    status: z.enum(ISSUE_STATUSES).optional(),
    priority: z.enum(ISSUE_PRIORITIES).optional(),
    eventId: issueId.optional(),
    assignedToMemberId: issueId.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export type IssueInput = z.infer<typeof issueInput>;
export type IssueEditInput = z.infer<typeof issueEdit>["issue"];
export type IssueQuery = z.infer<typeof issueQuery>;

export const ISSUE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const issueLabel = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
export type IssueView = {
  id: string;
  title: string;
  description: string;
  priority: (typeof ISSUE_PRIORITIES)[number];
  status: (typeof ISSUE_STATUSES)[number];
  revision: number;
  reportedByMemberId: string;
  reporterName: string;
  assignedToMemberId: string | null;
  assigneeName: string | null;
  eventId: string | null;
  eventName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
export type IssueList = {
  issues: IssueView[];
  total: number;
  page: number;
  limit: number;
  counts: { open: number; inProgress: number; resolved: number };
};
export type IssueOptions = {
  events: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  members: { id: string; name: string }[];
};
export type IssueComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};
export type IssueComments = {
  comments: IssueComment[];
  page: number;
  hasNext: boolean;
};
export type IssueHistory = {
  entries: {
    id: string;
    action: string;
    actorName: string;
    createdAt: string;
  }[];
  page: number;
  hasNext: boolean;
};

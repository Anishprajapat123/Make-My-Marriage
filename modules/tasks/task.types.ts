export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const statusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting",
  COMPLETED: "Completed",
};
export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};
export type ChecklistItem = { id: string; title: string; done: boolean };
export type Choice = { id: string; name: string };
export type TaskView = {
  id: string;
  title: string;
  description: string;
  eventId: string | null;
  assigneeMemberIds: string[];
  dueAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  checklist: ChecklistItem[];
  completedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  assignees?: Choice[];
  eventName?: string | null;
};
export type TaskComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};
export type TaskOptions = { events: Choice[]; members: Choice[] };
export type TaskList = {
  tasks: TaskView[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
};

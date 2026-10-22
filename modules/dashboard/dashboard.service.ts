import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { listTasks } from "@/modules/tasks/task.service";
import { TASK_READ_PERMISSIONS } from "@/modules/tasks/task.access";
import { summary as expenseSummary } from "@/modules/expenses/expense.service";
import { listInvitationStatus } from "@/modules/invitations/invitation.service";
import * as repo from "./dashboard.repository";
export async function getDashboard(ctx: TenantContext) {
  if (!ctx.permissions.includes("VIEW_WEDDING"))
    throw new AccessError(403, "FORBIDDEN", "Wedding access is required.");
  const has = (permission: string) => ctx.permissions.includes(permission);
  const [events, tasks, guests, rsvp, expenses, vendors] = await Promise.all([
    has("VIEW_EVENTS") ? repo.upcomingEvents(ctx) : null,
    TASK_READ_PERMISSIONS.some(has)
      ? listTasks(ctx, {}).then((value) => ({
          counts: value.counts,
          assignedOnly: !has("VIEW_TASKS") && !has("MANAGE_TASKS"),
          recent: value.tasks.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueAt: t.dueAt,
          })),
        }))
      : null,
    has("VIEW_GUESTS") || has("MANAGE_GUESTS") ? repo.guestCounts(ctx) : null,
    has("VIEW_RSVP")
      ? listInvitationStatus(ctx, { limit: 1 }).then((value) => ({
          yes: value.counts.yes,
          no: value.counts.no,
          pending: value.counts.pending,
          active: value.counts.active,
        }))
      : null,
    has("VIEW_EXPENSES") ? expenseSummary(ctx) : null,
    has("VIEW_VENDORS") && !ctx.roleKeys.includes("VENDOR")
      ? repo.vendorCount(ctx)
      : null,
  ]);
  return {
    events,
    tasks,
    guests,
    rsvp,
    expenses,
    vendors,
    generatedAt: new Date().toISOString(),
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

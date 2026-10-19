import { beforeEach, describe, expect, it, vi } from "vitest";
const repo = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  labels: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  comments: vi.fn(),
  addComment: vi.fn(),
  options: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/modules/wedding/wedding.service", () => ({
  getCurrentWeddingForUser: vi.fn(),
}));
vi.mock("@/modules/tasks/task.repository", () => ({ taskRepository: repo }));
vi.mock("@/modules/activity/activity.repository", () => ({
  resourceActivity: vi.fn(),
}));
import { taskScope } from "@/modules/tasks/task.access";
import {
  getTask,
  listTasks,
  saveTask,
  deleteTask,
  addTaskComment,
  listTaskComments,
  taskOptions,
  taskActivity,
} from "@/modules/tasks/task.service";
import { taskInputSchema, taskPatchSchema } from "@/modules/tasks/task.schema";
import type { TenantContext } from "@/lib/tenant/context";
const id = "333333333333333333333333";
const ctx: TenantContext = {
  tenantId: "111111111111111111111111",
  memberId: "222222222222222222222222",
  timezone: "Asia/Kolkata",
  permissions: ["VIEW_ASSIGNED_TASKS", "UPDATE_ASSIGNED_TASKS"],
  memberName: "QA",
  weddingTitle: "QA",
  roleKeys: ["CUSTOM"],
};
const step = {
  id: "89b49f61-8f1a-4eea-bd03-41439171028a",
  title: "Call florist",
  done: false,
};
const record = {
  _id: id,
  title: "Flowers",
  description: "Keep",
  assigneeMemberIds: [ctx.memberId],
  eventId: null,
  dueAt: null,
  priority: "HIGH",
  status: "TODO",
  checklist: [step],
  completedAt: null,
  revision: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
beforeEach(() => {
  vi.resetAllMocks();
  repo.get.mockResolvedValue(record);
  repo.save.mockResolvedValue(record);
  repo.labels.mockImplementation(async (_tenant, tasks) => tasks);
});
describe("Tasks security and contract", () => {
  it("scopes assigned reads by tenant and membership, independent of role name", async () => {
    await getTask(ctx, id);
    expect(repo.get).toHaveBeenCalledWith({
      tenantId: ctx.tenantId,
      assigneeMemberIds: ctx.memberId,
      _id: id,
    });
  });
  it("does not widen assigned scope when filters request another member", async () => {
    repo.list.mockResolvedValue({ tasks: [], total: 0, counts: { total: 0 } });
    await listTasks(ctx, { assigneeMemberId: id });
    expect(repo.list.mock.calls[0][0]).toEqual(taskScope(ctx));
    expect(repo.list.mock.calls[0][1]).toEqual({
      $and: [{ assigneeMemberIds: id }],
    });
  });
  it("keeps planner queries tenant scoped", () => {
    expect(taskScope({ ...ctx, permissions: ["MANAGE_TASKS"] })).toEqual({
      tenantId: ctx.tenantId,
    });
  });
  it("rejects permissionless access", () => {
    expect(() => taskScope({ ...ctx, permissions: [] })).toThrow();
  });
  it.each(["title", "eventId", "assigneeMemberIds", "priority", "dueAt"])(
    "rejects assigned edits to %s",
    async (field) => {
      await expect(
        saveTask(ctx, { revision: 0, status: "TODO", [field]: "tamper" }, id),
      ).rejects.toMatchObject({ status: 400 });
      expect(repo.save).not.toHaveBeenCalled();
    },
  );
  it("allows assigned completion while preserving checklist titles and scope", async () => {
    await saveTask(
      ctx,
      { revision: 0, checklist: [{ id: step.id, done: true }] },
      id,
    );
    expect(repo.save).toHaveBeenCalledWith(
      { tenantId: ctx.tenantId, assigneeMemberIds: ctx.memberId, _id: id },
      { checklist: [{ ...step, done: true }] },
      0,
      ctx.memberId,
    );
  });
  it("rejects adding/removing steps from assigned access", async () => {
    await expect(
      saveTask(ctx, { revision: 0, checklist: [] }, id),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("limits assigned-update permission even with broad read permission", async () => {
    repo.get.mockResolvedValue(null);
    await expect(
      saveTask(
        { ...ctx, permissions: ["VIEW_TASKS", "UPDATE_ASSIGNED_TASKS"] },
        { revision: 0, status: "COMPLETED" },
        id,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(repo.get.mock.calls[0][0].assigneeMemberIds).toBe(ctx.memberId);
  });
  it("blocks assigned create/delete/comments/options", async () => {
    await expect(saveTask(ctx, { title: "new" })).rejects.toMatchObject({
      status: 403,
    });
    await expect(deleteTask(ctx, id, 0)).rejects.toMatchObject({ status: 403 });
    await expect(
      addTaskComment(ctx, id, { body: "text" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(taskOptions(ctx)).rejects.toMatchObject({ status: 403 });
  });
  it("applies assigned scope to comments and prevents out-of-scope history", async () => {
    await listTaskComments(ctx, id);
    expect(repo.comments).toHaveBeenCalledWith(
      { ...taskScope(ctx), _id: id },
      1,
    );
    repo.get.mockResolvedValue(null);
    await expect(taskActivity(ctx, id)).rejects.toMatchObject({ status: 404 });
  });
  it("keeps omitted PATCH values unchanged", () => {
    expect(taskPatchSchema.parse({ revision: 0, status: "WAITING" })).toEqual({
      revision: 0,
      status: "WAITING",
    });
  });
  it("requires revision and bounds inputs", () => {
    expect(taskPatchSchema.safeParse({ status: "TODO" }).success).toBe(false);
    expect(
      taskInputSchema.safeParse({
        title: "x",
        checklist: Array.from({ length: 51 }, () => step),
      }).success,
    ).toBe(false);
    expect(
      taskInputSchema.safeParse({ title: "x", tenantId: ctx.tenantId }).success,
    ).toBe(false);
  });
  it("escapes literal search characters", async () => {
    repo.list.mockResolvedValue({ tasks: [], total: 0, counts: {} });
    await listTasks(ctx, { q: "[a].*" });
    expect(repo.list.mock.calls[0][1].$and[0].title.$regex).toBe(
      "\\[a\\]\\.\\*",
    );
  });
  it("propagates stale conflicts without widening update scope", async () => {
    repo.save.mockRejectedValue(
      Object.assign(new Error("stale"), { status: 409 }),
    );
    await expect(
      saveTask(ctx, { revision: 0, status: "WAITING" }, id),
    ).rejects.toMatchObject({ status: 409 });
    expect(repo.save.mock.calls[0][0]).toEqual({ ...taskScope(ctx), _id: id });
  });
});

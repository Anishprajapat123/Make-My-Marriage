vi.mock("@/modules/notifications/notification.repository", () => ({
  prepareNotifications: vi.fn(),
  notifyTaskAssignments: vi.fn(),
}));
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
const mocks = vi.hoisted(() => ({
  event: vi.fn(),
  members: vi.fn(),
  update: vi.fn(),
  append: vi.fn(),
  create: vi.fn(),
  previous: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/modules/wedding/wedding.service", () => ({
  getCurrentWeddingForUser: vi.fn(),
}));
vi.mock("@/modules/events/event.model", () => ({
  EventModel: { collection: { updateOne: mocks.event } },
}));
vi.mock("@/modules/members/member.model", () => ({
  MemberModel: { countDocuments: mocks.members },
}));
vi.mock("@/modules/tasks/task.model", () => ({
  TaskModel: {
    findOneAndUpdate: mocks.update,
    create: mocks.create,
    findOne: mocks.previous,
  },
  TaskCommentModel: {},
}));
vi.mock("@/modules/activity/activity.repository", () => ({
  appendActivity: mocks.append,
}));
import { taskRepository } from "@/modules/tasks/task.repository";
const scope = {
  tenantId: "111111111111111111111111",
  _id: "333333333333333333333333",
  assigneeMemberIds: "222222222222222222222222",
};
const eventId = "444444444444444444444444";
const session = {
  withTransaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  endSession: vi.fn(),
};
beforeEach(() => {
  vi.resetAllMocks();
  session.withTransaction.mockImplementation(async (fn) => fn());
  vi.spyOn(mongoose, "startSession").mockResolvedValue(session as never);
  mocks.event.mockResolvedValue({ matchedCount: 1 });
  mocks.previous.mockReturnValue({
    select: () => ({
      session: () => ({
        lean: () => Promise.resolve({ assigneeMemberIds: [] }),
      }),
    }),
  });
  mocks.update.mockReturnValue({
    lean: () => Promise.resolve({ _id: scope._id }),
  });
});
afterEach(() => vi.restoreAllMocks());
it("coordinates event references with deletion through the native tenant-scoped guard", async () => {
  await taskRepository.save(scope, { eventId }, 0, scope.assigneeMemberIds);
  expect(mocks.event).toHaveBeenCalledWith(
    {
      tenantId: new Types.ObjectId(scope.tenantId),
      _id: new Types.ObjectId(eventId),
    },
    { $inc: { referenceVersion: 1 } },
    { session },
  );
  expect(mocks.update.mock.calls[0][0]).toEqual({ ...scope, revision: 0 });
  expect(mocks.append.mock.calls[0][0]).toMatchObject({
    tenantId: scope.tenantId,
    actorMemberId: scope.assigneeMemberIds,
  });
  expect(session.endSession).toHaveBeenCalled();
});
it("rejects nonexistent or foreign events before task mutation", async () => {
  mocks.event.mockResolvedValue({ matchedCount: 0 });
  await expect(
    taskRepository.save(scope, { eventId }, 0, scope.assigneeMemberIds),
  ).rejects.toMatchObject({ status: 400 });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.append).not.toHaveBeenCalled();
});
it("checks active assignees within the tenant", async () => {
  mocks.members.mockReturnValue({ session: () => Promise.resolve(0) });
  await expect(
    taskRepository.save(
      scope,
      { assigneeMemberIds: [scope.assigneeMemberIds] },
      0,
      scope.assigneeMemberIds,
    ),
  ).rejects.toMatchObject({ status: 400 });
  expect(mocks.members).toHaveBeenCalledWith({
    tenantId: scope.tenantId,
    _id: { $in: [scope.assigneeMemberIds] },
    membershipStatus: "ACTIVE",
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects stale or assignment-changed writes without appending activity", async () => {
  mocks.update.mockReturnValue({ lean: () => Promise.resolve(null) });
  await expect(
    taskRepository.save(
      scope,
      { status: "WAITING" },
      0,
      scope.assigneeMemberIds,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(mocks.update.mock.calls[0][0]).toEqual({ ...scope, revision: 0 });
  expect(mocks.append).not.toHaveBeenCalled();
});

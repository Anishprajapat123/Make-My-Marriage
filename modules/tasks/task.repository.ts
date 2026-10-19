import "server-only";
import mongoose, { Types } from "mongoose";
import { TaskModel, TaskCommentModel } from "./task.model";
import { EventModel } from "@/modules/events/event.model";
import { MemberModel } from "@/modules/members/member.model";
import { UserModel } from "@/modules/auth/user.model";
import { AccessError } from "@/lib/tenant/context";
import type { TaskOptions, TaskView } from "./task.types";
import { appendActivity } from "@/modules/activity/activity.repository";

export type TaskFilter = {
  tenantId: string;
  assigneeMemberIds?: string;
  _id?: string;
};
type Fields = {
  eventId?: string | null;
  assigneeMemberIds?: string[];
} & Record<string, unknown>;
export const taskRepository = {
  async labels(tenantId: string, tasks: TaskView[]): Promise<TaskView[]> {
    const [events, members] = await Promise.all([
      EventModel.find({
        tenantId,
        _id: { $in: tasks.flatMap((t) => (t.eventId ? [t.eventId] : [])) },
      })
        .select("_id name")
        .lean(),
      MemberModel.find({
        tenantId,
        _id: { $in: tasks.flatMap((t) => t.assigneeMemberIds) },
      })
        .select("_id userId membershipStatus")
        .lean(),
    ]);
    const users = await UserModel.find({
      _id: { $in: members.map((m) => m.userId) },
    })
      .select("_id displayName")
      .lean();
    const names = new Map(
      users.map((u) => [String(u._id), String(u.displayName)]),
    );
    const memberNames = new Map(
      members.map((m) => [
        String(m._id),
        `${names.get(String(m.userId)) ?? "Member"}${m.membershipStatus === "ACTIVE" ? "" : " (inactive)"}`,
      ]),
    );
    const eventNames = new Map(
      events.map((e) => [String(e._id), String(e.name)]),
    );
    return tasks.map((t) => ({
      ...t,
      assignees: t.assigneeMemberIds.map((id) => ({
        id,
        name: memberNames.get(id) ?? "Former member",
      })),
      eventName: t.eventId
        ? (eventNames.get(t.eventId) ?? "Unavailable event")
        : null,
    }));
  },
  get(filter: TaskFilter) {
    return TaskModel.findOne(filter).lean();
  },
  async list(scope: TaskFilter, filter: object, page: number) {
    const [tasks, total, counts] = await Promise.all([
      TaskModel.find({ $and: [scope, filter] })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * 25)
        .limit(25)
        .lean(),
      TaskModel.countDocuments({ $and: [scope, filter] }),
      TaskModel.aggregate([
        {
          $match: {
            tenantId: new Types.ObjectId(scope.tenantId),
            ...(scope.assigneeMemberIds
              ? {
                  assigneeMemberIds: new Types.ObjectId(
                    scope.assigneeMemberIds,
                  ),
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            todo: { $sum: { $cond: [{ $eq: ["$status", "TODO"] }, 1, 0] } },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
            },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$dueAt", null] },
                      { $lt: ["$dueAt", new Date()] },
                      { $ne: ["$status", "COMPLETED"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);
    return {
      tasks,
      total,
      counts: counts[0] ?? {
        total: 0,
        todo: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      },
    };
  },
  async options(tenantId: string): Promise<TaskOptions> {
    const [events, members] = await Promise.all([
      EventModel.find({ tenantId })
        .select("_id name")
        .sort({ startAt: 1 })
        .lean(),
      MemberModel.find({ tenantId, membershipStatus: "ACTIVE" })
        .select("_id userId")
        .lean(),
    ]);
    const users = await UserModel.find({
      _id: { $in: members.map((m) => m.userId) },
    })
      .select("_id displayName")
      .lean();
    const names = new Map(
      users.map((u) => [String(u._id), String(u.displayName)]),
    );
    return {
      events: events.map((e) => ({ id: String(e._id), name: String(e.name) })),
      members: members.map((m) => ({
        id: String(m._id),
        name: names.get(String(m.userId)) ?? "Member",
      })),
    };
  },
  async save(
    scope: TaskFilter,
    fields: Fields,
    revision?: number,
    memberId?: string,
  ) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        // Write the event in this transaction so concurrent deletion cannot leave a dangling link.
        if (fields.eventId) {
          const event = await EventModel.collection.updateOne(
            {
              tenantId: new Types.ObjectId(scope.tenantId),
              _id: new Types.ObjectId(fields.eventId),
            },
            { $inc: { referenceVersion: 1 } },
            { session },
          );
          if (!event.matchedCount)
            throw new AccessError(
              400,
              "VALIDATION_ERROR",
              "The selected event is no longer available.",
            );
        }
        if (fields.assigneeMemberIds?.length) {
          const count = await MemberModel.countDocuments({
            tenantId: scope.tenantId,
            _id: { $in: fields.assigneeMemberIds },
            membershipStatus: "ACTIVE",
          }).session(session);
          if (count !== fields.assigneeMemberIds.length)
            throw new AccessError(
              400,
              "VALIDATION_ERROR",
              "Choose active members of this wedding only.",
            );
        }
        if (!scope._id) {
          const [task] = await TaskModel.create(
            [
              {
                ...fields,
                tenantId: scope.tenantId,
                createdByMemberId: memberId,
              },
            ],
            { session, ordered: true },
          );
          await appendActivity(
            {
              tenantId: scope.tenantId,
              actorMemberId: memberId!,
              action: "TASK_CREATED",
              resourceType: "TASK",
              resourceId: String(task._id),
              summary: "Created task.",
            },
            session,
          );
          return task.toObject();
        }
        const record = await TaskModel.findOneAndUpdate(
          { ...scope, revision },
          { $set: fields, $inc: { revision: 1 } },
          { new: true, runValidators: true, session },
        ).lean();
        if (!record)
          throw new AccessError(
            409,
            "CONFLICT",
            "This task changed or you are no longer assigned. Reload before editing.",
          );
        await appendActivity(
          {
            tenantId: scope.tenantId,
            actorMemberId: memberId!,
            action: "TASK_UPDATED",
            resourceType: "TASK",
            resourceId: scope._id,
            summary: "Updated task.",
          },
          session,
        );
        return record;
      });
    } finally {
      await session.endSession();
    }
  },
  async remove(filter: TaskFilter, revision: number, memberId: string) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        const result = await TaskModel.deleteOne(
          { ...filter, revision },
          { session },
        );
        if (!result.deletedCount)
          throw new AccessError(
            409,
            "CONFLICT",
            "This task changed or was deleted. Reload and try again.",
          );
        await TaskCommentModel.deleteMany(
          { tenantId: filter.tenantId, taskId: filter._id },
          { session },
        );
        await appendActivity(
          {
            tenantId: filter.tenantId,
            actorMemberId: memberId,
            action: "TASK_DELETED",
            resourceType: "TASK",
            resourceId: filter._id!,
            summary: "Deleted task.",
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
  },
  async comments(filter: TaskFilter, page: number) {
    // Caller already checked the task using its assigned scope; recheck before exposing comments.
    if (!(await TaskModel.exists(filter)))
      throw new AccessError(404, "NOT_FOUND", "Task not found.");
    const records = await TaskCommentModel.find({
      tenantId: filter.tenantId,
      taskId: filter._id,
    })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 25)
      .limit(26)
      .lean();
    const authors = await MemberModel.find({
      tenantId: filter.tenantId,
      _id: { $in: records.map((c) => c.authorMemberId) },
    })
      .select("_id userId")
      .lean();
    const users = await UserModel.find({
      _id: { $in: authors.map((a) => a.userId) },
    })
      .select("_id displayName")
      .lean();
    const names = new Map(
      users.map((u) => [String(u._id), String(u.displayName)]),
    );
    const authorNames = new Map(
      authors.map((a) => [
        String(a._id),
        names.get(String(a.userId)) ?? "Former member",
      ]),
    );
    return {
      comments: records.slice(0, 25).map((c) => ({
        id: String(c._id),
        body: String(c.body),
        authorName:
          authorNames.get(String(c.authorMemberId)) ?? "Former member",
        createdAt: new Date(c.createdAt).toISOString(),
      })),
      hasMore: records.length > 25,
      page,
    };
  },
  async addComment(filter: TaskFilter, memberId: string, body: string) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const task = await TaskModel.updateOne(
          filter,
          { $inc: { commentVersion: 1 } },
          { session, timestamps: false },
        );
        if (!task.matchedCount)
          throw new AccessError(404, "NOT_FOUND", "Task not found.");
        await TaskCommentModel.create(
          [
            {
              tenantId: filter.tenantId,
              taskId: filter._id,
              authorMemberId: memberId,
              body,
            },
          ],
          { session, ordered: true },
        );
        await appendActivity(
          {
            tenantId: filter.tenantId,
            actorMemberId: memberId,
            action: "TASK_COMMENT_ADDED",
            resourceType: "TASK",
            resourceId: filter._id!,
            summary: "Added a comment.",
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
  },
};

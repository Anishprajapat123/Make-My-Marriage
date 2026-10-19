import "server-only";
import { Schema, model, models } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "./task.types";
const taskSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Wedding" },
    eventId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "WeddingEvent",
    },
    createdByMemberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "WeddingMember",
    },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 2000 },
    assigneeMemberIds: {
      type: [Schema.Types.ObjectId],
      default: [],
      ref: "WeddingMember",
      validate: (ids: unknown[]) => ids.length <= 30,
    },
    dueAt: { type: Date, default: null },
    priority: { type: String, enum: TASK_PRIORITIES, required: true },
    status: { type: String, enum: TASK_STATUSES, required: true },
    checklist: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            title: { type: String, required: true, maxlength: 160 },
            done: { type: Boolean, default: false },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: (items: unknown[]) => items.length <= 50,
    },
    completedAt: { type: Date, default: null },
    revision: { type: Number, default: 0, min: 0 },
    commentVersion: { type: Number, default: 0, select: false },
  },
  { collection: "tasks", timestamps: true, versionKey: false },
);
taskSchema.index({ tenantId: 1, status: 1, dueAt: 1 });
taskSchema.index({ tenantId: 1, assigneeMemberIds: 1, status: 1, dueAt: 1 });
taskSchema.index({ tenantId: 1, eventId: 1, status: 1 });
export const TaskModel = models.WeddingTask || model("WeddingTask", taskSchema);
const commentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    taskId: { type: Schema.Types.ObjectId, required: true, ref: "WeddingTask" },
    authorMemberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "WeddingMember",
    },
    body: { type: String, required: true, maxlength: 2000 },
  },
  { collection: "task_comments", timestamps: true, versionKey: false },
);
commentSchema.index({ tenantId: 1, taskId: 1, createdAt: 1 });
export const TaskCommentModel =
  models.TaskComment || model("TaskComment", commentSchema);

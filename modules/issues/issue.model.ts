import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "./issue.types";
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, maxlength: 180 },
    description: { type: String, required: true, maxlength: 4000 },
    reportedByMemberId: { type: Schema.Types.ObjectId, required: true },
    assignedToMemberId: { type: Schema.Types.ObjectId, default: null },
    eventId: { type: Schema.Types.ObjectId, default: null },
    vendorId: { type: Schema.Types.ObjectId, default: null },
    priority: { type: String, enum: ISSUE_PRIORITIES, required: true },
    status: {
      type: String,
      enum: ISSUE_STATUSES,
      default: "OPEN",
      required: true,
    },
    revision: { type: Number, default: 0, required: true },
    resolvedAt: { type: Date, default: null },
    requestId: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
  },
  { collection: "issues", timestamps: true, versionKey: false },
);
schema.index({ tenantId: 1, status: 1, priority: 1, createdAt: -1 });
schema.index({ tenantId: 1, reportedByMemberId: 1, createdAt: -1 });
schema.index({ tenantId: 1, eventId: 1, status: 1 });
schema.index({ tenantId: 1, assignedToMemberId: 1, status: 1 });
schema.index({ tenantId: 1, requestId: 1 }, { unique: true });
const commentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    issueId: { type: Schema.Types.ObjectId, required: true },
    authorMemberId: { type: Schema.Types.ObjectId, required: true },
    body: { type: String, required: true, maxlength: 2000 },
    requestId: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
  },
  { collection: "issue_comments", timestamps: true, versionKey: false },
);
commentSchema.index({ tenantId: 1, issueId: 1, createdAt: 1, _id: 1 });
commentSchema.index(
  { tenantId: 1, issueId: 1, authorMemberId: 1, requestId: 1 },
  { unique: true },
);
export type IssueRecord = InferSchemaType<typeof schema>;
export const IssueModel =
  (models.WeddingIssue as Model<IssueRecord> | undefined) ??
  model<IssueRecord>("WeddingIssue", schema);
export const IssueCommentModel: Model<InferSchemaType<typeof commentSchema>> =
  (models.WeddingIssueComment as
    Model<InferSchemaType<typeof commentSchema>> | undefined) ??
  model<InferSchemaType<typeof commentSchema>>(
    "WeddingIssueComment",
    commentSchema,
  );

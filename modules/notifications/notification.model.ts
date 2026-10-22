import "server-only";
import {
  Schema,
  models,
  model,
  type InferSchemaType,
  type Model,
} from "mongoose";
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    recipientMemberId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["TASK_ASSIGNED"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    resourceType: { type: String, enum: ["TASK"], required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    isRead: { type: Boolean, default: false, required: true },
    readAt: { type: Date, default: null },
    eventKey: { type: String, required: true, select: false },
  },
  {
    collection: "notifications",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);
schema.index({
  tenantId: 1,
  recipientMemberId: 1,
  isRead: 1,
  createdAt: -1,
  _id: -1,
});
schema.index({ tenantId: 1, recipientMemberId: 1, createdAt: -1, _id: -1 });
schema.index(
  { tenantId: 1, recipientMemberId: 1, eventKey: 1 },
  { unique: true },
);
export type NotificationRecord = InferSchemaType<typeof schema>;
export const NotificationModel =
  (models.WeddingNotification as Model<NotificationRecord> | undefined) ??
  model<NotificationRecord>("WeddingNotification", schema);

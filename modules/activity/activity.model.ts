import "server-only";
import { Schema, model, models } from "mongoose";
const activitySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    actorMemberId: { type: Schema.Types.ObjectId, default: null },
    actorGuestId: { type: Schema.Types.ObjectId, default: null },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    summary: { type: String, required: true, maxlength: 300 },
  },
  {
    collection: "activity_logs",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);
activitySchema.index({ tenantId: 1, createdAt: -1 });
activitySchema.index({
  tenantId: 1,
  resourceType: 1,
  resourceId: 1,
  createdAt: -1,
});
activitySchema.index({ tenantId: 1, actorMemberId: 1, createdAt: -1 });
export const ActivityModel =
  models.ActivityLog || model("ActivityLog", activitySchema);

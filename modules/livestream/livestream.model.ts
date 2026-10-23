import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, maxlength: 160 },
    videoId: { type: String, required: true },
    status: {
      type: String,
      enum: ["SCHEDULED", "LIVE", "ENDED", "DISABLED"],
      default: "SCHEDULED",
    },
    isPublic: { type: Boolean, default: false },
    revision: { type: Number, default: 0 },
    createdByMemberId: { type: Schema.Types.ObjectId, required: true },
  },
  { collection: "livestreams", timestamps: true, versionKey: false },
);
schema.index({ tenantId: 1, eventId: 1 }, { unique: true });
export const LivestreamModel: Model<InferSchemaType<typeof schema>> =
  (models.Livestream as Model<InferSchemaType<typeof schema>> | undefined) ??
  model<InferSchemaType<typeof schema>>("Livestream", schema);

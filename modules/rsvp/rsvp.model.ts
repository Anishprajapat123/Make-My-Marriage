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
    guestId: { type: Schema.Types.ObjectId, required: true },
    response: {
      type: String,
      enum: ["YES", "NO", "PENDING"],
      default: "PENDING",
    },
    partySize: { type: Number, default: 0, min: 0, max: 11 },
    submittedVia: {
      type: String,
      enum: ["INVITATION_LINK", "ADMIN"],
      default: "INVITATION_LINK",
    },
    submittedAt: { type: Date, default: null },
  },
  { collection: "rsvps", timestamps: true, versionKey: false },
);
schema.index({ tenantId: 1, guestId: 1 }, { unique: true });
schema.index({ tenantId: 1, response: 1 });
export const RsvpModel = (models.WeddingRsvp ||
  model("WeddingRsvp", schema)) as Model<InferSchemaType<typeof schema>>;

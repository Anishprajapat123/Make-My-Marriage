import "server-only";
import { Schema, model, models } from "mongoose";
import { EVENT_STATUSES } from "./event.types";
const timelineSchema = new Schema({
  title: { type: String, required: true, maxlength: 160 },
  at: { type: Date, required: true },
  note: { type: String, default: "", maxlength: 1000 },
});
const eventSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Wedding" },
    createdByMemberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "WeddingMember",
    },
    name: { type: String, required: true, maxlength: 160 },
    ceremonyType: { type: String, default: "", maxlength: 80 },
    description: { type: String, default: "", maxlength: 2000 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    status: { type: String, enum: EVENT_STATUSES, required: true },
    dressCode: { type: String, default: "", maxlength: 300 },
    notes: { type: String, default: "", maxlength: 2000 },
    venue: {
      name: { type: String, required: true },
      addressLine1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      mapUrl: { type: String, default: "" },
      directions: { type: String, default: "" },
    },
    timelineItems: {
      type: [timelineSchema],
      default: [],
      validate: (items: unknown[]) => items.length <= 100,
    },
  },
  { collection: "events", timestamps: true, versionKey: false },
);
eventSchema.index({ tenantId: 1, startAt: 1 });
eventSchema.index({ tenantId: 1, status: 1, startAt: 1 });
export const EventModel =
  models.WeddingEvent || model("WeddingEvent", eventSchema);

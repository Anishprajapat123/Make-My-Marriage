import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { GUEST_SIDES, GUEST_TYPES } from "./guest.types";
const guestSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    familyId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true, maxlength: 180 },
    normalizedName: { type: String, required: true },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    relationship: { type: String, default: "", maxlength: 120 },
    side: { type: String, enum: GUEST_SIDES, default: "OTHER" },
    guestType: { type: String, enum: GUEST_TYPES, default: "PRIMARY" },
    addedByGuestId: { type: Schema.Types.ObjectId, default: null },
    source: {
      type: String,
      enum: ["ADMIN", "MEMBER", "GUEST_RSVP", "IMPORT"],
      required: true,
    },
    notes: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" },
    revision: { type: Number, default: 0, min: 0 },
  },
  { collection: "guests", timestamps: true, versionKey: false },
);
guestSchema.index({ tenantId: 1, familyId: 1, normalizedName: 1, _id: 1 });
guestSchema.index({ tenantId: 1, normalizedName: 1, _id: 1 });
guestSchema.index({ tenantId: 1, phone: 1 });
guestSchema.index({ tenantId: 1, email: 1 });
guestSchema.index({ tenantId: 1, status: 1, normalizedName: 1, _id: 1 });
const familySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 180 },
    normalizedName: { type: String, required: true },
    side: { type: String, enum: GUEST_SIDES, default: "OTHER" },
    primaryContactGuestId: { type: Schema.Types.ObjectId, default: null },
    notes: { type: String, default: "", maxlength: 2000 },
    revision: { type: Number, default: 0, min: 0 },
  },
  { collection: "guest_families", timestamps: true, versionKey: false },
);
familySchema.index({ tenantId: 1, normalizedName: 1, _id: 1 });
export type GuestRecord = InferSchemaType<typeof guestSchema>;
export type FamilyRecord = InferSchemaType<typeof familySchema>;
export const GuestModel = (models.WeddingGuest ||
  model("WeddingGuest", guestSchema)) as Model<GuestRecord>;
export const GuestFamilyModel = (models.GuestFamily ||
  model("GuestFamily", familySchema)) as Model<FamilyRecord>;

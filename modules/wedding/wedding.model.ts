import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";

const weddingSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "COMPLETED"],
      required: true,
      default: "PLANNING",
    },
    bride: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      photoKey: { type: String, default: null },
    },
    groom: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      photoKey: { type: String, default: null },
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: null, maxlength: 2000 },
    weddingDate: { type: Date, required: true },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    timezone: { type: String, required: true, trim: true, maxlength: 80 },
    language: { type: String, enum: ["en", "hi"], required: true },
    hashtag: { type: String, default: null, maxlength: 80 },
    themeKey: { type: String, default: "editorial-sanctuary" },
    coverImageKey: { type: String, default: null },
    storage: {
      quotaBytes: { type: Number, required: true, default: 5_368_709_120 },
      usedBytes: { type: Number, required: true, default: 0 },
    },
    summary: {
      guestCount: { type: Number, default: 0 },
      rsvpYesCount: { type: Number, default: 0 },
      rsvpNoCount: { type: Number, default: 0 },
      rsvpPendingCount: { type: Number, default: 0 },
      taskOpenCount: { type: Number, default: 0 },
      taskCompletedCount: { type: Number, default: 0 },
      expensePaidAmount: { type: Number, default: 0 },
      expenseCommittedAmount: { type: Number, default: 0 },
    },
    settings: {
      publicWeddingPageEnabled: { type: Boolean, default: true },
      publicGalleryEnabled: { type: Boolean, default: true },
      publicLivestreamEnabled: { type: Boolean, default: true },
      defaultReminderEnabled: { type: Boolean, default: true },
    },
  },
  {
    collection: "weddings",
    timestamps: true,
    versionKey: false,
  },
);

weddingSchema.index({ status: 1, weddingDate: 1 });

export type WeddingRecord = InferSchemaType<typeof weddingSchema>;

export const WeddingModel = models.Wedding || model("Wedding", weddingSchema);

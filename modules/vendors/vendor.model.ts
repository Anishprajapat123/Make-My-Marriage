import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { VENDOR_CATEGORIES } from "./vendor.types";
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 180 },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    contact: {
      personName: { type: String, default: "", maxlength: 120 },
      phone: { type: String, default: "", maxlength: 40 },
      email: { type: String, default: "", maxlength: 254 },
    },
    service: { type: String, default: "", maxlength: 500 },
    notes: { type: String, default: "", maxlength: 2000 },
    eventIds: [{ type: Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      required: true,
    },
    revision: { type: Number, default: 0, required: true },
    referenceVersion: { type: Number, default: 0 },
    requestId: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
  },
  { collection: "vendors", timestamps: true, versionKey: false },
);
schema.index({ tenantId: 1, category: 1, status: 1 });
schema.index({ tenantId: 1, eventIds: 1 });
schema.index({ tenantId: 1, status: 1, name: 1 });
schema.index(
  { tenantId: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: "string" } } },
);
export type VendorRecord = InferSchemaType<typeof schema>;
export const VendorModel =
  (models.WeddingVendor as Model<VendorRecord> | undefined) ??
  model<VendorRecord>("WeddingVendor", schema);

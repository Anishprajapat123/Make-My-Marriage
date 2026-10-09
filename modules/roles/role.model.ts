import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";

const roleSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Wedding",
      required: true,
    },
    key: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 300 },
    permissionKeys: { type: [String], required: true, default: [] },
    isSystemRole: { type: Boolean, required: true, default: false },
    createdByMemberId: {
      type: Schema.Types.ObjectId,
      ref: "WeddingMember",
      default: null,
    },
  },
  {
    collection: "roles",
    timestamps: true,
    versionKey: false,
  },
);

roleSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export type RoleRecord = InferSchemaType<typeof roleSchema>;

export const RoleModel = models.Role || model("Role", roleSchema);

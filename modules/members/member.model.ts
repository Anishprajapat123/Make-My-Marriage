import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";

const memberSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Wedding",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roleIds: {
      type: [Schema.Types.ObjectId],
      ref: "Role",
      required: true,
      default: [],
    },
    membershipStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "REMOVED"],
      required: true,
      default: "ACTIVE",
    },
    invitedByMemberId: {
      type: Schema.Types.ObjectId,
      ref: "WeddingMember",
      default: null,
    },
    joinedAt: { type: Date, default: null },
  },
  {
    collection: "wedding_members",
    timestamps: true,
    versionKey: false,
  },
);

memberSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
    },
  },
);
memberSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
memberSchema.index({ tenantId: 1, membershipStatus: 1 });
memberSchema.index({ tenantId: 1, roleIds: 1 });

export type MemberRecord = InferSchemaType<typeof memberSchema>;

export const MemberModel =
  models.WeddingMember || model("WeddingMember", memberSchema);

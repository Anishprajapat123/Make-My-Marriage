import "server-only";
import { Schema, model, models } from "mongoose";
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    normalizedEmail: { type: String, required: true },
    roleIds: { type: [Schema.Types.ObjectId], required: true },
    tokenHash: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"],
      required: true,
      default: "PENDING",
    },
    invitedByMemberId: { type: Schema.Types.ObjectId, required: true },
    acceptedByUserId: { type: Schema.Types.ObjectId, default: null },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { collection: "member_invitations", timestamps: true, versionKey: false },
);
schema.index({ tokenHash: 1 }, { unique: true });
schema.index(
  { tenantId: 1, normalizedEmail: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } },
);
schema.index({ tenantId: 1, status: 1, expiresAt: 1 });
export const MemberInvitationModel =
  models.MemberInvitation || model("MemberInvitation", schema);

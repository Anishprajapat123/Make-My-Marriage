import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
const configSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, maxlength: 180 },
    welcomeMessage: { type: String, default: "", maxlength: 2000 },
    story: { type: String, default: "", maxlength: 5000 },
    themeKey: { type: String, default: "editorial-sanctuary" },
    language: { type: String, enum: ["en", "hi"], default: "en" },
    coverImageKey: { type: String, default: null },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    revision: { type: Number, default: 0 },
  },
  { collection: "invitations", timestamps: true, versionKey: false },
);
configSchema.index({ tenantId: 1 }, { unique: true });
const linkSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    invitationId: { type: Schema.Types.ObjectId, required: true },
    guestId: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true, select: false },
    status: { type: String, enum: ["ACTIVE", "REVOKED"], default: "ACTIVE" },
    revision: { type: Number, default: 0 },
    rsvpRevision: { type: Number, default: 0 },
    lastRequestId: { type: String, default: null, select: false },
    lastRequestHash: { type: String, default: null, select: false },
    lastAccessedAt: { type: Date, default: null },
    lastRsvpAt: { type: Date, default: null },
  },
  { collection: "invitation_links", timestamps: true, versionKey: false },
);
linkSchema.index({ tokenHash: 1 }, { unique: true });
linkSchema.index({ tenantId: 1, guestId: 1 }, { unique: true });
linkSchema.index({ tenantId: 1, status: 1 });
export type InvitationRecord = InferSchemaType<typeof configSchema>;
export type InvitationLinkRecord = InferSchemaType<typeof linkSchema>;
export const InvitationModel = (models.WeddingInvitation ||
  model("WeddingInvitation", configSchema)) as Model<InvitationRecord>;
export const InvitationLinkModel = (models.GuestInvitationLink ||
  model("GuestInvitationLink", linkSchema)) as Model<InvitationLinkRecord>;

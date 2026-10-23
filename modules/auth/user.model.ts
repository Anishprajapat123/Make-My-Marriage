import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["LOCAL", "GOOGLE"],
      required: true,
    },
    googleSubject: {
      type: String,
      default: null,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    profileRevision: { type: Number, default: 0 },
    avatarUrl: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      required: true,
    },
    sessionVersion: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
    },
  },
  {
    collection: "users",
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index(
  { authProvider: 1, googleSubject: 1 },
  {
    unique: true,
    partialFilterExpression: { googleSubject: { $type: "string" } },
  },
);

export type UserRecord = InferSchemaType<typeof userSchema>;

export const UserModel = models.User || model("User", userSchema);

import "server-only";
import { model, models, Schema } from "mongoose";

const authTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "auth_tokens",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

authTokenSchema.index({ userId: 1, purpose: 1 }, { unique: true });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthTokenModel =
  models.AuthToken || model("AuthToken", authTokenSchema);

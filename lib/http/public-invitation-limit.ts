import "server-only";
import { createHash } from "node:crypto";
import { Schema, model, models } from "mongoose";
import { AccessError } from "@/lib/tenant/context";
const schema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: "public_rate_limits", versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Limit =
  models.PublicInvitationLimit || model("PublicInvitationLimit", schema);
export async function limitInvitation(token: string, write: boolean) {
  const minute = Math.floor(Date.now() / 60000),
    key = createHash("sha256")
      .update(`${write ? "write" : "read"}:${token}:${minute}`)
      .digest("hex"),
    max = write ? 20 : 120;
  try {
    await Limit.findOneAndUpdate(
      { _id: key, count: { $lt: max } },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((minute + 2) * 60000) },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === 11000)
      throw new AccessError(
        429,
        "RATE_LIMITED",
        "Too many requests. Please wait a minute and try again.",
      );
    throw e;
  }
}

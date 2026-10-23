import "server-only";
import { z } from "zod";
import { auth } from "@/auth";
import { UserModel } from "./user.model";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AccessError } from "@/lib/tenant/context";
async function profileUser() {
  const session = await auth();
  if (!session?.user?.id)
    throw new AccessError(401, "UNAUTHENTICATED", "Sign in to continue.");
  await connectToDatabase();
  return session.user.id;
}
export async function readProfile() {
  const userId = await profileUser();
  const user = await UserModel.findOne({ _id: userId, status: "ACTIVE" })
    .select("displayName phone email authProvider profileRevision")
    .lean();
  if (!user)
    throw new AccessError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return {
    displayName: user.displayName,
    phone: user.phone ?? "",
    email: user.email,
    provider: user.authProvider,
    revision: user.profileRevision ?? 0,
  };
}
export async function updateProfile(input: unknown) {
  const id = await profileUser();
  const p = z
    .object({
      displayName: z.string().trim().min(2).max(120),
      phone: z
        .string()
        .trim()
        .max(40)
        .regex(/^[+\d ()-]*$/),
      revision: z.number().int().min(0),
    })
    .strict()
    .safeParse(input);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Use a name of 2–120 characters and a valid optional phone number.",
    );
  const user = await UserModel.findOneAndUpdate(
    {
      _id: id,
      status: "ACTIVE",
      ...(p.data.revision === 0
        ? {
            $or: [
              { profileRevision: 0 },
              { profileRevision: { $exists: false } },
            ],
          }
        : { profileRevision: p.data.revision }),
    },
    {
      $set: { displayName: p.data.displayName, phone: p.data.phone },
      $inc: { profileRevision: 1 },
    },
    { new: true },
  )
    .select("profileRevision")
    .lean();
  if (!user)
    throw new AccessError(
      409,
      "STALE_EDIT",
      "Profile changed. Reload before saving again.",
    );
  return { revision: user.profileRevision };
}

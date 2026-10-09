import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { MemberModel } from "./member.model";

export async function findCurrentMembershipForUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  await connectToDatabase();
  return MemberModel.findOne({
    userId: new Types.ObjectId(userId),
    membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
  })
    .select("tenantId userId roleIds membershipStatus joinedAt")
    .lean();
}

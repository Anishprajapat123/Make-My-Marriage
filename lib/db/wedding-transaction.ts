import "server-only";
import mongoose, { Types, type ClientSession } from "mongoose";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { MemberModel } from "@/modules/members/member.model";
import { RoleModel } from "@/modules/roles/role.model";
export async function withWeddingTransaction<T>(
  tenantId: string,
  operation: (session: ClientSession) => Promise<T>,
  actor?: { ctx: TenantContext; permission: string | readonly string[] },
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      if (actor) {
        if (actor.ctx.tenantId !== tenantId)
          throw new AccessError(403, "FORBIDDEN", "Wedding access denied.");
        const member = await MemberModel.findOne({
          tenantId,
          _id: actor.ctx.memberId,
          membershipStatus: "ACTIVE",
        })
          .session(session)
          .lean();
        if (!member)
          throw new AccessError(
            403,
            "FORBIDDEN",
            "Active wedding membership is required.",
          );
        const roles = await RoleModel.find({
          tenantId,
          _id: { $in: member.roleIds },
        })
          .session(session)
          .lean();
        const required =
          typeof actor.permission === "string"
            ? [actor.permission]
            : actor.permission;
        if (
          !required.every((key) =>
            roles.some((r) => r.permissionKeys.includes(key)),
          )
        )
          throw new AccessError(403, "FORBIDDEN", "Permission is required.");
        await MemberModel.collection.updateOne(
          {
            tenantId: new Types.ObjectId(tenantId),
            _id: new Types.ObjectId(actor.ctx.memberId),
          },
          { $inc: { accessVersion: 1 } },
          { session },
        );
      }
      const wedding = await mongoose.connection
        .collection("weddings")
        .updateOne(
          { _id: new Types.ObjectId(tenantId) },
          { $inc: { guestWriteVersion: 1 } },
          { session },
        );
      if (!wedding.matchedCount)
        throw new AccessError(404, "NOT_FOUND", "Wedding unavailable.");
      return operation(session);
    });
  } finally {
    await session.endSession();
  }
}

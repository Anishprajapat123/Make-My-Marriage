import "server-only";
import type { ClientSession } from "mongoose";
import { ActivityModel } from "./activity.model";
import { MemberModel } from "@/modules/members/member.model";
import { UserModel } from "@/modules/auth/user.model";
export async function appendActivity(
  entry: {
    tenantId: string;
    actorMemberId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    summary: string;
  },
  session: ClientSession,
) {
  await ActivityModel.create([entry], { session, ordered: true });
}
export async function resourceActivity(
  tenantId: string,
  resourceType: string,
  resourceId: string,
  page: number,
) {
  const entries = await ActivityModel.find({
    tenantId,
    resourceType,
    resourceId,
  })
    .select("action summary createdAt actorMemberId")
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * 25)
    .limit(26)
    .lean();
  const members = await MemberModel.find({
    tenantId,
    _id: { $in: entries.map((e) => e.actorMemberId) },
  })
    .select("_id userId")
    .lean();
  const users = await UserModel.find({
    _id: { $in: members.map((m) => m.userId) },
  })
    .select("_id displayName")
    .lean();
  const names = new Map(
    users.map((u) => [String(u._id), String(u.displayName)]),
  );
  const authors = new Map(
    members.map((m) => [
      String(m._id),
      names.get(String(m.userId)) ?? "Former member",
    ]),
  );
  return entries.map((e) => ({
    ...e,
    actorName: e.actorMemberId
      ? (authors.get(String(e.actorMemberId)) ?? "Former member")
      : "Wedding guest",
  }));
}

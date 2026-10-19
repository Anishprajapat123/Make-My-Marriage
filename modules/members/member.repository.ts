import "server-only";
import mongoose, { Types, type ClientSession } from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { MemberModel } from "./member.model";
import { MemberInvitationModel as Invite } from "./member-invitation.model";
import { RoleModel } from "@/modules/roles/role.model";
import { UserModel } from "@/modules/auth/user.model";
import { WeddingModel } from "@/modules/wedding/wedding.model";
import { appendActivity } from "@/modules/activity/activity.repository";
import { isOwner, mayGrant, type AccessRole } from "./member.policy";
export const invitationHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const oid = (id: string) => new Types.ObjectId(id);
function fail(status: number, code: string, message: string): never {
  throw new AccessError(status, code, message);
}
async function transaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => operation(session));
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === 11000)
      fail(
        409,
        "MEMBERSHIP_CONFLICT",
        "An invitation or current membership already exists. Reload and try again.",
      );
    throw e;
  } finally {
    await session.endSession();
  }
}
async function actor(
  tenantId: string,
  memberId: string,
  session: ClientSession,
) {
  const member = await MemberModel.findOne({
    tenantId,
    _id: memberId,
    membershipStatus: "ACTIVE",
  })
    .session(session)
    .lean();
  if (!member)
    fail(403, "FORBIDDEN", "Active member management access is required.");
  const roles = await RoleModel.find({ tenantId, _id: { $in: member.roleIds } })
    .session(session)
    .lean();
  if (!roles.some((r) => r.permissionKeys.includes("MANAGE_MEMBERS")))
    fail(403, "FORBIDDEN", "Member management permission is required.");
  // Serialize management against concurrent role/status changes on the actor.
  await MemberModel.collection.updateOne(
    { tenantId: oid(tenantId), _id: oid(memberId), membershipStatus: "ACTIVE" },
    { $inc: { accessVersion: 1 } },
    { session },
  );
  return roles as AccessRole[];
}
async function offered(
  tenantId: string,
  ids: string[],
  session: ClientSession,
) {
  const roles = await RoleModel.find({ tenantId, _id: { $in: ids } })
    .session(session)
    .lean();
  if (roles.length !== ids.length)
    fail(400, "VALIDATION_ERROR", "Choose existing roles from this wedding.");
  return roles as AccessRole[];
}
async function audit(
  tenantId: string,
  memberId: string,
  resourceId: string,
  action: string,
  summary: string,
  session: ClientSession,
  resourceType: "MEMBER" | "MEMBER_INVITATION" = "MEMBER",
) {
  await appendActivity(
    {
      tenantId,
      actorMemberId: memberId,
      resourceType,
      resourceId,
      action,
      summary,
    },
    session,
  );
}
export const memberRepository = {
  roles(tenantId: string) {
    return RoleModel.find({ tenantId })
      .select("key name description permissionKeys isSystemRole")
      .sort({ name: 1 })
      .lean();
  },
  async directory(tenantId: string) {
    const members = await MemberModel.find({ tenantId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    const users = await UserModel.find({
      _id: { $in: members.map((m) => m.userId) },
    })
      .select("displayName email")
      .lean();
    const names = new Map(users.map((u) => [String(u._id), u]));
    return members.map((m) => ({
      ...m,
      name: String(names.get(String(m.userId))?.displayName ?? "Former member"),
      email: String(names.get(String(m.userId))?.email ?? ""),
    }));
  },
  invitations(tenantId: string, page = 1) {
    return Invite.find({ tenantId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 25)
      .limit(25)
      .lean();
  },
  invitationCount(tenantId: string) {
    return Invite.countDocuments({ tenantId });
  },
  pendingCount(tenantId: string) {
    return Invite.countDocuments({
      tenantId,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });
  },
  invitation(tenantId: string, id: string) {
    return Invite.findOne({ tenantId, _id: id }).lean();
  },
  async issue(
    ctx: TenantContext,
    email: string,
    roleIds: string[],
    replace?: { id: string; updatedAt: string },
  ) {
    const token = randomBytes(32).toString("base64url");
    const result = await transaction(async (session) => {
      const roles = await actor(ctx.tenantId, ctx.memberId, session);
      mayGrant(roles, await offered(ctx.tenantId, roleIds, session));
      if (replace) {
        const previous = await Invite.findOne({
          _id: replace.id,
          tenantId: ctx.tenantId,
          updatedAt: new Date(replace.updatedAt),
        })
          .session(session)
          .lean();
        if (!previous)
          fail(
            409,
            "CONFLICT",
            "This invitation changed. Reload before replacing it.",
          );
        if (previous.status === "ACCEPTED")
          fail(409, "CONFLICT", "An accepted invitation cannot be replaced.");
        if (previous.normalizedEmail !== email)
          fail(
            400,
            "VALIDATION_ERROR",
            "Invitation email cannot be changed during replacement.",
          );
        mayGrant(
          roles,
          await offered(ctx.tenantId, previous.roleIds.map(String), session),
        );
        await Invite.updateOne(
          { _id: replace.id, tenantId: ctx.tenantId },
          { $set: { status: "REVOKED" } },
          { session },
        );
      }
      const user = await UserModel.findOne({ email })
        .select("_id")
        .session(session)
        .lean();
      if (
        user &&
        (await MemberModel.exists({
          tenantId: ctx.tenantId,
          userId: user._id,
          membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
        }).session(session))
      )
        fail(
          409,
          "ALREADY_MEMBER",
          "This person is already a member of this wedding.",
        );
      await Invite.updateMany(
        {
          tenantId: ctx.tenantId,
          normalizedEmail: email,
          status: "PENDING",
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: "EXPIRED" } },
        { session },
      );
      const [invite] = await Invite.create(
        [
          {
            tenantId: ctx.tenantId,
            normalizedEmail: email,
            roleIds,
            tokenHash: invitationHash(token),
            invitedByMemberId: ctx.memberId,
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        ],
        { session, ordered: true },
      );
      await audit(
        ctx.tenantId,
        ctx.memberId,
        String(invite._id),
        "MEMBER_INVITED",
        "Created a member invitation.",
        session,
        "MEMBER_INVITATION",
      );
      return {
        id: String(invite._id),
        expiresAt: invite.expiresAt.toISOString(),
      };
    });
    return { ...result, token };
  },
  async revoke(ctx: TenantContext, id: string, updatedAt: string) {
    return transaction(async (session) => {
      const roles = await actor(ctx.tenantId, ctx.memberId, session);
      const invite = await Invite.findOne({
        tenantId: ctx.tenantId,
        _id: id,
        updatedAt: new Date(updatedAt),
      })
        .session(session)
        .lean();
      if (!invite)
        fail(
          409,
          "CONFLICT",
          "This invitation changed. Reload before editing.",
        );
      mayGrant(
        roles,
        await offered(ctx.tenantId, invite.roleIds.map(String), session),
      );
      if (invite.status !== "PENDING")
        fail(409, "CONFLICT", "Only pending invitations can be revoked.");
      await Invite.updateOne(
        { tenantId: ctx.tenantId, _id: id },
        { $set: { status: "REVOKED" } },
        { session },
      );
      await audit(
        ctx.tenantId,
        ctx.memberId,
        id,
        "INVITATION_REVOKED",
        "Revoked a member invitation.",
        session,
        "MEMBER_INVITATION",
      );
    });
  },
  async update(
    ctx: TenantContext,
    id: string,
    input: { roleIds?: string[]; status?: string; updatedAt: string },
  ) {
    return transaction(async (session) => {
      const roles = await actor(ctx.tenantId, ctx.memberId, session);
      if (id === ctx.memberId)
        fail(
          403,
          "PROTECTED_MEMBER",
          "Manage your profile separately. Self-access changes are unavailable here.",
        );
      const target = await MemberModel.findOne({
        tenantId: ctx.tenantId,
        _id: id,
        updatedAt: new Date(input.updatedAt),
      })
        .session(session)
        .lean();
      if (!target)
        fail(409, "CONFLICT", "This member changed. Reload before editing.");
      const existing = await offered(
        ctx.tenantId,
        target.roleIds.map(String),
        session,
      );
      if (isOwner(existing))
        fail(403, "PROTECTED_OWNER", "Owner memberships are protected.");
      mayGrant(roles, existing);
      if (target.membershipStatus === "REMOVED")
        fail(
          409,
          "CONFLICT",
          "Removed members must accept a new invitation to rejoin.",
        );
      if (input.roleIds)
        mayGrant(roles, await offered(ctx.tenantId, input.roleIds, session));
      await MemberModel.findOneAndUpdate(
        {
          tenantId: ctx.tenantId,
          _id: id,
          updatedAt: new Date(input.updatedAt),
        },
        {
          $set: {
            ...(input.roleIds ? { roleIds: input.roleIds } : {}),
            ...(input.status ? { membershipStatus: input.status } : {}),
          },
        },
        { session, runValidators: true },
      );
      await audit(
        ctx.tenantId,
        ctx.memberId,
        id,
        "MEMBER_ACCESS_UPDATED",
        "Updated member access.",
        session,
      );
    });
  },
  async lookup(token: string) {
    const invite = await Invite.findOne({
      tokenHash: invitationHash(token),
    }).lean();
    if (!invite) fail(404, "INVALID_INVITATION", "This invitation is invalid.");
    return invite;
  },
  async preview(token: string, userId: string, email: string) {
    const invite = await this.lookup(token);
    if (invite.normalizedEmail !== email.toLowerCase())
      fail(
        403,
        "WRONG_ACCOUNT",
        "Sign in with the email address that received this invitation.",
      );
    if (
      invite.status === "ACCEPTED" &&
      String(invite.acceptedByUserId) === userId
    ) {
      const member = await MemberModel.exists({
        tenantId: invite.tenantId,
        userId,
        membershipStatus: "ACTIVE",
      });
      if (member)
        return {
          accepted: true,
          weddingTitle: "Your wedding workspace",
          roles: [] as string[],
        };
    }
    if (invite.status !== "PENDING" || invite.expiresAt <= new Date())
      fail(
        410,
        "INVITATION_UNAVAILABLE",
        `This invitation is ${invite.status === "PENDING" ? "expired" : invite.status.toLowerCase()}. Ask the inviter for a new link.`,
      );
    const current = await MemberModel.exists({
      userId,
      membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
    });
    if (current)
      fail(
        409,
        "MEMBERSHIP_CONFLICT",
        "This account already has a current wedding membership and cannot accept another invitation.",
      );
    const wedding = await WeddingModel.findOne({ _id: invite.tenantId })
      .select("title")
      .lean();
    if (!wedding)
      fail(
        410,
        "INVITATION_UNAVAILABLE",
        "This invitation is no longer available.",
      );
    const roles = await RoleModel.find({
      tenantId: invite.tenantId,
      _id: { $in: invite.roleIds },
    })
      .select("name")
      .lean();
    return {
      accepted: false,
      weddingTitle: String(wedding.title),
      roles: roles.map((r) => String(r.name)),
    };
  },
  async accept(token: string, userId: string, email: string) {
    const lookup = await this.lookup(token);
    return transaction(async (session) => {
      const invite = await Invite.findOne({
        tenantId: lookup.tenantId,
        _id: lookup._id,
        tokenHash: invitationHash(token),
      })
        .session(session)
        .lean();
      if (!invite || invite.normalizedEmail !== email.toLowerCase())
        fail(403, "WRONG_ACCOUNT", "Sign in with the invited email address.");
      if (
        invite.status === "ACCEPTED" &&
        String(invite.acceptedByUserId) === userId &&
        (await MemberModel.exists({
          tenantId: invite.tenantId,
          userId,
          membershipStatus: "ACTIVE",
        }).session(session))
      )
        return;
      if (invite.status !== "PENDING" || invite.expiresAt <= new Date())
        fail(
          410,
          "INVITATION_UNAVAILABLE",
          "This invitation has expired, was revoked, or was already accepted.",
        );
      const tenantId = String(invite.tenantId);
      const creatorRoles = await actor(
        tenantId,
        String(invite.invitedByMemberId),
        session,
      );
      mayGrant(
        creatorRoles,
        await offered(tenantId, invite.roleIds.map(String), session),
      );
      const user = await UserModel.findOne({
        _id: userId,
        email: invite.normalizedEmail,
        status: "ACTIVE",
        emailVerifiedAt: { $ne: null },
      })
        .session(session)
        .lean();
      if (!user)
        fail(403, "FORBIDDEN", "A verified active account is required.");
      // Global identity lookup enforces the one-current-wedding invariant.
      if (
        await MemberModel.exists({
          userId,
          membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
        }).session(session)
      )
        fail(
          409,
          "MEMBERSHIP_CONFLICT",
          "This account already has a current wedding membership.",
        );
      const old = await MemberModel.findOne({
        tenantId,
        userId,
        membershipStatus: "REMOVED",
      })
        .session(session)
        .lean();
      let memberId: string;
      if (old) {
        await MemberModel.updateOne(
          { tenantId, _id: old._id, membershipStatus: "REMOVED" },
          {
            $set: {
              roleIds: invite.roleIds,
              membershipStatus: "ACTIVE",
              invitedByMemberId: invite.invitedByMemberId,
              joinedAt: new Date(),
            },
          },
          { session },
        );
        memberId = String(old._id);
      } else {
        const [member] = await MemberModel.create(
          [
            {
              tenantId,
              userId,
              roleIds: invite.roleIds,
              membershipStatus: "ACTIVE",
              invitedByMemberId: invite.invitedByMemberId,
              joinedAt: new Date(),
            },
          ],
          { session, ordered: true },
        );
        memberId = String(member._id);
      }
      await Invite.updateOne(
        { tenantId, _id: invite._id, status: "PENDING" },
        {
          $set: {
            status: "ACCEPTED",
            acceptedByUserId: userId,
            acceptedAt: new Date(),
          },
        },
        { session },
      );
      await audit(
        tenantId,
        memberId,
        memberId,
        "MEMBER_JOINED",
        "Accepted a wedding membership invitation.",
        session,
      );
    });
  },
};

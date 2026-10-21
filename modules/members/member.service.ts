import "server-only";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { sendTransactionalEmail } from "@/lib/email/send";
import { memberRepository as repo } from "./member.repository";
import {
  editMemberSchema,
  invitationActionSchema,
  inviteMemberSchema,
  memberIdSchema,
  memberQuerySchema,
} from "./member.schema";
import { isOwner, mayGrant, type AccessRole } from "./member.policy";
import type {
  MemberList,
  MemberView,
  InvitationView,
  RoleChoice,
} from "./member.types";
import type { z } from "zod";
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const p = schema.safeParse(input);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      p.error.issues.map((i) => i.message).join(" "),
    );
  return p.data;
}
function manager(ctx: TenantContext) {
  if (!ctx.permissions.includes("MANAGE_MEMBERS"))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Member management permission is required.",
    );
}
export async function memberRoles(ctx: TenantContext): Promise<RoleChoice[]> {
  manager(ctx);
  const roles = await repo.roles(ctx.tenantId);
  return roles.map((r) => {
    let assignable = true;
    try {
      mayGrant(
        [
          {
            key: ctx.roleKeys.includes("OWNER") ? "OWNER" : "",
            isSystemRole: ctx.roleKeys.includes("OWNER"),
            permissionKeys: ctx.permissions,
          },
        ],
        [r as AccessRole],
      );
    } catch {
      assignable = false;
    }
    return {
      id: String(r._id),
      key: String(r.key),
      name: String(r.name),
      description: String(r.description ?? ""),
      permissionKeys: r.permissionKeys,
      assignable,
    };
  });
}
function memberView(
  ctx: TenantContext,
  m: Awaited<ReturnType<typeof repo.directory>>[number],
  roles: Awaited<ReturnType<typeof repo.roles>>,
): MemberView {
  return {
    id: String(m._id),
    name: m.name,
    email: m.email,
    roleIds: m.roleIds.map(String) as string[],
    roles: roles
      .filter((r) => m.roleIds.map(String).includes(String(r._id)))
      .map((r) => String(r.name)),
    status: m.membershipStatus,
    updatedAt: new Date(m.updatedAt).toISOString(),
    protected:
      isOwner(
        roles.filter((r) =>
          m.roleIds.map(String).includes(String(r._id)),
        ) as AccessRole[],
      ) || String(m._id) === ctx.memberId,
    current: String(m._id) === ctx.memberId,
  };
}
export async function listMembers(
  ctx: TenantContext,
  query: unknown,
): Promise<MemberList> {
  manager(ctx);
  const q = parsed(memberQuerySchema, query);
  const [all, roles, pending] = await Promise.all([
    repo.directory(ctx.tenantId),
    repo.roles(ctx.tenantId),
    repo.pendingCount(ctx.tenantId),
  ]);
  const rows = all.map((m) => memberView(ctx, m, roles));
  const filtered = rows.filter(
    (m) =>
      (!q.q ||
        `${m.name} ${m.email}`.toLowerCase().includes(q.q.toLowerCase())) &&
      (!q.status || m.status === q.status) &&
      (!q.roleId || m.roleIds.includes(q.roleId)),
  );
  return {
    members: filtered.slice((q.page - 1) * 25, q.page * 25),
    total: filtered.length,
    page: q.page,
    counts: {
      active: rows.filter((m) => m.status === "ACTIVE").length,
      suspended: rows.filter((m) => m.status === "SUSPENDED").length,
      removed: rows.filter((m) => m.status === "REMOVED").length,
      pending,
    },
  };
}
export async function getMember(
  ctx: TenantContext,
  id: string,
): Promise<MemberView> {
  manager(ctx);
  parsed(memberIdSchema, id);
  const [rows, roles] = await Promise.all([
    repo.directory(ctx.tenantId),
    repo.roles(ctx.tenantId),
  ]);
  const member = rows.find((m) => String(m._id) === id);
  if (!member) throw new AccessError(404, "NOT_FOUND", "Member not found.");
  return memberView(ctx, member, roles);
}
export async function listInvitations(
  ctx: TenantContext,
  page = 1,
): Promise<{ invitations: InvitationView[]; page: number; total: number }> {
  manager(ctx);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new AccessError(400, "VALIDATION_ERROR", "Invalid page.");
  const [rows, roles, members, total] = await Promise.all([
    repo.invitations(ctx.tenantId, page),
    repo.roles(ctx.tenantId),
    repo.directory(ctx.tenantId),
    repo.invitationCount(ctx.tenantId),
  ]);
  return {
    page,
    total,
    invitations: rows.map((i) => ({
      id: String(i._id),
      email: String(i.normalizedEmail),
      roles: roles
        .filter((r) => i.roleIds.map(String).includes(String(r._id)))
        .map((r) => String(r.name)),
      status:
        i.status === "PENDING" && i.expiresAt <= new Date()
          ? "EXPIRED"
          : i.status,
      expiresAt: i.expiresAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      inviter:
        members.find((m) => String(m._id) === String(i.invitedByMemberId))
          ?.name ?? "Former member",
    })),
  };
}
async function deliver(
  ctx: TenantContext,
  email: string,
  result: { id: string; token: string; expiresAt: string },
) {
  const base = process.env.APP_BASE_URL;
  if (!base)
    throw new AccessError(
      503,
      "SERVICE_UNAVAILABLE",
      "Application URL is not configured.",
    );
  const link = new URL(`/join/${result.token}`, base).toString();
  let emailSent = false;
  try {
    await sendTransactionalEmail({
      to: email,
      subject: "You’re invited to a wedding workspace",
      text: `You have been invited to ${ctx.weddingTitle} on Make My Marriage. Sign in or create and verify an account using this email address, then explicitly accept the invitation. This link expires in 7 days.\n\n${link}\n\nIf you were not expecting this invitation, you can ignore it.`,
    });
    emailSent = true;
  } catch {
    console.error("MEMBER_INVITATION_EMAIL_FAILED");
  }
  return {
    id: result.id,
    expiresAt: result.expiresAt,
    link,
    emailSent,
    message: emailSent
      ? "Invitation created and email sent. Copy the link now if needed."
      : "Invitation created, but email delivery failed. Copy the link now to share it, or replace the invitation to try delivery again.",
  };
}
export async function inviteMember(ctx: TenantContext, input: unknown) {
  manager(ctx);
  const p = parsed(inviteMemberSchema, input);
  if (!process.env.APP_BASE_URL)
    throw new AccessError(
      503,
      "SERVICE_UNAVAILABLE",
      "Application URL is not configured.",
    );
  return deliver(ctx, p.email, await repo.issue(ctx, p.email, p.roleIds));
}
export async function changeInvitation(
  ctx: TenantContext,
  id: string,
  input: unknown,
) {
  manager(ctx);
  parsed(memberIdSchema, id);
  const p = parsed(invitationActionSchema, input);
  if (p.action === "REVOKE") {
    await repo.revoke(ctx, id, p.updatedAt);
    return { revoked: true };
  }
  const invite = await repo.invitation(ctx.tenantId, id);
  if (!invite) throw new AccessError(404, "NOT_FOUND", "Invitation not found.");
  if (!process.env.APP_BASE_URL)
    throw new AccessError(
      503,
      "SERVICE_UNAVAILABLE",
      "Application URL is not configured.",
    );
  return deliver(
    ctx,
    invite.normalizedEmail,
    await repo.issue(ctx, invite.normalizedEmail, invite.roleIds.map(String), {
      id,
      updatedAt: p.updatedAt,
    }),
  );
}
export async function updateMember(
  ctx: TenantContext,
  id: string,
  input: unknown,
) {
  manager(ctx);
  parsed(memberIdSchema, id);
  await repo.update(ctx, id, parsed(editMemberSchema, input));
  return { updated: true };
}

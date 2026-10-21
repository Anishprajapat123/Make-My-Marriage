import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  issue: vi.fn(),
  update: vi.fn(),
  revoke: vi.fn(),
  invitation: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/modules/wedding/wedding.service", () => ({
  getCurrentWeddingForUser: vi.fn(),
}));
vi.mock("@/modules/members/member.repository", () => ({
  memberRepository: {
    issue: mocks.issue,
    update: mocks.update,
    revoke: mocks.revoke,
    invitation: mocks.invitation,
  },
}));
vi.mock("@/lib/email/send", () => ({ sendTransactionalEmail: mocks.send }));
import { mayGrant, isOwner } from "@/modules/members/member.policy";
import {
  inviteMember,
  updateMember,
  changeInvitation,
} from "@/modules/members/member.service";
import {
  editMemberSchema,
  inviteMemberSchema,
} from "@/modules/members/member.schema";
import type { TenantContext } from "@/lib/tenant/context";
const role = (keys: string[], key = "CUSTOM", isSystemRole = false) => ({
  key,
  isSystemRole,
  permissionKeys: keys,
});
const ctx: TenantContext = {
  tenantId: "111111111111111111111111",
  memberId: "222222222222222222222222",
  permissions: ["MANAGE_MEMBERS"],
  roleKeys: ["OWNER"],
  timezone: "Asia/Kolkata",
  weddingTitle: "QA wedding",
  memberName: "QA",
};
const roleId = "333333333333333333333333";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_BASE_URL", "http://localhost:3101");
  mocks.issue.mockResolvedValue({
    id: roleId,
    token: "a".repeat(43),
    expiresAt: "2026-10-26T00:00:00.000Z",
  });
});
describe("member policy and contracts", () => {
  it("recognizes only the system owner role", () => {
    expect(isOwner([role([], "OWNER", false)])).toBe(false);
    expect(isOwner([role([], "OWNER", true)])).toBe(true);
  });
  it("blocks owner grants even for owners", () => {
    expect(() =>
      mayGrant(
        [role(["MANAGE_MEMBERS"], "OWNER", true)],
        [role([], "OWNER", true)],
      ),
    ).toThrow();
  });
  it("rejects actors without member-management permission", () => {
    expect(() => mayGrant([role(["VIEW_WEDDING"])], [role([])])).toThrow();
  });
  it("enforces permission subsets for non-owner managers", () => {
    expect(() =>
      mayGrant([role(["MANAGE_MEMBERS"])], [role(["MANAGE_EXPENSES"])]),
    ).toThrow();
    expect(() =>
      mayGrant(
        [role(["MANAGE_MEMBERS", "VIEW_WEDDING"])],
        [role(["VIEW_WEDDING"])],
      ),
    ).not.toThrow();
  });
  it("preserves multiple role IDs and normalizes invited email", () => {
    expect(
      inviteMemberSchema.parse({
        email: " QA@EXAMPLE.COM ",
        roleIds: [roleId, ctx.memberId],
      }).email,
    ).toBe("qa@example.com");
  });
  it("rejects duplicate/empty roles and client-supplied tenant identifiers", () => {
    for (const value of [
      { email: "a@example.com", roleIds: [] },
      { email: "a@example.com", roleIds: [roleId, roleId] },
      { email: "a@example.com", roleIds: [roleId], tenantId: ctx.tenantId },
    ])
      expect(inviteMemberSchema.safeParse(value).success).toBe(false);
  });
  it("requires current versions for changes", () => {
    expect(editMemberSchema.safeParse({ status: "REMOVED" }).success).toBe(
      false,
    );
    expect(
      editMemberSchema.safeParse({ updatedAt: "2026-10-19T00:00:00.000Z" })
        .success,
    ).toBe(false);
  });
  it("reports failed email separately from invitation creation", async () => {
    mocks.send.mockRejectedValue(new Error("QA email unavailable"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await inviteMember(ctx, {
        email: "qa@example.invalid",
        roleIds: [roleId],
      });
      expect(result.emailSent).toBe(false);
      expect(result.link).toContain("/join/");
      expect(mocks.issue).toHaveBeenCalledWith(ctx, "qa@example.invalid", [
        roleId,
      ]);
      expect(spy).toHaveBeenCalledWith("MEMBER_INVITATION_EMAIL_FAILED");
    } finally {
      spy.mockRestore();
    }
  });
  it("only reports email sent after the adapter accepts the request", async () => {
    mocks.send.mockResolvedValue(undefined);
    expect(
      (
        await inviteMember(ctx, {
          email: "qa@example.invalid",
          roleIds: [roleId],
        })
      ).emailSent,
    ).toBe(true);
    expect(mocks.send.mock.calls[0][0].text).toContain("expires in 7 days");
  });
  it("blocks management before persistence without permission", async () => {
    const denied = { ...ctx, permissions: [] };
    await expect(inviteMember(denied, {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(updateMember(denied, roleId, {})).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("keeps revocation scoped and versioned without sending email", async () => {
    await changeInvitation(ctx, roleId, {
      action: "REVOKE",
      updatedAt: "2026-10-19T00:00:00.000Z",
    });
    expect(mocks.revoke).toHaveBeenCalledWith(
      ctx,
      roleId,
      "2026-10-19T00:00:00.000Z",
    );
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

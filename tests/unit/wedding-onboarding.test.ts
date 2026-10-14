import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ membership: vi.fn() }));
vi.mock("@/lib/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/membership.service", () => ({
  findCurrentMembershipForUser: mocks.membership,
}));
import { WeddingModel } from "@/modules/wedding/wedding.model";
import { MemberModel } from "@/modules/members/member.model";
import { RoleModel } from "@/modules/roles/role.model";
import { DEFAULT_WEDDING_ROLES } from "@/modules/roles/permissions";
import { createWeddingForUser } from "@/modules/wedding/wedding.service";
const input = {
  brideName: "Bride",
  groomName: "Groom",
  title: "Test wedding",
  weddingDate: "2026-11-26",
  city: "Jaipur",
  timezone: "Asia/Kolkata",
  language: "en" as const,
};
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
describe("wedding onboarding transaction", () => {
  it("uses installed Mongoose's ordered multi-document creation inside one session", async () => {
    mocks.membership.mockResolvedValue(null);
    const session = {
      withTransaction: vi.fn(async (fn: () => Promise<void>) => fn()),
      endSession: vi.fn(),
    };
    vi.spyOn(WeddingModel, "startSession").mockResolvedValue(session as never);
    vi.spyOn(MemberModel, "findOne").mockReturnValue({
      session: () => ({
        select: () => ({ lean: () => Promise.resolve(null) }),
      }),
    } as never);
    const weddingSave = vi
      .spyOn(WeddingModel.prototype, "$save")
      .mockResolvedValue(undefined);
    const roleSave = vi
      .spyOn(RoleModel.prototype, "$save")
      .mockResolvedValue(undefined);
    const memberSave = vi
      .spyOn(MemberModel.prototype, "$save")
      .mockResolvedValue(undefined);
    await createWeddingForUser("111111111111111111111111", input);
    expect(weddingSave).toHaveBeenCalledTimes(1);
    expect(roleSave).toHaveBeenCalledTimes(DEFAULT_WEDDING_ROLES.length);
    for (const [options] of roleSave.mock.calls)
      expect(options).toMatchObject({ session, ordered: true });
    expect(memberSave).toHaveBeenCalledTimes(1);
    expect(memberSave.mock.calls[0][0]).toMatchObject({ session });
    expect(session.endSession).toHaveBeenCalled();
  });
  it("rejects an existing membership before any transaction writes", async () => {
    mocks.membership.mockResolvedValue({ membershipStatus: "ACTIVE" });
    const startSession = vi.spyOn(WeddingModel, "startSession");
    await expect(
      createWeddingForUser("111111111111111111111111", input),
    ).rejects.toMatchObject({ code: "WEDDING_ALREADY_EXISTS" });
    expect(startSession).not.toHaveBeenCalled();
  });
});

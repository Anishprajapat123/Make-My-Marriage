import { beforeEach, describe, expect, it, vi } from "vitest";
const repo = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  family: vi.fn(),
  families: vi.fn(),
  save: vi.fn(),
  status: vi.fn(),
  saveFamily: vi.fn(),
  removeFamily: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/modules/wedding/wedding.service", () => ({
  getCurrentWeddingForUser: vi.fn(),
}));
vi.mock("@/modules/guests/guest.repository", () => ({ guestRepository: repo }));
import {
  guestInputSchema,
  guestPatchSchema,
  familyInputSchema,
  guestQuerySchema,
} from "@/modules/guests/guest.schema";
import {
  listGuests,
  saveGuest,
  saveFamily,
  changeGuestStatus,
  removeFamily,
} from "@/modules/guests/guest.service";
import type { TenantContext } from "@/lib/tenant/context";
const ctx: TenantContext = {
  tenantId: "111111111111111111111111",
  memberId: "222222222222222222222222",
  permissions: ["VIEW_GUESTS", "MANAGE_GUESTS"],
  timezone: "Asia/Kolkata",
  weddingTitle: "QA",
  memberName: "QA",
  roleKeys: ["OWNER"],
};
const id = "333333333333333333333333";
beforeEach(() => vi.resetAllMocks());
describe("guest boundary validation", () => {
  it("allows a guest with just a name", () => {
    expect(guestInputSchema.parse({ name: "Neha" })).toMatchObject({
      phone: null,
      email: null,
      familyId: null,
      guestType: "PRIMARY",
      side: "OTHER",
    });
  });
  it("normalizes shared contacts without imposing uniqueness", () => {
    const value = {
      name: "Neha",
      phone: "+91 (98765) 43210",
      email: " QA@EXAMPLE.COM ",
    };
    expect(guestInputSchema.parse(value)).toMatchObject({
      phone: "+919876543210",
      email: "qa@example.com",
    });
    expect(guestInputSchema.safeParse(value).success).toBe(true);
  });
  it("rejects national-only phone numbers", () =>
    expect(
      guestInputSchema.safeParse({ name: "QA", phone: "9876543210" }).success,
    ).toBe(false));
  it("rejects external tenant, source and lifecycle fields", () => {
    for (const extra of [
      { tenantId: id },
      { source: "IMPORT" },
      { status: "ARCHIVED" },
    ])
      expect(guestInputSchema.safeParse({ name: "QA", ...extra }).success).toBe(
        false,
      );
  });
  it("preserves absent PATCH fields", () =>
    expect(guestPatchSchema.parse({ revision: 0, notes: "Updated" })).toEqual({
      revision: 0,
      notes: "Updated",
    }));
  it("requires a revision and an actual PATCH change", () => {
    expect(guestPatchSchema.safeParse({ name: "QA" }).success).toBe(false);
    expect(guestPatchSchema.safeParse({ revision: 0 }).success).toBe(false);
  });
  it("bounds pagination and whitelists sort fields", () => {
    expect(guestQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(guestQuerySchema.safeParse({ sortBy: "tenantId" }).success).toBe(
      false,
    );
  });
  it("rejects punctuation-only names and oversized notes", () => {
    expect(familyInputSchema.safeParse({ name: "---" }).success).toBe(false);
    expect(
      guestInputSchema.safeParse({ name: "QA", notes: "x".repeat(2001) })
        .success,
    ).toBe(false);
  });
});
describe("guest service authorization and patching", () => {
  it("rejects writes before repository access for read-only users", async () => {
    await expect(
      saveGuest({ ...ctx, permissions: ["VIEW_GUESTS"] }, { name: "QA" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("scopes list reads to the resolved wedding", async () => {
    await listGuests(ctx, { search: "QA" });
    expect(repo.list).toHaveBeenCalledWith(
      ctx.tenantId,
      expect.objectContaining({ search: "QA", status: "ACTIVE" }),
    );
  });
  it("merges PATCH with existing fields without clearing contact or family", async () => {
    repo.get.mockResolvedValue({
      name: "QA",
      phone: "+919876543210",
      email: "qa@example.com",
      familyId: id,
      relationship: "Cousin",
      side: "BRIDE",
      guestType: "PRIMARY",
      notes: "Old",
    });
    await saveGuest(ctx, { revision: 4, notes: "New" }, id);
    expect(repo.save).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        phone: "+919876543210",
        familyId: id,
        revision: 4,
        notes: "New",
      }),
      id,
    );
  });
  it("preserves the primary contact in partial family edits", async () => {
    repo.family.mockResolvedValue({
      name: "QA family",
      side: "BRIDE",
      notes: "Old",
      primaryContactGuestId: id,
    });
    await saveFamily(ctx, { revision: 2, name: "New family" }, id);
    expect(repo.saveFamily).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ primaryContactGuestId: id, revision: 2 }),
      id,
    );
  });
  it("uses retained archive/restore operations", async () => {
    await changeGuestStatus(ctx, id, { revision: 0 });
    await changeGuestStatus(ctx, id, { revision: 1, action: "RESTORE" }, true);
    expect(repo.status).toHaveBeenNthCalledWith(1, ctx, id, 0, "ARCHIVED");
    expect(repo.status).toHaveBeenNthCalledWith(2, ctx, id, 1, "ACTIVE");
  });
  it("requires current family revision on deletion", () => {
    expect(() => removeFamily(ctx, id, {})).toThrow();
    expect(repo.removeFamily).not.toHaveBeenCalled();
  });
});

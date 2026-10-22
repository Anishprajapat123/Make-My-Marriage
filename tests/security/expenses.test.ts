import { describe, expect, it, vi, beforeEach } from "vitest";
const repository = vi.hoisted(() => ({
  listExpenses: vi.fn(),
  expenseSummary: vi.fn(),
  getExpense: vi.fn(),
  expenseOptions: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  archiveExpense: vi.fn(),
  recordPayment: vi.fn(),
}));
vi.mock("@/modules/expenses/expense.repository", () => repository);
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/modules/wedding/wedding.service", () => ({
  getCurrentWeddingForUser: vi.fn(),
}));
import {
  expenseInput,
  expenseCreateInput,
  expensePaymentInput,
  expenseQuery,
} from "@/modules/expenses/expense.schema";
import {
  moneyToPaise,
  paiseToMoney,
  canonicalMoney,
  formatMoney,
} from "@/modules/expenses/expense.money";
import { categoryLabel } from "@/modules/expenses/expense.types";
import * as service from "@/modules/expenses/expense.service";
import type { TenantContext } from "@/lib/tenant/context";
const id = "111111111111111111111111";
const ctx: TenantContext = {
  tenantId: id,
  memberId: "222222222222222222222222",
  permissions: ["VIEW_EXPENSES", "MANAGE_EXPENSES", "MANAGE_PAYMENTS"],
  timezone: "Asia/Kolkata",
  weddingTitle: "QA",
  memberName: "QA",
  roleKeys: ["OWNER"],
};
const input = {
  title: "Flowers",
  amount: "100.10",
  category: "Family DIY",
  financialState: "COMMITTED",
};
beforeEach(() => vi.resetAllMocks());
describe("expense exact-money and category contracts", () => {
  it("adds decimal money exactly", () =>
    expect(paiseToMoney(moneyToPaise("0.10") + moneyToPaise("0.20"))).toBe(
      "0.30",
    ));
  it("formats Indian grouping without floating conversion", () =>
    expect(formatMoney("12345678.09")).toBe("₹1,23,45,678.09"));
  it("canonicalizes a whole amount", () =>
    expect(canonicalMoney("20")).toBe("20.00"));
  it.each(["-1", "1.001", "NaN", "1e3", "01.00", "1000000000000"])(
    "rejects invalid money %s",
    (amount) =>
      expect(expenseInput.safeParse({ ...input, amount }).success).toBe(false),
  );
  it("rejects a zero expense", () =>
    expect(expenseInput.safeParse({ ...input, amount: "0" }).success).toBe(
      false,
    ));
  it("preserves and normalizes a custom category", () => {
    const result = expenseInput.parse({ ...input, category: "  Art &  DIY  " });
    expect(result.category).toBe("Art & DIY");
    expect(categoryLabel(result.category)).toBe("Art & DIY");
  });
  it("canonicalizes built-in labels", () =>
    expect(expenseInput.parse({ ...input, category: "Venue" }).category).toBe(
      "VENUE",
    ));
  it.each(["", "...", "a".repeat(81), "A\u0000B"])(
    "rejects invalid categories",
    (category) =>
      expect(expenseInput.safeParse({ ...input, category }).success).toBe(
        false,
      ),
  );
  it("accepts literal regex punctuation in a named filter", () =>
    expect(expenseQuery.parse({ category: "Art.*" }).category).toBe("Art.*"));
  it("rejects both payer sources", () =>
    expect(
      expenseInput.safeParse({
        ...input,
        paidByMemberId: id,
        paidByName: "External",
      }).success,
    ).toBe(false));
  it("rejects client tenant/payment fields", () => {
    for (const extra of [
      { tenantId: id },
      { payment: {} },
      { financialState: "PAID" },
    ])
      expect(expenseInput.safeParse({ ...input, ...extra }).success).toBe(
        false,
      );
  });
  it("requires creation idempotency", () =>
    expect(expenseCreateInput.safeParse({ expense: input }).success).toBe(
      false,
    ));
  it("requires payment revision and idempotency", () =>
    expect(
      expensePaymentInput.safeParse({
        amount: "100.10",
        paidLocal: "2026-10-01T12:00",
        method: "CASH",
      }).success,
    ).toBe(false));
});
describe("expense service permissions", () => {
  it("passes the verified context and normalized input to creation", () => {
    const requestId = "c2d18140-a824-4ddf-82e4-3c48c02df05d";
    service.create(ctx, { requestId, expense: input });
    expect(repository.createExpense).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ category: "Family DIY", amount: "100.10" }),
      requestId,
    );
  });
  it("blocks a read-only member's edits", () => {
    expect(() =>
      service.update({ ...ctx, permissions: ["VIEW_EXPENSES"] }, id, {
        revision: 0,
        expense: input,
      }),
    ).toThrow();
    expect(repository.updateExpense).not.toHaveBeenCalled();
  });
  it("requires read permission alongside write permission", () =>
    expect(() =>
      service.create(
        { ...ctx, permissions: ["MANAGE_EXPENSES"] },
        { requestId: "c2d18140-a824-4ddf-82e4-3c48c02df05d", expense: input },
      ),
    ).toThrow());
  it("blocks all financial reads without VIEW_EXPENSES", () => {
    const denied = { ...ctx, permissions: [] };
    for (const action of [
      () => service.list(denied, {}),
      () => service.summary(denied),
      () => service.detail(denied, id),
      () => service.options(denied),
    ])
      expect(action).toThrow();
  });
  it("rejects malformed IDs before database access", () => {
    expect(() => service.detail(ctx, "bad-id")).toThrow();
    expect(repository.getExpense).not.toHaveBeenCalled();
  });
  it("requires MANAGE_PAYMENTS separately", () =>
    expect(() =>
      service.payment(
        { ...ctx, permissions: ["VIEW_EXPENSES", "MANAGE_EXPENSES"] },
        id,
        {},
      ),
    ).toThrow());
});

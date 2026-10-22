import "server-only";
import { z } from "zod";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import * as repo from "./expense.repository";
import {
  expenseId,
  expenseQuery,
  expenseCreateInput,
  expenseEditInput,
  expenseRevision,
  expensePaymentInput,
} from "./expense.schema";
function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    );
  return result.data;
}
function permit(ctx: TenantContext, permission = "VIEW_EXPENSES") {
  if (
    !ctx.permissions.includes("VIEW_EXPENSES") ||
    !ctx.permissions.includes(permission)
  )
    throw new AccessError(
      403,
      "FORBIDDEN",
      "You do not have permission for this expense action.",
    );
}
function id(value: string) {
  const result = expenseId.safeParse(value);
  if (!result.success)
    throw new AccessError(404, "NOT_FOUND", "Expense not found.");
  return result.data;
}
export function list(ctx: TenantContext, query: unknown) {
  permit(ctx);
  return repo.listExpenses(ctx, parse(expenseQuery, query));
}
export function summary(ctx: TenantContext) {
  permit(ctx);
  return repo.expenseSummary(ctx);
}
export function detail(ctx: TenantContext, value: string) {
  permit(ctx);
  return repo.getExpense(ctx, id(value));
}
export function options(ctx: TenantContext) {
  permit(ctx);
  return repo.expenseOptions(ctx);
}
export function create(ctx: TenantContext, input: unknown) {
  permit(ctx, "MANAGE_EXPENSES");
  const p = parse(expenseCreateInput, input);
  return repo.createExpense(ctx, p.expense, p.requestId);
}
export function update(ctx: TenantContext, value: string, input: unknown) {
  permit(ctx, "MANAGE_EXPENSES");
  const p = parse(expenseEditInput, input);
  return repo.updateExpense(ctx, id(value), p.expense, p.revision);
}
export function archive(
  ctx: TenantContext,
  value: string,
  input: unknown,
  restore = false,
) {
  permit(ctx, "MANAGE_EXPENSES");
  const p = parse(expenseRevision, input);
  return repo.archiveExpense(ctx, id(value), p.revision, restore);
}
export function payment(ctx: TenantContext, value: string, input: unknown) {
  permit(ctx, "MANAGE_PAYMENTS");
  return repo.recordPayment(ctx, id(value), parse(expensePaymentInput, input));
}

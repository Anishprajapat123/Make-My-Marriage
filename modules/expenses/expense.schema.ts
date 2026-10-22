import { z } from "zod";
import {
  normalizeExpenseCategory,
  EXPENSE_STATES,
  PAYMENT_METHODS,
} from "./expense.types";
import { canonicalMoney, moneyToPaise } from "./expense.money";
export const expenseId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid reference.")
  .transform((v) => v.toLowerCase());
const money = z
  .string()
  .trim()
  .max(15)
  .refine((v) => {
    try {
      return moneyToPaise(v) > BigInt(0);
    } catch {
      return false;
    }
  }, "Enter a positive INR amount with at most two decimals, up to 999999999999.99.")
  .transform(canonicalMoney);
const localTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");
const category = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform(normalizeExpenseCategory)
  .refine(
    (value) =>
      /[\p{L}\p{N}]/u.test(value) && !/[\u0000-\u001f\u007f]/.test(value),
    "Enter a category containing letters or numbers.",
  );
export const expenseInput = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine((v) => /[\p{L}\p{N}]/u.test(v), "Enter an expense title."),
    category,
    amount: money,
    financialState: z.enum(["ESTIMATED", "COMMITTED"]),
    eventId: expenseId.nullable().default(null),
    vendorId: expenseId.nullable().default(null),
    paidByMemberId: expenseId.nullable().default(null),
    paidByName: z.string().trim().max(120).default(""),
    dueLocal: localTime.nullable().default(null),
    notes: z.string().trim().max(2000).default(""),
  })
  .strict()
  .refine(
    (v) => !(v.paidByMemberId && v.paidByName),
    "Choose a member or an external payer, not both.",
  );
export const expenseCreateInput = z
  .object({ requestId: z.uuid(), expense: expenseInput })
  .strict();
export const expenseEditInput = z
  .object({ revision: z.number().int().min(0), expense: expenseInput })
  .strict();
export const expenseRevision = z
  .object({ revision: z.number().int().min(0) })
  .strict();
export const expensePaymentInput = z
  .object({
    requestId: z.uuid(),
    revision: z.number().int().min(0),
    amount: money,
    paidLocal: localTime,
    method: z.enum(PAYMENT_METHODS),
    notes: z.string().trim().max(1000).default(""),
  })
  .strict();
export const expenseQuery = z
  .object({
    search: z.string().trim().max(180).default(""),
    category: category.optional(),
    financialState: z.enum(EXPENSE_STATES).optional(),
    eventId: expenseId.optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
    overdue: z.enum(["true", "false"]).default("false"),
    sort: z
      .enum(["NEWEST", "DUE", "AMOUNT_DESC", "AMOUNT_ASC", "TITLE"])
      .default("NEWEST"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export type ExpenseInput = z.infer<typeof expenseInput>;
export type ExpenseQuery = z.infer<typeof expenseQuery>;
export type ExpensePaymentInput = z.infer<typeof expensePaymentInput>;

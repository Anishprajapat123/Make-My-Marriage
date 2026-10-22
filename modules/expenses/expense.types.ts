export const EXPENSE_CATEGORIES = [
  "VENUE",
  "CATERING",
  "DECORATION",
  "PHOTOGRAPHY",
  "CLOTHES",
  "JEWELLERY",
  "INVITATIONS",
  "MAKEUP",
  "ENTERTAINMENT",
  "GIFTS",
  "MISCELLANEOUS",
] as const;
export const EXPENSE_STATES = ["ESTIMATED", "COMMITTED", "PAID"] as const;
export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;
export type ExpenseState = (typeof EXPENSE_STATES)[number];
export type ExpenseCategory = string;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type ExpenseView = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: string;
  currency: "INR";
  financialState: ExpenseState;
  status: "ACTIVE" | "ARCHIVED";
  revision: number;
  eventId: string | null;
  eventName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  paidByMemberId: string | null;
  paidByName: string;
  payerLabel: string;
  dueAt: string | null;
  notes: string;
  createdAt: string;
  payment: null | {
    amount: string;
    paidAt: string;
    method: PaymentMethod;
    notes: string;
    payerLabel: string;
    recordedAt: string;
  };
};
export type ExpenseList = {
  expenses: ExpenseView[];
  total: number;
  page: number;
  limit: number;
};
export type ExpenseSummary = {
  active: number;
  estimated: string;
  committed: string;
  paid: string;
  recorded: string;
  overdue: number;
  budget: null;
};
export type ExpenseOptions = {
  vendors: { id: string; name: string }[];
  events: { id: string; name: string }[];
  members: { id: string; name: string }[];
};
export const expenseLabel = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
export function normalizeExpenseCategory(value: string): string {
  const normalized = value.normalize("NFC").trim().replace(/\s+/g, " ");
  return (
    EXPENSE_CATEGORIES.find(
      (c) => c.toLowerCase() === normalized.toLowerCase(),
    ) ?? normalized
  );
}
export function categoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.some((c) => c === value)
    ? expenseLabel(value)
    : value;
}

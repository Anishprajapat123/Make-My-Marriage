import "server-only";
import { createHash } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { ExpenseModel as Expense, type ExpenseRecord } from "./expense.model";
import type {
  ExpenseInput,
  ExpensePaymentInput,
  ExpenseQuery,
} from "./expense.schema";
import type {
  ExpenseView,
  ExpenseList,
  ExpenseSummary,
  ExpenseOptions,
} from "./expense.types";
import { canonicalMoney } from "./expense.money";
import { EventModel } from "@/modules/events/event.model";
import { MemberModel } from "@/modules/members/member.model";
import { UserModel } from "@/modules/auth/user.model";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { appendActivity } from "@/modules/activity/activity.repository";
import { localToUtc } from "@/lib/date/time";
import { VendorModel } from "@/modules/vendors/vendor.model";
import { paiseToMoney } from "./expense.money";
import type { VendorFinancials } from "@/modules/vendors/vendor.types";

type Row = ExpenseRecord & { _id: Types.ObjectId };
export async function vendorExpenseTotals(
  ctx: TenantContext,
  vendorId: string,
): Promise<VendorFinancials> {
  if (!ctx.permissions.includes("VIEW_EXPENSES"))
    throw new AccessError(403, "FORBIDDEN", "Expense permission required.");
  const groups = await Expense.aggregate<{
    _id: string;
    total: Types.Decimal128;
    count: number;
  }>([
    {
      $match: {
        tenantId: new Types.ObjectId(ctx.tenantId),
        vendorId: new Types.ObjectId(vendorId),
        status: "ACTIVE",
      },
    },
    {
      $group: {
        _id: "$financialState",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  const total = (state: string) => {
    const value = groups.find((g) => g._id === state)?.total.toString() ?? "0";
    const [whole, fraction = ""] = value.split(".");
    return paiseToMoney(
      BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")),
    );
  };
  return {
    count: groups.reduce((n, g) => n + g.count, 0),
    estimated: total("ESTIMATED"),
    committed: total("COMMITTED"),
    paid: total("PAID"),
  };
}
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function conflict(
  message = "This expense changed. Reload before continuing.",
): never {
  throw new AccessError(409, "CONFLICT", message);
}
function notFound(): never {
  throw new AccessError(404, "NOT_FOUND", "Expense not found.");
}
function instant(value: string | null, timezone: string): Date | null {
  if (!value) return null;
  try {
    const [date, time] = value.split("T");
    return localToUtc(date, time, timezone);
  } catch (error) {
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Invalid local time.",
    );
  }
}
async function write<T>(
  ctx: TenantContext,
  permission: string,
  operation: (session: ClientSession) => Promise<T>,
) {
  await Expense.init();
  return withWeddingTransaction(ctx.tenantId, operation, {
    ctx,
    permission: ["VIEW_EXPENSES", permission],
  });
}
async function audit(
  ctx: TenantContext,
  id: string,
  action: string,
  session: ClientSession,
) {
  await appendActivity(
    {
      tenantId: ctx.tenantId,
      actorMemberId: ctx.memberId,
      resourceType: "EXPENSE",
      resourceId: id,
      action,
      summary: action.toLowerCase().replaceAll("_", " ") + ".",
    },
    session,
  );
}
async function validateReferences(
  ctx: TenantContext,
  input: ExpenseInput,
  session: ClientSession,
  previousVendorId: string | null = null,
) {
  if (input.vendorId) {
    if (ctx.roleKeys.includes("VENDOR"))
      throw new AccessError(
        403,
        "FORBIDDEN",
        "Vendor account access is not available.",
      );
    const changed = await VendorModel.collection.updateOne(
      {
        _id: new Types.ObjectId(input.vendorId),
        tenantId: new Types.ObjectId(ctx.tenantId),
        ...(input.vendorId === previousVendorId ? {} : { status: "ACTIVE" }),
      },
      { $inc: { referenceVersion: 1 } },
      { session },
    );
    if (!changed.matchedCount)
      throw new AccessError(
        400,
        "INVALID_REFERENCE",
        "Choose an active vendor from this wedding.",
      );
  }
  if (input.eventId) {
    const event = await EventModel.collection.updateOne(
      {
        _id: new Types.ObjectId(input.eventId),
        tenantId: new Types.ObjectId(ctx.tenantId),
      },
      { $inc: { referenceVersion: 1 } },
      { session },
    );
    if (!event.matchedCount)
      throw new AccessError(
        400,
        "INVALID_REFERENCE",
        "Choose an event from this wedding.",
      );
  }
  if (input.paidByMemberId) {
    const member = await MemberModel.collection.updateOne(
      {
        _id: new Types.ObjectId(input.paidByMemberId),
        tenantId: new Types.ObjectId(ctx.tenantId),
        membershipStatus: "ACTIVE",
      },
      { $inc: { accessVersion: 1 } },
      { session },
    );
    if (!member.matchedCount)
      throw new AccessError(
        400,
        "INVALID_REFERENCE",
        "Choose an active member from this wedding.",
      );
  }
}
async function labels(tenantId: string, rows: Row[]) {
  const [events, members] = await Promise.all([
    EventModel.find({
      tenantId,
      _id: { $in: rows.flatMap((r) => (r.eventId ? [r.eventId] : [])) },
    })
      .select("name")
      .lean(),
    MemberModel.find({
      tenantId,
      _id: {
        $in: rows.flatMap((r) => (r.paidByMemberId ? [r.paidByMemberId] : [])),
      },
    })
      .select("userId")
      .lean(),
  ]);
  const users = await UserModel.find({
    _id: { $in: members.map((m) => m.userId) },
  })
    .select("displayName")
    .lean();
  const names = new Map(
    users.map((u) => [String(u._id), String(u.displayName)]),
  );
  return {
    vendors: new Map(
      (
        await VendorModel.find({
          tenantId,
          _id: { $in: rows.flatMap((r) => (r.vendorId ? [r.vendorId] : [])) },
        })
          .select("name")
          .lean()
      ).map((v) => [String(v._id), v.name]),
    ),
    events: new Map(events.map((e) => [String(e._id), String(e.name)])),
    members: new Map(
      members.map((m) => [
        String(m._id),
        names.get(String(m.userId)) ?? "Former member",
      ]),
    ),
  };
}
function dto(row: Row, names: Awaited<ReturnType<typeof labels>>): ExpenseView {
  return {
    id: String(row._id),
    title: row.title,
    category: row.category,
    amount: canonicalMoney(row.amount.toString()),
    currency: "INR",
    financialState: row.financialState,
    status: row.status,
    revision: row.revision,
    eventId: row.eventId ? String(row.eventId) : null,
    eventName: row.eventId
      ? (names.events.get(String(row.eventId)) ?? "Linked event")
      : null,
    vendorId: row.vendorId ? String(row.vendorId) : null,
    vendorName: row.vendorId
      ? (names.vendors.get(String(row.vendorId)) ?? "Linked vendor")
      : null,
    paidByMemberId: row.paidByMemberId ? String(row.paidByMemberId) : null,
    paidByName: row.paidByName,
    payerLabel: row.paidByMemberId
      ? (names.members.get(String(row.paidByMemberId)) ?? "Former member")
      : row.paidByName || "Not specified",
    dueAt: row.dueAt?.toISOString() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    payment: row.payment
      ? {
          amount: canonicalMoney(row.payment.amount.toString()),
          paidAt: row.payment.paidAt.toISOString(),
          method: row.payment.method,
          notes: row.payment.notes,
          payerLabel: row.payment.payerLabel,
          recordedAt: row.payment.recordedAt.toISOString(),
        }
      : null,
  };
}
export async function listExpenses(
  ctx: TenantContext,
  q: ExpenseQuery,
): Promise<ExpenseList> {
  const filter: Record<string, unknown> = {
    tenantId: ctx.tenantId,
    status: q.status,
  };
  if (q.search)
    filter.title = {
      $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  if (q.category)
    filter.category = {
      $regex: `^${q.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    };
  if (q.financialState) filter.financialState = q.financialState;
  if (q.eventId) filter.eventId = q.eventId;
  if (q.overdue === "true") {
    filter.dueAt = { $lt: new Date() };
    filter.financialState =
      q.financialState === "PAID"
        ? { $in: [] }
        : (q.financialState ?? { $ne: "PAID" });
  }
  const sort = {
    NEWEST: { createdAt: -1 },
    DUE: { dueAt: 1 },
    AMOUNT_ASC: { amount: 1 },
    AMOUNT_DESC: { amount: -1 },
    TITLE: { title: 1 },
  }[q.sort] as Record<string, 1 | -1>;
  const [rows, total] = await Promise.all([
    Expense.find(filter)
      .sort({ ...sort, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);
  const names = await labels(ctx.tenantId, rows);
  return {
    expenses: rows.map((r) => dto(r, names)),
    total,
    page: q.page,
    limit: q.limit,
  };
}
export async function getExpense(ctx: TenantContext, id: string) {
  const row = await Expense.findOne({ tenantId: ctx.tenantId, _id: id }).lean();
  if (!row) notFound();
  return dto(row, await labels(ctx.tenantId, [row]));
}
export async function expenseSummary(
  ctx: TenantContext,
): Promise<ExpenseSummary> {
  const now = new Date();
  const groups = await Expense.aggregate<{
    _id: string;
    total: Types.Decimal128;
    count: number;
    overdue: number;
  }>([
    {
      $match: { tenantId: new Types.ObjectId(ctx.tenantId), status: "ACTIVE" },
    },
    {
      $group: {
        _id: "$financialState",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$financialState", "PAID"] },
                  { $ne: ["$dueAt", null] },
                  { $lt: ["$dueAt", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  // Group sums remain Decimal128; represent exact paise without Number coercion.
  const decimalPaise = (v: string) => {
    const [whole, fraction = ""] = v.split(".");
    return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  };
  const total = (state: string) =>
    groups.find((g) => g._id === state)?.total.toString() ?? "0.00";
  const values = [total("ESTIMATED"), total("COMMITTED"), total("PAID")];
  const all = values.reduce(
    (sum, value) => sum + decimalPaise(value),
    BigInt(0),
  );
  return {
    active: groups.reduce((sum, g) => sum + g.count, 0),
    estimated: values[0],
    committed: values[1],
    paid: values[2],
    recorded: `${all / BigInt(100)}.${String(all % BigInt(100)).padStart(2, "0")}`,
    overdue: groups.reduce((sum, g) => sum + g.overdue, 0),
    budget: null,
  };
}
export async function expenseOptions(
  ctx: TenantContext,
): Promise<ExpenseOptions> {
  const [events, members] = await Promise.all([
    EventModel.find({ tenantId: ctx.tenantId })
      .select("name")
      .sort({ startAt: 1 })
      .limit(500)
      .lean(),
    ctx.permissions.includes("MANAGE_EXPENSES")
      ? MemberModel.find({ tenantId: ctx.tenantId, membershipStatus: "ACTIVE" })
          .select("userId")
          .limit(500)
          .lean()
      : Promise.resolve([]),
  ]);
  const users = await UserModel.find({
    _id: { $in: members.map((m) => m.userId) },
  })
    .select("displayName")
    .lean();
  const names = new Map(
    users.map((u) => [String(u._id), String(u.displayName)]),
  );
  return {
    events: events.map((e) => ({ id: String(e._id), name: String(e.name) })),
    vendors:
      ctx.permissions.includes("MANAGE_EXPENSES") &&
      !ctx.roleKeys.includes("VENDOR")
        ? (
            await VendorModel.find({ tenantId: ctx.tenantId, status: "ACTIVE" })
              .select("name")
              .sort({ name: 1, _id: 1 })
              .limit(500)
              .lean()
          ).map((v) => ({ id: String(v._id), name: v.name }))
        : [],
    members: members.map((m) => ({
      id: String(m._id),
      name: names.get(String(m.userId)) ?? "Member",
    })),
  };
}
export async function createExpense(
  ctx: TenantContext,
  input: ExpenseInput,
  requestId: string,
) {
  const hash = digest(input);
  return write(ctx, "MANAGE_EXPENSES", async (session) => {
    const existing = await Expense.findOne({
      tenantId: ctx.tenantId,
      requestId,
    })
      .select("+requestHash")
      .session(session)
      .lean();
    if (existing) {
      if (existing.requestHash !== hash)
        conflict(
          "This save identifier was already used for different expense details.",
        );
      return { id: String(existing._id), saved: true };
    }
    await validateReferences(ctx, input, session);
    const { dueLocal, ...fields } = input;
    const [row] = await Expense.create(
      [
        {
          ...fields,
          amount: Types.Decimal128.fromString(input.amount),
          dueAt: instant(dueLocal, ctx.timezone),
          tenantId: ctx.tenantId,
          createdByMemberId: ctx.memberId,
          requestId,
          requestHash: hash,
        },
      ],
      { session, ordered: true },
    );
    await audit(ctx, String(row._id), "EXPENSE_CREATED", session);
    return { id: String(row._id), saved: true };
  });
}
export async function updateExpense(
  ctx: TenantContext,
  id: string,
  input: ExpenseInput,
  revision: number,
) {
  return write(ctx, "MANAGE_EXPENSES", async (session) => {
    const row = await Expense.findOne({ tenantId: ctx.tenantId, _id: id })
      .session(session)
      .lean();
    if (!row) notFound();
    if (row.revision !== revision) conflict();
    if (row.payment || row.financialState === "PAID")
      conflict("Paid expenses are protected from editing.");
    if (row.status !== "ACTIVE")
      conflict("Restore the expense before editing.");
    await validateReferences(
      ctx,
      input,
      session,
      row.vendorId ? String(row.vendorId) : null,
    );
    const { dueLocal, ...fields } = input;
    await Expense.updateOne(
      { tenantId: ctx.tenantId, _id: id, revision },
      {
        $set: {
          ...fields,
          amount: Types.Decimal128.fromString(input.amount),
          dueAt: instant(dueLocal, ctx.timezone),
        },
        $inc: { revision: 1 },
      },
      { session, runValidators: true },
    );
    await audit(ctx, id, "EXPENSE_UPDATED", session);
    return { id, saved: true };
  });
}
export async function archiveExpense(
  ctx: TenantContext,
  id: string,
  revision: number,
  restore: boolean,
) {
  return write(ctx, "MANAGE_EXPENSES", async (session) => {
    const row = await Expense.findOne({ tenantId: ctx.tenantId, _id: id })
      .session(session)
      .lean();
    if (!row) notFound();
    if (row.revision !== revision) conflict();
    if (row.payment || row.financialState === "PAID")
      conflict("Paid expenses cannot be archived or changed.");
    if (row.status !== (restore ? "ARCHIVED" : "ACTIVE")) conflict();
    await Expense.updateOne(
      { tenantId: ctx.tenantId, _id: id, revision },
      {
        $set: { status: restore ? "ACTIVE" : "ARCHIVED" },
        $inc: { revision: 1 },
      },
      { session },
    );
    await audit(
      ctx,
      id,
      restore ? "EXPENSE_RESTORED" : "EXPENSE_ARCHIVED",
      session,
    );
    return { id, saved: true };
  });
}
export async function recordPayment(
  ctx: TenantContext,
  id: string,
  input: ExpensePaymentInput,
) {
  const hash = digest(input);
  return write(ctx, "MANAGE_PAYMENTS", async (session) => {
    const row = await Expense.findOne({ tenantId: ctx.tenantId, _id: id })
      .select("+payment.requestId +payment.requestHash")
      .session(session)
      .lean();
    if (!row) notFound();
    if (row.payment?.requestId === input.requestId) {
      if (row.payment.requestHash !== hash)
        conflict(
          "This payment identifier was already used for different details.",
        );
      return { id, saved: true };
    }
    if (row.revision !== input.revision) conflict();
    if (row.payment || row.financialState === "PAID")
      conflict(
        "A payment has already been recorded. This slice does not support payment corrections.",
      );
    if (row.status !== "ACTIVE" || row.financialState !== "COMMITTED")
      conflict("Only active Committed expenses can be recorded as paid.");
    if (canonicalMoney(row.amount.toString()) !== input.amount)
      throw new AccessError(
        400,
        "VALIDATION_ERROR",
        "Record the full expense amount. Partial payments are not supported yet.",
      );
    const paidAt = instant(input.paidLocal, ctx.timezone)!;
    if (paidAt > new Date())
      throw new AccessError(
        400,
        "VALIDATION_ERROR",
        "Payment date cannot be in the future.",
      );
    let payerLabel = row.paidByName || "Not specified";
    if (row.paidByMemberId) {
      const member = await MemberModel.findOne({
        tenantId: ctx.tenantId,
        _id: row.paidByMemberId,
        membershipStatus: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!member)
        conflict(
          "The selected payer is no longer active. Edit the unpaid expense first.",
        );
      const user = await UserModel.findOne({ _id: member.userId })
        .select("displayName")
        .session(session)
        .lean();
      payerLabel = String(user?.displayName ?? "Member");
      await MemberModel.collection.updateOne(
        { _id: member._id, tenantId: new Types.ObjectId(ctx.tenantId) },
        { $inc: { accessVersion: 1 } },
        { session },
      );
    }
    const reused = await Expense.exists({
      tenantId: ctx.tenantId,
      "payment.requestId": input.requestId,
    }).session(session);
    if (reused) conflict("This payment identifier was already used.");
    await Expense.updateOne(
      { tenantId: ctx.tenantId, _id: id, revision: input.revision },
      {
        $set: {
          financialState: "PAID",
          payment: {
            amount: Types.Decimal128.fromString(input.amount),
            paidAt,
            method: input.method,
            notes: input.notes,
            payerLabel,
            recordedAt: new Date(),
            recordedByMemberId: ctx.memberId,
            requestId: input.requestId,
            requestHash: hash,
          },
        },
        $inc: { revision: 1 },
      },
      { session, runValidators: true },
    );
    await audit(ctx, id, "EXPENSE_PAYMENT_RECORDED", session);
    return { id, saved: true };
  });
}

import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { EXPENSE_STATES, PAYMENT_METHODS } from "./expense.types";
const paymentSchema = new Schema(
  {
    amount: { type: Schema.Types.Decimal128, required: true },
    paidAt: { type: Date, required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    notes: { type: String, default: "", maxlength: 1000 },
    payerLabel: { type: String, default: "Not specified", maxlength: 120 },
    recordedByMemberId: { type: Schema.Types.ObjectId, required: true },
    recordedAt: { type: Date, required: true },
    requestId: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
  },
  { _id: false },
);
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    createdByMemberId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, maxlength: 180 },
    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, enum: ["INR"], default: "INR", required: true },
    financialState: { type: String, enum: EXPENSE_STATES, required: true },
    eventId: { type: Schema.Types.ObjectId, default: null },
    vendorId: { type: Schema.Types.ObjectId, default: null },
    paidByMemberId: { type: Schema.Types.ObjectId, default: null },
    paidByName: { type: String, default: "", maxlength: 120 },
    dueAt: { type: Date, default: null },
    notes: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      required: true,
    },
    revision: { type: Number, default: 0, required: true },
    payment: { type: paymentSchema, default: null },
    requestId: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
  },
  { collection: "expenses", timestamps: true, versionKey: false },
);
schema.index({ tenantId: 1, financialState: 1, dueAt: 1 });
schema.index({ tenantId: 1, status: 1, category: 1, createdAt: -1 });
schema.index({ tenantId: 1, eventId: 1, createdAt: -1 });
schema.index(
  { tenantId: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: "string" } } },
);
schema.index(
  { tenantId: 1, "payment.requestId": 1 },
  {
    unique: true,
    partialFilterExpression: { "payment.requestId": { $type: "string" } },
  },
);
export type ExpenseRecord = InferSchemaType<typeof schema>;
export const ExpenseModel =
  (models.WeddingExpense as Model<ExpenseRecord> | undefined) ??
  model<ExpenseRecord>("WeddingExpense", schema);

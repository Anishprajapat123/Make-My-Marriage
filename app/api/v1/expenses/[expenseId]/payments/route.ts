import { expenseRequest, readJsonBody } from "@/modules/expenses/expense.http";
import { payment } from "@/modules/expenses/expense.service";
export function POST(
  request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  return expenseRequest(
    async (ctx) =>
      payment(ctx, (await params).expenseId, await readJsonBody(request)),
    "MANAGE_PAYMENTS",
  );
}

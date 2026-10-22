import { expenseRequest, readJsonBody } from "@/modules/expenses/expense.http";
import { archive } from "@/modules/expenses/expense.service";
export function POST(
  request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  return expenseRequest(
    async (ctx) =>
      archive(ctx, (await params).expenseId, await readJsonBody(request), true),
    "MANAGE_EXPENSES",
  );
}

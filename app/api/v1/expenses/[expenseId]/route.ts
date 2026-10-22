import { expenseRequest, readJsonBody } from "@/modules/expenses/expense.http";
import * as service from "@/modules/expenses/expense.service";
type Context = { params: Promise<{ expenseId: string }> };
export function GET(_: Request, { params }: Context) {
  return expenseRequest(async (ctx) =>
    service.detail(ctx, (await params).expenseId),
  );
}
export function PATCH(request: Request, { params }: Context) {
  return expenseRequest(
    async (ctx) =>
      service.update(
        ctx,
        (await params).expenseId,
        await readJsonBody(request),
      ),
    "MANAGE_EXPENSES",
  );
}
export function DELETE(request: Request, { params }: Context) {
  return expenseRequest(
    async (ctx) =>
      service.archive(
        ctx,
        (await params).expenseId,
        await readJsonBody(request),
      ),
    "MANAGE_EXPENSES",
  );
}

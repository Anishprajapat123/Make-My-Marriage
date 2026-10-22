import { expenseRequest, readJsonBody } from "@/modules/expenses/expense.http";
import * as service from "@/modules/expenses/expense.service";
export function GET(request: Request) {
  return expenseRequest((ctx) =>
    service.list(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
export function POST(request: Request) {
  return expenseRequest(
    async (ctx) => service.create(ctx, await readJsonBody(request)),
    "MANAGE_EXPENSES",
    201,
  );
}

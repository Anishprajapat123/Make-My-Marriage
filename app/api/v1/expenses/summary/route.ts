import { expenseRequest } from "@/modules/expenses/expense.http";
import { summary } from "@/modules/expenses/expense.service";
export function GET() {
  return expenseRequest(summary);
}

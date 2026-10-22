import { expenseRequest } from "@/modules/expenses/expense.http";
import { options } from "@/modules/expenses/expense.service";
export function GET() {
  return expenseRequest(options);
}

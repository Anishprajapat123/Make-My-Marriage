import { taskRequest } from "@/modules/tasks/task.http";
import { taskOptions } from "@/modules/tasks/task.service";
export const runtime = "nodejs";
export async function GET() {
  return taskRequest(taskOptions);
}

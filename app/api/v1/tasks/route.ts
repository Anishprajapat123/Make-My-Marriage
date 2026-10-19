import { taskRequest } from "@/modules/tasks/task.http";
import { listTasks, saveTask } from "@/modules/tasks/task.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return taskRequest((ctx) =>
    listTasks(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
export async function POST(request: Request) {
  return taskRequest(
    async (ctx) => ({ task: await saveTask(ctx, await readJsonBody(request)) }),
    201,
  );
}

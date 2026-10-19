import { taskRequest } from "@/modules/tasks/task.http";
import { getTask, saveTask, deleteTask } from "@/modules/tasks/task.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
type Context = { params: Promise<{ taskId: string }> };
export async function GET(_request: Request, { params }: Context) {
  return taskRequest(async (ctx) => ({
    task: await getTask(ctx, (await params).taskId),
  }));
}
export async function PATCH(request: Request, { params }: Context) {
  return taskRequest(async (ctx) => ({
    task: await saveTask(
      ctx,
      await readJsonBody(request),
      (await params).taskId,
    ),
  }));
}
export async function DELETE(request: Request, { params }: Context) {
  return taskRequest(async (ctx) => {
    const input = await readJsonBody(request);
    await deleteTask(ctx, (await params).taskId, input?.revision);
    return { deleted: true };
  });
}

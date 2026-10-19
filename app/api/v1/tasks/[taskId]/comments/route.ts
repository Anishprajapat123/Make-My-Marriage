import { taskRequest } from "@/modules/tasks/task.http";
import { listTaskComments, addTaskComment } from "@/modules/tasks/task.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
type Context = { params: Promise<{ taskId: string }> };
export async function GET(request: Request, { params }: Context) {
  return taskRequest(async (ctx) =>
    listTaskComments(
      ctx,
      (await params).taskId,
      Number(new URL(request.url).searchParams.get("page") ?? 1),
    ),
  );
}
export async function POST(request: Request, { params }: Context) {
  return taskRequest(async (ctx) => {
    await addTaskComment(
      ctx,
      (await params).taskId,
      await readJsonBody(request),
    );
    return { created: true };
  }, 201);
}

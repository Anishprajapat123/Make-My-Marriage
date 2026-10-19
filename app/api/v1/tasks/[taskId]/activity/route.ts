import { taskRequest } from "@/modules/tasks/task.http";
import { taskActivity } from "@/modules/tasks/task.service";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  return taskRequest(async (ctx) =>
    taskActivity(
      ctx,
      (await params).taskId,
      Number(new URL(request.url).searchParams.get("page") ?? 1),
    ),
  );
}

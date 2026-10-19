import { taskPageContext } from "@/modules/tasks/task.page";
import { taskPageProps } from "@/modules/tasks/task.page-props";
import { TaskDetails } from "@/modules/tasks/components/task-details";
import { TasksDenied } from "@/modules/tasks/components/task-ui";
export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const ctx = await taskPageContext();
  return ctx ? (
    <TaskDetails taskId={(await params).taskId} {...taskPageProps(ctx)} />
  ) : (
    <TasksDenied />
  );
}

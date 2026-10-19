import { taskPageContext } from "@/modules/tasks/task.page";
import { taskPageProps } from "@/modules/tasks/task.page-props";
import { TaskForm } from "@/modules/tasks/components/task-form";
import { TasksDenied } from "@/modules/tasks/components/task-ui";
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const ctx = await taskPageContext();
  return ctx ? (
    <TaskForm taskId={(await params).taskId} {...taskPageProps(ctx)} />
  ) : (
    <TasksDenied />
  );
}

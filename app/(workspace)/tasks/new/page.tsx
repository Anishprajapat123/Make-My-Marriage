import { taskPageContext } from "@/modules/tasks/task.page";
import { taskPageProps } from "@/modules/tasks/task.page-props";
import { TaskForm } from "@/modules/tasks/components/task-form";
import { TasksDenied } from "@/modules/tasks/components/task-ui";
export default async function NewTaskPage() {
  const ctx = await taskPageContext();
  return ctx ? <TaskForm {...taskPageProps(ctx)} /> : <TasksDenied />;
}

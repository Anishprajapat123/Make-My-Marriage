import { taskPageContext } from "@/modules/tasks/task.page";
import { taskPageProps } from "@/modules/tasks/task.page-props";
import { TasksScreen } from "@/modules/tasks/components/tasks-screen";
import { TasksDenied } from "@/modules/tasks/components/task-ui";
export default async function TasksPage() {
  const ctx = await taskPageContext();
  return ctx ? <TasksScreen {...taskPageProps(ctx)} /> : <TasksDenied />;
}

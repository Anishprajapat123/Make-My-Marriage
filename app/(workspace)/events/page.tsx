import { eventPageContext } from "@/modules/events/event.page";
import { EventsScreen } from "@/modules/events/components/events-screen";
export default async function EventsPage() {
  const ctx = await eventPageContext();
  return (
    <EventsScreen
      timezone={ctx.timezone}
      canManage={ctx.permissions.includes("MANAGE_EVENTS")}
      weddingTitle={ctx.weddingTitle}
      memberName={ctx.memberName}
      roleLabel={ctx.roleKeys.join(", ")}
    />
  );
}

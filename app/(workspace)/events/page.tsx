import { eventPageContext } from "@/modules/events/event.page";
import { EventsScreen } from "@/modules/events/components/events-screen";
import { EventsDenied } from "@/modules/events/components/events-denied";
export default async function EventsPage() {
  const ctx = await eventPageContext();
  if (!ctx) return <EventsDenied />;
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

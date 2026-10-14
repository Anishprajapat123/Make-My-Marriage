import { eventPageContext } from "@/modules/events/event.page";
import { EventDetails } from "@/modules/events/components/event-details";
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const ctx = await eventPageContext();
  const { eventId } = await params;
  return (
    <EventDetails
      eventId={eventId}
      timezone={ctx.timezone}
      canManage={ctx.permissions.includes("MANAGE_EVENTS")}
      weddingTitle={ctx.weddingTitle}
      memberName={ctx.memberName}
      roleLabel={ctx.roleKeys.join(", ")}
    />
  );
}

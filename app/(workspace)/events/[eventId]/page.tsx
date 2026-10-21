import { eventPageContext } from "@/modules/events/event.page";
import { EventDetails } from "@/modules/events/components/event-details";
import { EventsDenied } from "@/modules/events/components/events-denied";
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const ctx = await eventPageContext();
  if (!ctx) return <EventsDenied />;
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

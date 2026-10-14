import { eventPageContext } from "@/modules/events/event.page";
import { EventForm } from "@/modules/events/components/event-form";
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const ctx = await eventPageContext("MANAGE_EVENTS");
  const { eventId } = await params;
  return (
    <EventForm
      eventId={eventId}
      timezone={ctx.timezone}
      weddingTitle={ctx.weddingTitle}
      memberName={ctx.memberName}
      roleLabel={ctx.roleKeys.join(", ")}
    />
  );
}

import { eventPageContext } from "@/modules/events/event.page";
import { EventForm } from "@/modules/events/components/event-form";
export default async function CreateEventPage() {
  const ctx = await eventPageContext("MANAGE_EVENTS");
  return (
    <EventForm
      timezone={ctx.timezone}
      weddingTitle={ctx.weddingTitle}
      memberName={ctx.memberName}
      roleLabel={ctx.roleKeys.join(", ")}
    />
  );
}

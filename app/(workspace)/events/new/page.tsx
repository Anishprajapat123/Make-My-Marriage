import { eventPageContext } from "@/modules/events/event.page";
import { EventForm } from "@/modules/events/components/event-form";
import { EventsDenied } from "@/modules/events/components/events-denied";
export default async function CreateEventPage() {
  const ctx = await eventPageContext("MANAGE_EVENTS");
  if (!ctx) return <EventsDenied />;
  return (
    <EventForm
      timezone={ctx.timezone}
      weddingTitle={ctx.weddingTitle}
      memberName={ctx.memberName}
      roleLabel={ctx.roleKeys.join(", ")}
    />
  );
}

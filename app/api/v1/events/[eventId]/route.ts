import { eventRequest, readEventBody } from "@/modules/events/event.http";
import {
  getEvent,
  saveEvent,
  deleteEvent,
} from "@/modules/events/event.service";
type Context = { params: Promise<{ eventId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { eventId } = await params;
  return eventRequest("VIEW_EVENTS", async (ctx) => ({
    event: await getEvent(ctx, eventId),
  }));
}
export async function PATCH(request: Request, { params }: Context) {
  const { eventId } = await params;
  return eventRequest("MANAGE_EVENTS", async (ctx) => ({
    event: await saveEvent(ctx, await readEventBody(request), eventId),
  }));
}
export async function DELETE(request: Request, { params }: Context) {
  const { eventId } = await params;
  return eventRequest("MANAGE_EVENTS", async (ctx) => {
    await deleteEvent(
      ctx,
      eventId,
      new URL(request.url).searchParams.get("updatedAt") ?? "",
    );
    return { deleted: true };
  });
}

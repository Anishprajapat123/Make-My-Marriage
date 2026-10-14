import { eventRequest, readEventBody } from "@/modules/events/event.http";
import {
  saveTimelineItem,
  deleteTimelineItem,
} from "@/modules/events/event.service";
type Context = { params: Promise<{ eventId: string; itemId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const { eventId, itemId } = await params;
  return eventRequest("MANAGE_EVENTS", async (ctx) => ({
    event: await saveTimelineItem(
      ctx,
      eventId,
      await readEventBody(request),
      itemId,
    ),
  }));
}
export async function DELETE(request: Request, { params }: Context) {
  const { eventId, itemId } = await params;
  return eventRequest("MANAGE_EVENTS", async (ctx) => ({
    event: await deleteTimelineItem(
      ctx,
      eventId,
      itemId,
      new URL(request.url).searchParams.get("updatedAt") ?? "",
    ),
  }));
}

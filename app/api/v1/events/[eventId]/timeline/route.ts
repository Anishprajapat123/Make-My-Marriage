import { eventRequest, readEventBody } from "@/modules/events/event.http";
import { getEvent, saveTimelineItem } from "@/modules/events/event.service";
type Context = { params: Promise<{ eventId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { eventId } = await params;
  return eventRequest("VIEW_EVENTS", async (ctx) => ({
    items: (await getEvent(ctx, eventId)).timelineItems,
  }));
}
export async function POST(request: Request, { params }: Context) {
  const { eventId } = await params;
  return eventRequest(
    "MANAGE_EVENTS",
    async (ctx) => ({
      event: await saveTimelineItem(ctx, eventId, await readEventBody(request)),
    }),
    201,
  );
}

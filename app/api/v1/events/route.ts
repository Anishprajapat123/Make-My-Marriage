import { eventRequest, readEventBody } from "@/modules/events/event.http";
import { listEvents, saveEvent } from "@/modules/events/event.service";
export async function GET() {
  return eventRequest("VIEW_EVENTS", async (ctx) => ({
    events: await listEvents(ctx),
  }));
}
export async function POST(request: Request) {
  return eventRequest(
    "MANAGE_EVENTS",
    async (ctx) => ({
      event: await saveEvent(ctx, await readEventBody(request)),
    }),
    201,
  );
}

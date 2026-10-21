import { guestRequest } from "@/modules/guests/guest.http";
import { listGuests, saveGuest } from "@/modules/guests/guest.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return guestRequest((ctx) =>
    listGuests(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
export async function POST(request: Request) {
  return guestRequest(
    async (ctx) => saveGuest(ctx, await readJsonBody(request)),
    true,
    201,
  );
}

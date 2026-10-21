import { guestRequest } from "@/modules/guests/guest.http";
import {
  getGuest,
  saveGuest,
  changeGuestStatus,
} from "@/modules/guests/guest.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
type Context = { params: Promise<{ guestId: string }> };
export async function GET(_request: Request, { params }: Context) {
  return guestRequest(async (ctx) => ({
    guest: await getGuest(ctx, (await params).guestId),
  }));
}
export async function PATCH(request: Request, { params }: Context) {
  return guestRequest(
    async (ctx) =>
      saveGuest(ctx, await readJsonBody(request), (await params).guestId),
    true,
  );
}
export async function DELETE(request: Request, { params }: Context) {
  return guestRequest(
    async (ctx) =>
      changeGuestStatus(
        ctx,
        (await params).guestId,
        await readJsonBody(request),
      ),
    true,
  );
}

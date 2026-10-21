import { guestRequest } from "@/modules/guests/guest.http";
import { changeGuestStatus } from "@/modules/guests/guest.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ guestId: string }> },
) {
  return guestRequest(
    async (ctx) =>
      changeGuestStatus(
        ctx,
        (await params).guestId,
        await readJsonBody(request),
        true,
      ),
    true,
  );
}

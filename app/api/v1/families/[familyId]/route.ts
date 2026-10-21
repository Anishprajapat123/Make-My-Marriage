import { guestRequest } from "@/modules/guests/guest.http";
import { saveFamily, removeFamily } from "@/modules/guests/guest.service";
import { readJsonBody } from "@/lib/http/json-body";
export const runtime = "nodejs";
type Context = { params: Promise<{ familyId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  return guestRequest(
    async (ctx) =>
      saveFamily(ctx, await readJsonBody(request), (await params).familyId),
    true,
  );
}
export async function DELETE(request: Request, { params }: Context) {
  return guestRequest(
    async (ctx) =>
      removeFamily(ctx, (await params).familyId, await readJsonBody(request)),
    true,
  );
}

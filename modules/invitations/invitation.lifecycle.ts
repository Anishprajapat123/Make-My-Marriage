import "server-only";
import type { ClientSession } from "mongoose";
import { InvitationLinkModel } from "./invitation.model";
export async function revokeArchivedGuestLinks(
  tenantId: string,
  guestId: string,
  session: ClientSession,
) {
  await InvitationLinkModel.updateMany(
    { tenantId, guestId, status: "ACTIVE" },
    { $set: { status: "REVOKED" }, $inc: { revision: 1 } },
    { session },
  );
}

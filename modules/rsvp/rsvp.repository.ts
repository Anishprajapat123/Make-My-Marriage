import "server-only";
import { createHash } from "node:crypto";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { AccessError } from "@/lib/tenant/context";
import { GuestModel as Guest } from "@/modules/guests/guest.model";
import { normalizeGuestName } from "@/modules/guests/guest.repository";
import { InvitationLinkModel as Link } from "@/modules/invitations/invitation.model";
import {
  resolvePublicInvitation,
  guestTokenHash,
  unavailable,
  invitationConflict,
} from "@/modules/invitations/invitation.repository";
import { RsvpModel } from "./rsvp.model";
import { ActivityModel } from "@/modules/activity/activity.model";
import type { RsvpInput } from "@/modules/invitations/invitation.schema";
export class RsvpDuplicateError extends AccessError {
  constructor(public details: { confirmation: string }) {
    super(
      409,
      "COMPANION_REVIEW_REQUIRED",
      "Some companion names may already appear in the guest records. Confirm that these are additional people, or ask the host to check before submitting.",
    );
  }
}
export async function submitRsvp(token: string, p: RsvpInput) {
  const initial = await Link.findOne({
    tokenHash: guestTokenHash(token),
    status: "ACTIVE",
  })
    .select("tenantId")
    .lean();
  if (!initial) unavailable();
  return withWeddingTransaction(String(initial.tenantId), async (session) => {
    const { link, guest } = await resolvePublicInvitation(token, session);
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          attendance: p.attendance,
          revision: p.revision,
          companions: [...p.companions].sort((a, b) =>
            a.clientId.localeCompare(b.clientId),
          ),
        }),
      )
      .digest("hex");
    if (link.lastRequestId === p.requestId) {
      if (link.lastRequestHash !== requestHash) invitationConflict();
      return { saved: true, revision: link.rsvpRevision };
    }
    if (link.rsvpRevision !== p.revision) invitationConflict();
    const own = await Guest.find({
      tenantId: link.tenantId,
      addedByGuestId: guest._id,
      source: "GUEST_RSVP",
    })
      .select("+rsvpClientId")
      .session(session)
      .lean();
    const added = p.companions.filter(
      (c) => !own.some((g) => g.rsvpClientId === c.clientId),
    );
    if (guest.addedByGuestId && p.companions.length)
      throw new AccessError(
        400,
        "VALIDATION_ERROR",
        "Please ask the original invitee or host to add additional companions.",
      );
    if (own.length + added.length > 20)
      throw new AccessError(
        400,
        "VALIDATION_ERROR",
        "Please contact the host to make further changes to your guest party.",
      );
    for (const c of p.companions) {
      const old = own.find((g) => g.rsvpClientId === c.clientId);
      if (
        old &&
        (old.status !== "ACTIVE" ||
          old.name !== c.name ||
          old.guestType !== c.guestType)
      )
        throw new AccessError(
          409,
          "CONFLICT",
          "Guest details changed. Reload your invitation before responding.",
        );
    }
    const names = added.map((c) => normalizeGuestName(c.name));
    const matches = names.length
      ? await Guest.find({
          tenantId: link.tenantId,
          normalizedName: { $in: names },
        })
          .select("revision")
          .sort({ _id: 1 })
          .limit(51)
          .session(session)
          .lean()
      : [];
    const repeated = names.some((n, i) => names.indexOf(n) !== i);
    if (matches.length || repeated) {
      const confirmation = createHash("sha256")
        .update(
          JSON.stringify({
            requestHash,
            linkId: String(link._id),
            matches: matches.map((m) => [String(m._id), m.revision]),
          }),
        )
        .digest("hex");
      if (p.duplicateConfirmation !== confirmation)
        throw new RsvpDuplicateError({ confirmation });
    }
    const created = [];
    for (const c of added) {
      const [row] = await Guest.create(
        [
          {
            tenantId: link.tenantId,
            familyId: guest.familyId,
            name: c.name,
            normalizedName: normalizeGuestName(c.name),
            guestType: c.guestType,
            source: "GUEST_RSVP",
            side: guest.side,
            addedByGuestId: guest._id,
            rsvpClientId: c.clientId,
          },
        ],
        { session, ordered: true },
      );
      created.push(row.toObject());
    }
    const companions = [
      ...own.filter((g) => g.status === "ACTIVE"),
      ...created,
    ];
    for (const c of companions) {
      const attending =
        p.attendance === "YES" &&
        p.companions.some((i) => i.clientId === c.rsvpClientId);
      await RsvpModel.updateOne(
        { tenantId: link.tenantId, guestId: c._id },
        {
          $set: {
            response: attending ? "YES" : "NO",
            partySize: attending ? 1 : 0,
            submittedVia: "INVITATION_LINK",
            submittedAt: new Date(),
          },
        },
        { upsert: true, session },
      );
    }
    await RsvpModel.updateOne(
      { tenantId: link.tenantId, guestId: guest._id },
      {
        $set: {
          response: p.attendance,
          partySize: p.attendance === "YES" ? 1 + p.companions.length : 0,
          submittedVia: "INVITATION_LINK",
          submittedAt: new Date(),
        },
      },
      { upsert: true, session },
    );
    await Link.updateOne(
      {
        tenantId: link.tenantId,
        _id: link._id,
        tokenHash: guestTokenHash(token),
        status: "ACTIVE",
      },
      {
        $set: {
          lastRequestId: p.requestId,
          lastRequestHash: requestHash,
          lastRsvpAt: new Date(),
        },
        $inc: { revision: 1, rsvpRevision: 1 },
      },
      { session },
    );
    await ActivityModel.create(
      [
        {
          tenantId: link.tenantId,
          actorMemberId: null,
          actorGuestId: guest._id,
          resourceType: "RSVP",
          resourceId: guest._id,
          action: "RSVP_SUBMITTED",
          summary: "Guest updated their RSVP.",
        },
      ],
      { session, ordered: true },
    );
    return { saved: true, revision: link.rsvpRevision + 1 };
  });
}

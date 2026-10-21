import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import {
  InvitationModel as Config,
  InvitationLinkModel as Link,
} from "./invitation.model";
import { GuestModel as Guest } from "@/modules/guests/guest.model";
import { RsvpModel } from "@/modules/rsvp/rsvp.model";
import { WeddingModel } from "@/modules/wedding/wedding.model";
import { EventModel } from "@/modules/events/event.model";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { appendActivity } from "@/modules/activity/activity.repository";
import type {
  InvitationConfig,
  InvitationList,
  PublicInvitation,
} from "./invitation.types";
import type { z } from "zod";
import type {
  invitationConfigSchema,
  guestLinkSchema,
  invitationQuerySchema,
} from "./invitation.schema";
export const guestTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function unavailable(): never {
  throw new AccessError(
    410,
    "INVITATION_UNAVAILABLE",
    "This invitation is unavailable. Please contact the wedding host for a new link.",
  );
}
export function invitationConflict(): never {
  throw new AccessError(
    409,
    "CONFLICT",
    "This invitation changed. Reload before continuing.",
  );
}
async function audit(
  ctx: TenantContext,
  resourceId: string,
  action: string,
  session: ClientSession,
) {
  await appendActivity(
    {
      tenantId: ctx.tenantId,
      actorMemberId: ctx.memberId,
      resourceType: "INVITATION",
      resourceId,
      action,
      summary: action.toLowerCase().replaceAll("_", " ") + ".",
    },
    session,
  );
}
export async function invitationConfig(
  tenantId: string,
): Promise<InvitationConfig | null> {
  const row = await Config.findOne({ tenantId }).lean();
  return row
    ? {
        id: String(row._id),
        title: row.title,
        welcomeMessage: row.welcomeMessage,
        story: row.story,
        language: row.language,
        published: row.published,
        revision: row.revision,
      }
    : null;
}
export async function saveInvitation(
  ctx: TenantContext,
  p: z.infer<typeof invitationConfigSchema>,
) {
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const existing = await Config.findOne({ tenantId: ctx.tenantId })
        .session(session)
        .lean();
      if (
        (existing && p.revision !== existing.revision) ||
        (!existing && p.revision !== null)
      )
        invitationConflict();
      const { revision, ...fields } = p;
      let id: string;
      if (existing) {
        await Config.updateOne(
          { tenantId: ctx.tenantId, _id: existing._id, revision },
          {
            $set: {
              ...fields,
              publishedAt: p.published
                ? (existing.publishedAt ?? new Date())
                : null,
            },
            $inc: { revision: 1 },
          },
          { session, runValidators: true },
        );
        id = String(existing._id);
      } else {
        const [created] = await Config.create(
          [
            {
              ...fields,
              tenantId: ctx.tenantId,
              publishedAt: p.published ? new Date() : null,
            },
          ],
          { session, ordered: true },
        );
        id = String(created._id);
      }
      await audit(
        ctx,
        id,
        p.published ? "INVITATION_PUBLISHED" : "INVITATION_SAVED",
        session,
      );
      return { saved: true };
    },
    { ctx, permission: "MANAGE_INVITATIONS" },
  );
}
export async function issueGuestLink(
  ctx: TenantContext,
  p: z.infer<typeof guestLinkSchema>,
) {
  const base = process.env.APP_BASE_URL;
  if (!base)
    throw new AccessError(
      503,
      "SERVICE_UNAVAILABLE",
      "Application URL is not configured.",
    );
  const token = randomBytes(32).toString("base64url");
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const config = await Config.findOne({ tenantId: ctx.tenantId })
        .session(session)
        .lean();
      if (!config)
        throw new AccessError(
          409,
          "CONFIGURATION_REQUIRED",
          "Save the invitation content first.",
        );
      const guest = await Guest.findOne({
        tenantId: ctx.tenantId,
        _id: p.guestId,
        status: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!guest)
        throw new AccessError(404, "NOT_FOUND", "Active guest not found.");
      const old = await Link.findOne({
        tenantId: ctx.tenantId,
        guestId: guest._id,
      })
        .session(session)
        .lean();
      if (old ? p.revision !== old.revision : p.revision !== null)
        invitationConflict();
      if (p.action === "ISSUE" && old)
        throw new AccessError(
          409,
          "LINK_EXISTS",
          "This guest already has a link record. Replace it explicitly to invalidate the previous link.",
        );
      if (p.action !== "ISSUE" && !old) invitationConflict();
      if (p.action === "REVOKE") {
        await Link.updateOne(
          { tenantId: ctx.tenantId, _id: old!._id },
          { $set: { status: "REVOKED" }, $inc: { revision: 1 } },
          { session },
        );
        await audit(ctx, String(old!._id), "GUEST_LINK_REVOKED", session);
        return { revoked: true };
      }
      let id: string;
      if (old) {
        await Link.updateOne(
          { tenantId: ctx.tenantId, _id: old._id },
          {
            $set: {
              tokenHash: guestTokenHash(token),
              status: "ACTIVE",
              lastAccessedAt: null,
              lastRequestId: null,
              lastRequestHash: null,
            },
            $inc: { revision: 1 },
          },
          { session },
        );
        id = String(old._id);
      } else {
        const [link] = await Link.create(
          [
            {
              tenantId: ctx.tenantId,
              invitationId: config._id,
              guestId: guest._id,
              tokenHash: guestTokenHash(token),
            },
          ],
          { session, ordered: true },
        );
        id = String(link._id);
      }
      await RsvpModel.updateOne(
        { tenantId: ctx.tenantId, guestId: guest._id },
        {
          $setOnInsert: {
            response: "PENDING",
            partySize: 0,
            submittedVia: "INVITATION_LINK",
          },
        },
        { upsert: true, session },
      );
      await audit(
        ctx,
        id,
        old ? "GUEST_LINK_REPLACED" : "GUEST_LINK_CREATED",
        session,
      );
      return {
        url: new URL(`/invite/${token}`, base).toString(),
        published: config.published,
        message: config.published
          ? "Copy this link now and share it privately. No email has been sent."
          : "Link created. Publish the invitation before sharing. Copy this link now; it cannot be retrieved later.",
      };
    },
    { ctx, permission: "MANAGE_INVITATIONS" },
  );
}
export async function invitationRows(
  ctx: TenantContext,
  q: z.infer<typeof invitationQuerySchema>,
): Promise<InvitationList> {
  const canRsvp = ctx.permissions.includes("VIEW_RSVP");
  if (q.status !== "ALL" && !canRsvp)
    throw new AccessError(
      403,
      "FORBIDDEN",
      "RSVP viewing permission is required.",
    );
  const filter = [
    ...(q.search
      ? [
          {
            $match: {
              name: {
                $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
              },
            },
          },
        ]
      : []),
    ...(q.status !== "ALL" ? [{ $match: { response: q.status } }] : []),
  ];
  const [result] = await Guest.aggregate([
    {
      $match: { tenantId: new Types.ObjectId(ctx.tenantId), status: "ACTIVE" },
    },
    {
      $lookup: {
        from: "invitation_links",
        let: { g: "$_id", t: "$tenantId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$guestId", "$$g"] },
                  { $eq: ["$tenantId", "$$t"] },
                ],
              },
            },
          },
          { $project: { _id: 1, status: 1, revision: 1, lastRsvpAt: 1 } },
        ],
        as: "links",
      },
    },
    {
      $lookup: {
        from: "rsvps",
        let: { g: "$_id", t: "$tenantId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$guestId", "$$g"] },
                  { $eq: ["$tenantId", "$$t"] },
                ],
              },
            },
          },
          { $project: { response: 1 } },
        ],
        as: "rsvps",
      },
    },
    {
      $lookup: {
        from: "guest_families",
        let: { g: "$familyId", t: "$tenantId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$g"] }, { $eq: ["$tenantId", "$$t"] }],
              },
            },
          },
          { $project: { name: 1 } },
        ],
        as: "family",
      },
    },
    {
      $set: {
        link: { $arrayElemAt: ["$links", 0] },
        response: {
          $ifNull: [{ $arrayElemAt: ["$rsvps.response", 0] }, "PENDING"],
        },
        familyName: { $ifNull: [{ $arrayElemAt: ["$family.name", 0] }, null] },
      },
    },
    {
      $facet: {
        rows: [
          ...filter,
          { $sort: { normalizedName: 1, _id: 1 } },
          { $skip: (q.page - 1) * q.limit },
          { $limit: q.limit },
          {
            $project: {
              _id: 1,
              name: 1,
              familyName: 1,
              status: 1,
              link: 1,
              response: 1,
            },
          },
        ],
        total: [...filter, { $count: "n" }],
        counts: [
          {
            $group: {
              _id: null,
              active: { $sum: 1 },
              yes: { $sum: { $cond: [{ $eq: ["$response", "YES"] }, 1, 0] } },
              no: { $sum: { $cond: [{ $eq: ["$response", "NO"] }, 1, 0] } },
              pending: {
                $sum: { $cond: [{ $eq: ["$response", "PENDING"] }, 1, 0] },
              },
              linked: {
                $sum: { $cond: [{ $eq: ["$link.status", "ACTIVE"] }, 1, 0] },
              },
            },
          },
        ],
      },
    },
  ]);
  const rows = (result?.rows ?? []) as {
    _id: Types.ObjectId;
    name: string;
    familyName: string | null;
    status: string;
    response: "YES" | "NO" | "PENDING";
    link?: {
      _id: Types.ObjectId;
      status: "ACTIVE" | "REVOKED";
      revision: number;
      lastRsvpAt?: Date | null;
    };
  }[];
  const counts = result?.counts[0] ?? {
    active: 0,
    yes: 0,
    no: 0,
    pending: 0,
    linked: 0,
  };
  return {
    rows: rows.map((r) => ({
      guestId: String(r._id),
      name: r.name,
      familyName: r.familyName,
      guestStatus: r.status,
      linkId: r.link ? String(r.link._id) : null,
      linkStatus: r.link?.status ?? null,
      revision: r.link?.revision ?? null,
      lastRsvpAt:
        canRsvp && r.link?.lastRsvpAt
          ? new Date(r.link.lastRsvpAt).toISOString()
          : null,
      response: canRsvp ? r.response : null,
    })),
    total: result?.total[0]?.n ?? 0,
    page: q.page,
    limit: q.limit,
    counts: {
      active: counts.active,
      linked: counts.linked,
      yes: canRsvp ? counts.yes : 0,
      no: canRsvp ? counts.no : 0,
      pending: canRsvp ? counts.pending : 0,
    },
  };
}
export async function resolvePublicInvitation(
  token: string,
  session?: ClientSession,
) {
  const hash = guestTokenHash(token);
  const link = await Link.findOne({ tokenHash: hash, status: "ACTIVE" })
    .select("+lastRequestId +lastRequestHash")
    .session(session ?? null)
    .lean();
  if (!link) unavailable();
  const config = await Config.findOne({
    tenantId: link.tenantId,
    _id: link.invitationId,
    published: true,
  })
    .session(session ?? null)
    .lean();
  const guest = await Guest.findOne({
    tenantId: link.tenantId,
    _id: link.guestId,
    status: "ACTIVE",
  })
    .session(session ?? null)
    .lean();
  const wedding = await WeddingModel.findOne({
    _id: link.tenantId,
    "settings.publicWeddingPageEnabled": true,
  })
    .session(session ?? null)
    .lean();
  if (!config || !guest || !wedding) unavailable();
  return { link, config, guest, wedding };
}
export async function publicInvitation(
  token: string,
): Promise<PublicInvitation> {
  const { link, config, guest, wedding } = await resolvePublicInvitation(token);
  const [events, rsvp, companions] = await Promise.all([
    EventModel.find({ tenantId: link.tenantId, status: "PUBLISHED" })
      .select("name description startAt endAt dressCode venue")
      .sort({ startAt: 1, _id: 1 })
      .lean(),
    RsvpModel.findOne({
      tenantId: link.tenantId,
      guestId: link.guestId,
    }).lean(),
    Guest.find({
      tenantId: link.tenantId,
      addedByGuestId: link.guestId,
      source: "GUEST_RSVP",
      status: "ACTIVE",
    })
      .select("name guestType +rsvpClientId")
      .sort({ createdAt: 1, _id: 1 })
      .limit(100)
      .lean(),
  ]);
  const responses = await RsvpModel.find({
    tenantId: link.tenantId,
    guestId: { $in: companions.map((c) => c._id) },
  })
    .select("guestId response")
    .lean();
  await Link.updateOne(
    {
      _id: link._id,
      tenantId: link.tenantId,
      tokenHash: guestTokenHash(token),
      status: "ACTIVE",
    },
    { $set: { lastAccessedAt: new Date() } },
  );
  return {
    wedding: {
      title: String(wedding.title),
      bride: String(wedding.bride?.name ?? ""),
      groom: String(wedding.groom?.name ?? ""),
      city: String(wedding.city),
      date: new Date(wedding.weddingDate).toISOString().slice(0, 10),
      timezone: String(wedding.timezone),
    },
    invitation: {
      title: config.title,
      welcomeMessage: config.welcomeMessage,
      story: config.story,
      language: config.language,
    },
    guest: { name: guest.name },
    events: events.map((e) => ({
      id: String(e._id),
      name: String(e.name),
      description: String(e.description ?? ""),
      startAt: new Date(e.startAt).toISOString(),
      endAt: e.endAt ? new Date(e.endAt).toISOString() : null,
      dressCode: String(e.dressCode ?? ""),
      venue: {
        name: String(e.venue?.name ?? ""),
        addressLine1: String(e.venue?.addressLine1 ?? ""),
        city: String(e.venue?.city ?? ""),
        mapUrl: String(e.venue?.mapUrl ?? ""),
        directions: String(e.venue?.directions ?? ""),
      },
    })),
    rsvp: {
      canAddCompanions: !guest.addedByGuestId,
      response: rsvp?.response ?? "PENDING",
      revision: link.rsvpRevision,
      companions: companions
        .filter((c) => c.rsvpClientId)
        .map((c) => ({
          clientId: c.rsvpClientId!,
          name: c.name,
          guestType: c.guestType === "CHILD" ? "CHILD" : "COMPANION",
          attending: responses.some(
            (r) => String(r.guestId) === String(c._id) && r.response === "YES",
          ),
        })),
    },
  };
}

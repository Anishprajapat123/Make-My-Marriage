import "server-only";
import { z } from "zod";
import { Types } from "mongoose";
import { LivestreamModel as Stream } from "./livestream.model";
import { EventModel } from "@/modules/events/event.model";
import { WeddingModel } from "@/modules/wedding/wedding.model";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { appendActivity } from "@/modules/activity/activity.repository";
function youtubeId(value: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    const host = u.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
    ) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/live/")) id = u.pathname.slice(6);
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
const schema = z
  .object({
    eventId: z.string().regex(/^[a-f\d]{24}$/i),
    title: z.string().trim().min(1).max(160),
    url: z.string().max(500),
    status: z.enum(["SCHEDULED", "LIVE", "ENDED", "DISABLED"]),
    isPublic: z.boolean(),
    revision: z.number().int().min(0).nullable(),
  })
  .strict();
export async function listLivestreams(ctx: TenantContext) {
  if (!ctx.permissions.includes("VIEW_LIVESTREAM"))
    throw new AccessError(403, "FORBIDDEN", "Livestream access is restricted.");
  const rows = await Stream.find({ tenantId: ctx.tenantId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const events = await EventModel.find({
    tenantId: ctx.tenantId,
    ...(ctx.permissions.includes("MANAGE_LIVESTREAM")
      ? {}
      : { _id: { $in: rows.map((s) => s.eventId) } }),
  })
    .select("name status")
    .limit(500)
    .lean();
  const wedding = await WeddingModel.findOne({ _id: ctx.tenantId })
    .select(
      "publicPagePublishedAt settings.publicWeddingPageEnabled settings.publicLivestreamEnabled",
    )
    .lean();
  return {
    streams: rows.map((s) => ({
      id: String(s._id),
      eventId: String(s.eventId),
      title: s.title,
      url: `https://www.youtube.com/watch?v=${s.videoId}`,
      status: s.status,
      isPublic: s.isPublic,
      revision: s.revision,
      publiclyVisible: Boolean(
        wedding?.publicPagePublishedAt &&
        wedding.settings?.publicWeddingPageEnabled &&
        wedding.settings?.publicLivestreamEnabled &&
        s.isPublic &&
        s.status !== "DISABLED" &&
        events.some(
          (e) =>
            String(e._id) === String(s.eventId) && e.status === "PUBLISHED",
        ),
      ),
    })),
    events: events.map((e) => ({ id: String(e._id), name: String(e.name) })),
  };
}
export async function saveLivestream(ctx: TenantContext, input: unknown) {
  const p = schema.safeParse(input);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Check the livestream fields.",
    );
  const videoId = youtubeId(p.data.url);
  if (!videoId)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Enter an HTTPS YouTube watch, live or youtu.be video link.",
    );
  await Stream.init();
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const event = await EventModel.collection.updateOne(
        {
          _id: new Types.ObjectId(p.data.eventId),
          tenantId: new Types.ObjectId(ctx.tenantId),
        },
        { $inc: { referenceVersion: 1 } },
        { session },
      );
      if (!event.matchedCount)
        throw new AccessError(
          400,
          "INVALID_REFERENCE",
          "Choose an event in this wedding.",
        );
      const values = {
        title: p.data.title,
        videoId,
        status: p.data.status,
        isPublic: p.data.isPublic,
      };
      let record;
      if (p.data.revision === null) {
        if (
          await Stream.exists({
            tenantId: ctx.tenantId,
            eventId: p.data.eventId,
          }).session(session)
        )
          throw new AccessError(
            409,
            "CONFLICT",
            "This event already has a livestream. Reload and edit it.",
          );
        [record] = await Stream.create(
          [
            {
              ...values,
              tenantId: ctx.tenantId,
              eventId: p.data.eventId,
              createdByMemberId: ctx.memberId,
            },
          ],
          { session, ordered: true },
        );
      } else {
        record = await Stream.findOneAndUpdate(
          {
            tenantId: ctx.tenantId,
            eventId: p.data.eventId,
            revision: p.data.revision,
          },
          { $set: values, $inc: { revision: 1 } },
          { session, new: true },
        );
        if (!record)
          throw new AccessError(
            409,
            "STALE_EDIT",
            "Livestream changed. Reload before saving.",
          );
      }
      await appendActivity(
        {
          tenantId: ctx.tenantId,
          actorMemberId: ctx.memberId,
          resourceType: "LIVESTREAM",
          resourceId: String(record._id),
          action: "LIVESTREAM_SAVED",
          summary: "Updated an external livestream.",
        },
        session,
      );
      return { id: String(record._id) };
    },
    { ctx, permission: ["VIEW_LIVESTREAM", "MANAGE_LIVESTREAM"] },
  );
}

import "server-only";
import { z } from "zod";
import { WeddingModel } from "./wedding.model";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import { appendActivity } from "@/modules/activity/activity.repository";
export async function weddingSettings(ctx: TenantContext) {
  const w = await WeddingModel.findOne({ _id: ctx.tenantId })
    .select(
      "title bride.name groom.name city description hashtag weddingDate timezone slug revision settings publicPagePublishedAt",
    )
    .lean();
  if (!w) throw new AccessError(404, "NOT_FOUND", "Wedding not found.");
  return {
    title: w.title,
    brideName: w.bride.name,
    groomName: w.groom.name,
    city: w.city,
    description: w.description ?? "",
    hashtag: w.hashtag ?? "",
    weddingDate: w.weddingDate.toISOString().slice(0, 10),
    timezone: w.timezone,
    slug: w.slug,
    revision: w.revision ?? 0,
    published: Boolean(
      w.publicPagePublishedAt && w.settings?.publicWeddingPageEnabled,
    ),
    publicGallery: Boolean(
      w.publicPagePublishedAt && w.settings?.publicGalleryEnabled,
    ),
    publicLivestream: Boolean(
      w.publicPagePublishedAt && w.settings?.publicLivestreamEnabled,
    ),
  };
}
const schema = z
  .object({
    revision: z.number().int().min(0),
    title: z.string().trim().min(2).max(160),
    brideName: z.string().trim().min(2).max(120),
    groomName: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000),
    hashtag: z.string().trim().max(80),
    published: z.boolean(),
    publicGallery: z.boolean(),
    publicLivestream: z.boolean(),
  })
  .strict();
export async function updateWeddingSettings(
  ctx: TenantContext,
  input: unknown,
) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Check the required names, title, city and field lengths.",
    );
  const p = parsed.data;
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const w = await WeddingModel.findOneAndUpdate(
        {
          _id: ctx.tenantId,
          ...(p.revision === 0
            ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
            : { revision: p.revision }),
        },
        {
          $set: {
            title: p.title,
            "bride.name": p.brideName,
            "groom.name": p.groomName,
            city: p.city,
            description: p.description,
            hashtag: p.hashtag,
            publicPagePublishedAt: p.published ? new Date() : null,
            "settings.publicWeddingPageEnabled": p.published,
            "settings.publicGalleryEnabled": p.publicGallery,
            "settings.publicLivestreamEnabled": p.publicLivestream,
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      ).lean();
      if (!w)
        throw new AccessError(
          409,
          "STALE_EDIT",
          "Wedding settings changed. Reload before saving again.",
        );
      await appendActivity(
        {
          tenantId: ctx.tenantId,
          actorMemberId: ctx.memberId,
          resourceType: "WEDDING",
          resourceId: ctx.tenantId,
          action: "WEDDING_SETTINGS_UPDATED",
          summary: "Updated wedding settings.",
        },
        session,
      );
      return { revision: w.revision };
    },
    { ctx, permission: ["VIEW_WEDDING", "MANAGE_WEDDING"] },
  );
}

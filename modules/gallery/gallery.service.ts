import "server-only";
import { z } from "zod";
import { Types } from "mongoose";
import { AlbumModel as Album, PhotoModel as Photo } from "./gallery.model";
import { EventModel } from "@/modules/events/event.model";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { withWeddingTransaction } from "@/lib/db/wedding-transaction";
import {
  requireFreePhotoCapacity,
  uploadDemoPhoto,
  photoStorageConfigured,
  destroyDemoPhoto,
} from "@/lib/storage/cloudinary";
import { appendActivity } from "@/modules/activity/activity.repository";
const id = z.string().regex(/^[a-f\d]{24}$/i);
function valid(value: string) {
  if (!id.safeParse(value).success)
    throw new AccessError(404, "NOT_FOUND", "Album not found.");
  return value;
}
function permit(ctx: TenantContext, key = "VIEW_GALLERY") {
  if (
    !ctx.permissions.includes("VIEW_GALLERY") ||
    !ctx.permissions.includes(key)
  )
    throw new AccessError(403, "FORBIDDEN", "Gallery access is restricted.");
}
export async function listGallery(ctx: TenantContext, albumId?: string) {
  permit(ctx);
  const albums = await Album.find({ tenantId: ctx.tenantId, status: "ACTIVE" })
    .select("name eventId revision")
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();
  if (albumId && !albums.some((a) => String(a._id) === valid(albumId)))
    throw new AccessError(404, "NOT_FOUND", "Album not found.");
  const selected = albumId ?? (albums[0] ? String(albums[0]._id) : null);
  const photos = selected
    ? await Photo.find({
        tenantId: ctx.tenantId,
        albumId: selected,
        status: "READY",
      })
        .select("original optimized thumbnail width height bytes createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .lean()
    : [];
  const events = ctx.permissions.includes("MANAGE_ALBUMS")
    ? await EventModel.find({ tenantId: ctx.tenantId })
        .select("name")
        .limit(500)
        .lean()
    : [];
  return {
    albums: albums.map((a) => ({ id: String(a._id), name: a.name })),
    selected,
    photos: photos.map((p) => ({
      id: String(p._id),
      original: p.original,
      optimized: p.optimized,
      thumbnail: p.thumbnail,
      width: p.width,
      height: p.height,
      bytes: p.bytes,
    })),
    events: events.map((e) => ({ id: String(e._id), name: String(e.name) })),
    storageConfigured: photoStorageConfigured(),
    usedSlots: await Photo.countDocuments({
      tenantId: ctx.tenantId,
      status: { $ne: "DELETED" },
    }),
    uploads:
      ctx.permissions.includes("MANAGE_ALBUMS") && selected
        ? (
            await Photo.find({
              tenantId: ctx.tenantId,
              albumId: selected,
              status: {
                $in: ["FAILED", "DELETE_FAILED", "UPLOADING", "DELETING"],
              },
            })
              .select("status updatedAt")
              .limit(20)
              .lean()
          ).map((p) => ({
            id: String(p._id),
            status: p.status,
            removable:
              (p.status !== "UPLOADING" && p.status !== "DELETING") ||
              Date.now() - p.updatedAt.getTime() > 120000,
          }))
        : [],
  };
}
export async function createAlbum(ctx: TenantContext, input: unknown) {
  permit(ctx, "MANAGE_ALBUMS");
  const p = z
    .object({ eventId: id, name: z.string().trim().min(1).max(160) })
    .strict()
    .safeParse(input);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Choose an event and album name.",
    );
  await Album.init();
  return withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const existing = await Album.findOne({
        tenantId: ctx.tenantId,
        eventId: p.data.eventId,
      })
        .session(session)
        .lean();
      if (existing) return { id: String(existing._id) };
      const event = await EventModel.collection.updateOne(
        {
          tenantId: new Types.ObjectId(ctx.tenantId),
          _id: new Types.ObjectId(p.data.eventId),
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
      const [a] = await Album.create([{ ...p.data, tenantId: ctx.tenantId }], {
        session,
        ordered: true,
      });
      return { id: String(a._id) };
    },
    { ctx, permission: ["VIEW_GALLERY", "MANAGE_ALBUMS"] },
  );
}
export async function uploadPhoto(
  ctx: TenantContext,
  albumId: string,
  file: File,
) {
  permit(ctx, "UPLOAD_PHOTOS");
  valid(albumId);
  await requireFreePhotoCapacity();
  await Photo.init();
  const photoId = new Types.ObjectId(),
    publicId = `make-my-marriage/${ctx.tenantId}/${albumId}/${photoId}`;
  await withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const album = await Album.findOne({
        tenantId: ctx.tenantId,
        _id: albumId,
        status: "ACTIVE",
      })
        .session(session)
        .lean();
      if (!album) throw new AccessError(404, "NOT_FOUND", "Album not found.");
      const reserved = await Photo.countDocuments({
        tenantId: ctx.tenantId,
        status: { $ne: "DELETED" },
      }).session(session);
      if (reserved >= 20)
        throw new AccessError(
          409,
          "DEMO_LIMIT",
          "This wedding has reached the 20-photo demo limit, including upload attempts. Ask the administrator to review failed uploads.",
        );
      await Photo.create(
        [
          {
            _id: photoId,
            tenantId: ctx.tenantId,
            albumId,
            eventId: album.eventId,
            uploadedByMemberId: ctx.memberId,
            publicId,
            status: "UPLOADING",
          },
        ],
        { session, ordered: true },
      );
    },
    { ctx, permission: ["VIEW_GALLERY", "UPLOAD_PHOTOS"] },
  );
  try {
    const stored = await uploadDemoPhoto(file, publicId);
    await withWeddingTransaction(
      ctx.tenantId,
      async (session) => {
        if (
          !(await Album.exists({
            tenantId: ctx.tenantId,
            _id: albumId,
            status: "ACTIVE",
          }).session(session))
        )
          throw new AccessError(409, "CONFLICT", "Album is no longer active.");
        const completed = await Photo.updateOne(
          { tenantId: ctx.tenantId, _id: photoId, status: "UPLOADING" },
          { $set: { ...stored, status: "READY" } },
          { session },
        );
        if (!completed.modifiedCount)
          throw new AccessError(
            409,
            "CONFLICT",
            "Upload is no longer pending.",
          );
        await appendActivity(
          {
            tenantId: ctx.tenantId,
            actorMemberId: ctx.memberId,
            resourceType: "PHOTO",
            resourceId: String(photoId),
            action: "PHOTO_UPLOADED",
            summary: "Uploaded a gallery photo.",
          },
          session,
        );
      },
      { ctx, permission: ["VIEW_GALLERY", "UPLOAD_PHOTOS"] },
    );
    return { id: String(photoId) };
  } catch (error) {
    await Photo.updateOne(
      { tenantId: ctx.tenantId, _id: photoId, status: "UPLOADING" },
      { $set: { status: "FAILED" } },
    );
    throw error;
  }
}
export async function removePhoto(ctx: TenantContext, photoId: string) {
  permit(ctx, "MANAGE_ALBUMS");
  valid(photoId);
  const publicId = await withWeddingTransaction(
    ctx.tenantId,
    async (session) => {
      const p = await Photo.findOne({ tenantId: ctx.tenantId, _id: photoId })
        .select("+publicId")
        .session(session)
        .lean();
      if (!p) throw new AccessError(404, "NOT_FOUND", "Photo not found.");
      if (p.status === "DELETED") return null;
      if (
        ["UPLOADING", "DELETING"].includes(p.status) &&
        Date.now() - p.updatedAt.getTime() < 120000
      )
        throw new AccessError(
          409,
          "BUSY",
          "This photo is still processing. Wait two minutes before retrying cleanup.",
        );
      await Photo.updateOne(
        { tenantId: ctx.tenantId, _id: photoId },
        { $set: { status: "DELETING" } },
        { session },
      );
      return p.publicId;
    },
    { ctx, permission: ["VIEW_GALLERY", "MANAGE_ALBUMS"] },
  );
  if (!publicId) return { removed: true };
  try {
    await destroyDemoPhoto(publicId);
    await withWeddingTransaction(
      ctx.tenantId,
      async (session) => {
        await Photo.updateOne(
          { tenantId: ctx.tenantId, _id: photoId, status: "DELETING" },
          {
            $set: {
              status: "DELETED",
              original: "",
              optimized: "",
              thumbnail: "",
            },
          },
          { session },
        );
        await appendActivity(
          {
            tenantId: ctx.tenantId,
            actorMemberId: ctx.memberId,
            resourceType: "PHOTO",
            resourceId: photoId,
            action: "PHOTO_REMOVED",
            summary: "Removed a gallery photo.",
          },
          session,
        );
      },
      { ctx, permission: ["VIEW_GALLERY", "MANAGE_ALBUMS"] },
    );
    return { removed: true };
  } catch (error) {
    await Photo.updateOne(
      { tenantId: ctx.tenantId, _id: photoId, status: "DELETING" },
      { $set: { status: "DELETE_FAILED" } },
    );
    throw error;
  }
}

import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { WeddingModel } from "./wedding.model";
import { EventModel } from "@/modules/events/event.model";
import { AlbumModel, PhotoModel } from "@/modules/gallery/gallery.model";
import { LivestreamModel } from "@/modules/livestream/livestream.model";
export async function publicWedding(slug: string) {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return null;
  await connectToDatabase();
  const w = await WeddingModel.findOne({
    slug,
    publicPagePublishedAt: { $type: "date" },
    "settings.publicWeddingPageEnabled": true,
  })
    .select(
      "title bride.name groom.name description city weddingDate timezone hashtag settings.publicGalleryEnabled settings.publicLivestreamEnabled",
    )
    .lean();
  if (!w) return null;
  const events = await EventModel.find({ tenantId: w._id, status: "PUBLISHED" })
    .select(
      "name startAt endAt venue.name venue.addressLine1 venue.city dressCode",
    )
    .sort({ startAt: 1 })
    .limit(100)
    .lean();
  const eventIds = events.map((e) => e._id);
  const albums = w.settings?.publicGalleryEnabled
    ? await AlbumModel.find({
        tenantId: w._id,
        status: "ACTIVE",
        eventId: { $in: eventIds },
      })
        .select("_id")
        .limit(100)
        .lean()
    : [];
  const photos = albums.length
    ? await PhotoModel.find({
        tenantId: w._id,
        status: "READY",
        albumId: { $in: albums.map((a) => a._id) },
        eventId: { $in: eventIds },
      })
        .select("thumbnail optimized")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    : [];
  const streams = w.settings?.publicLivestreamEnabled
    ? await LivestreamModel.find({
        tenantId: w._id,
        eventId: { $in: eventIds },
        isPublic: true,
        status: { $in: ["SCHEDULED", "LIVE", "ENDED"] },
      })
        .select("title videoId status eventId")
        .limit(100)
        .lean()
    : [];
  return {
    title: String(w.title),
    brideName: String(w.bride.name),
    groomName: String(w.groom.name),
    description: String(w.description ?? ""),
    city: String(w.city),
    date: w.weddingDate.toISOString().slice(0, 10),
    timezone: String(w.timezone),
    hashtag: String(w.hashtag ?? ""),
    events: events.map((e) => ({
      id: String(e._id),
      name: String(e.name),
      startAt: e.startAt.toISOString(),
      venue: [e.venue.name, e.venue.addressLine1, e.venue.city]
        .filter(Boolean)
        .join(", "),
      dressCode: String(e.dressCode ?? ""),
    })),
    photos: photos.map((p) => ({
      id: String(p._id),
      thumbnail: p.thumbnail,
      optimized: p.optimized,
    })),
    streams: streams.map((s) => ({
      id: String(s._id),
      title: s.title,
      status: s.status,
      url: `https://www.youtube.com/watch?v=${s.videoId}`,
    })),
  };
}

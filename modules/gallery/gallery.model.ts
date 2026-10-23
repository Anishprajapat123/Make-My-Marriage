import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
const albumSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 160 },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" },
    revision: { type: Number, default: 0 },
  },
  { collection: "gallery_albums", timestamps: true, versionKey: false },
);
albumSchema.index({ tenantId: 1, eventId: 1 }, { unique: true });
const photoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    albumId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    uploadedByMemberId: { type: Schema.Types.ObjectId, required: true },
    publicId: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: [
        "UPLOADING",
        "READY",
        "FAILED",
        "DELETING",
        "DELETE_FAILED",
        "DELETED",
      ],
      required: true,
    },
    original: { type: String, default: "" },
    optimized: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { collection: "photos", timestamps: true, versionKey: false },
);
photoSchema.index({ tenantId: 1, albumId: 1, status: 1, createdAt: -1 });
photoSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
export const AlbumModel: Model<InferSchemaType<typeof albumSchema>> =
  (models.GalleryAlbum as
    Model<InferSchemaType<typeof albumSchema>> | undefined) ??
  model<InferSchemaType<typeof albumSchema>>("GalleryAlbum", albumSchema);
export const PhotoModel: Model<InferSchemaType<typeof photoSchema>> =
  (models.GalleryPhoto as
    Model<InferSchemaType<typeof photoSchema>> | undefined) ??
  model<InferSchemaType<typeof photoSchema>>("GalleryPhoto", photoSchema);

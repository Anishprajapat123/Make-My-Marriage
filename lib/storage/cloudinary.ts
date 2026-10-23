import "server-only";
import { createHash } from "node:crypto";
import { AccessError } from "@/lib/tenant/context";
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const PHOTO_TRANSFORMS =
  "c_limit,w_1600,h_1600,q_auto,f_webp|c_fill,w_320,h_320,q_auto,f_webp";
function config() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME,
    key = process.env.CLOUDINARY_API_KEY,
    secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret)
    throw new AccessError(
      503,
      "STORAGE_UNAVAILABLE",
      "Photo storage is not configured.",
    );
  return { cloud, key, secret };
}
export const photoStorageConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
let freeCheckUntil = 0;
export async function destroyDemoPhoto(publicId: string) {
  const { cloud, key, secret } = config();
  const parameters = {
    invalidate: "true",
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = createHash("sha256")
    .update(
      Object.entries(parameters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&") + secret,
    )
    .digest("hex");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/destroy`,
    {
      method: "POST",
      body: new URLSearchParams({ ...parameters, api_key: key, signature }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new AccessError(
      503,
      "DELETE_FAILED",
      "Photo removal failed. Please retry.",
    );
  const body = await response.json();
  if (!["ok", "not found"].includes(body.result))
    throw new AccessError(
      503,
      "DELETE_FAILED",
      "Photo removal could not be confirmed. Please retry.",
    );
}
export async function requireFreePhotoCapacity() {
  if (Date.now() < freeCheckUntil) return;
  const { cloud, key, secret } = config();
  const r = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/usage`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!r.ok)
    throw new AccessError(
      503,
      "STORAGE_UNAVAILABLE",
      "Photo storage could not be verified. Please retry later.",
    );
  const data = await r.json();
  if (String(data.plan).toLowerCase() !== "free")
    throw new AccessError(
      503,
      "STORAGE_UNAVAILABLE",
      "Photo uploads require the approved Free plan.",
    );
  if (!Number.isFinite(data.credits?.usage) || data.credits.usage >= 20)
    throw new AccessError(
      503,
      "STORAGE_LIMIT",
      "Demo photo capacity is currently unavailable.",
    );
  freeCheckUntil = Date.now() + 60000;
}
export type StoredPhoto = {
  original: string;
  optimized: string;
  thumbnail: string;
  bytes: number;
  width: number;
  height: number;
  publicId: string;
};
export async function uploadDemoPhoto(
  file: File,
  publicId: string,
): Promise<StoredPhoto> {
  const { cloud, key, secret } = config(),
    parameters = {
      eager: PHOTO_TRANSFORMS,
      overwrite: "false",
      public_id: publicId,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
  const signed = Object.entries(parameters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const signature = createHash("sha256")
    .update(signed + secret)
    .digest("hex");
  const form = new FormData();
  for (const [k, v] of Object.entries(parameters)) form.set(k, v);
  form.set("api_key", key);
  form.set("signature", signature);
  form.set("file", file);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`,
    { method: "POST", body: form, signal: AbortSignal.timeout(45000) },
  );
  if (!response.ok)
    throw new AccessError(
      503,
      "UPLOAD_FAILED",
      "The photo could not be uploaded. Please retry.",
    );
  const p = await response.json();
  const safe = (url: unknown) =>
    typeof url === "string" &&
    url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`);
  if (
    p.public_id !== publicId ||
    !["jpg", "png", "webp"].includes(p.format) ||
    p.bytes > PHOTO_MAX_BYTES ||
    !p.width ||
    !p.height ||
    !safe(p.secure_url) ||
    p.eager?.length !== 2 ||
    !p.eager.every((e: { secure_url?: string }) => safe(e.secure_url))
  )
    throw new AccessError(
      503,
      "UPLOAD_FAILED",
      "Uploaded image verification failed.",
    );
  return {
    original: p.secure_url,
    optimized: p.eager[0].secure_url,
    thumbnail: p.eager[1].secure_url,
    bytes: p.bytes,
    width: p.width,
    height: p.height,
    publicId,
  };
}
export async function readPhotoFile(request: Request) {
  const origin = request.headers.get("origin"),
    expected = new URL(process.env.APP_BASE_URL ?? request.url).origin;
  if (origin && origin !== expected)
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Use this application to upload photos.",
    );
  const limit = PHOTO_MAX_BYTES + 128 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new AccessError(413, "FILE_TOO_LARGE", "Photo must be at most 3 MB.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new AccessError(400, "VALIDATION_ERROR", "Choose a photo.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new AccessError(
        413,
        "FILE_TOO_LARGE",
        "Photo must be at most 3 MB.",
      );
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  const form = await new Response(bytes, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > PHOTO_MAX_BYTES ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Choose a JPEG, PNG or WebP photo up to 3 MB.",
    );
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255,
    png = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71,
    webp =
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (!(
    (file.type === "image/jpeg" && jpeg) ||
    (file.type === "image/png" && png) ||
    (file.type === "image/webp" && webp)
  ))
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "File content does not match its image type.",
    );
  return file;
}

"use client";
import Image from "next/image";
import {
  Camera,
  Plus,
  ShieldCheck,
  UploadCloud,
  Eye,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import styles from "@/components/layout/module-page.module.css";
type Data = {
  albums: { id: string; name: string }[];
  selected: string | null;
  events: { id: string; name: string }[];
  photos: {
    id: string;
    original: string;
    optimized: string;
    thumbnail: string;
    width: number;
    height: number;
    bytes: number;
  }[];
  storageConfigured: boolean;
  usedSlots: number;
  uploads: { id: string; status: string; removable: boolean }[];
};
async function result(response: Response) {
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message ?? "Request failed. Please retry.");
  return body.data;
}
export function GalleryScreen({
  canManage,
  canUpload,
}: {
  canManage: boolean;
  canUpload: boolean;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [showAlbum, setShowAlbum] = useState(false);
  const load = useCallback(async (album?: string) => {
    setLoading(true);
    setError("");
    try {
      setData(
        await result(
          await fetch(
            `/api/v1/gallery/albums${album ? `?album=${encodeURIComponent(album)}` : ""}`,
            { cache: "no-store" },
          ),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gallery unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/gallery/albums", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(result)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Gallery unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function remove(photoId: string) {
    if (
      !window.confirm(
        "Permanently remove this photo or failed upload? Shared image URLs may remain cached briefly.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await result(
        await fetch(`/api/v1/gallery/photos/${photoId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      await load(data?.selected ?? undefined);
      setNotice("Photo removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Removal failed.");
    } finally {
      setBusy(false);
    }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await result(
        await fetch("/api/v1/gallery/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fields.get("name"),
            eventId: fields.get("eventId"),
          }),
        }),
      );
      form.reset();
      setShowAlbum(false);
      await load(created.id);
      setNotice("Album ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create album.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.selected) return;
    const form = event.currentTarget,
      fields = new FormData(form),
      file = fields.get("file");
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) {
      setError("Choose a photo up to 3 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await result(
        await fetch(`/api/v1/gallery/albums/${data.selected}/photos`, {
          method: "POST",
          body: fields,
        }),
      );
      form.reset();
      await load(data.selected);
      setNotice("Photo uploaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.screen} aria-busy={busy || loading}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Visual documentation · Our celebration
          </p>
          <h1>Event Photo Gallery</h1>
          <p>Keep every moment together, one album per wedding event.</p>
        </div>
        {canManage && (
          <button
            disabled={busy || loading}
            aria-expanded={showAlbum}
            aria-controls="album-form"
            onClick={() => setShowAlbum((v) => !v)}
          >
            <Plus size={18} aria-hidden="true" />
            Create Event Album
          </button>
        )}
      </header>
      {data && (
        <>
          <div className={styles.tabs} aria-label="Event albums">
            {data.albums.map((a) => (
              <button
                key={a.id}
                aria-pressed={data.selected === a.id}
                disabled={busy || loading}
                onClick={() => void load(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
          <div className={styles.summary}>
            <section className={styles.panel}>
              <p className={styles.eyebrow}>Free demo allocation</p>
              <h2>Photo capacity</h2>
              <p className={styles.capacity}>
                {data.usedSlots}
                <span className={styles.muted}> / 20 slots</span>
              </p>
              <progress
                value={data.usedSlots}
                max={20}
                aria-label={`${data.usedSlots} of 20 photo slots used`}
              />
              <p className={styles.muted}>
                {Math.max(0, 20 - data.usedSlots)} slots remaining · 3 MB per
                photo
              </p>
            </section>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <span className={styles.icon}>
                  <ShieldCheck aria-hidden="true" />
                </span>
                <div>
                  <h3>Shareable photo delivery</h3>
                  <p className={styles.note}>
                    Photos use Cloudinary delivery URLs. Anyone with an image
                    URL can open it; these are not authenticated private files.
                  </p>
                </div>
              </div>
              <p className={styles.note}>
                Avoid identity cards, receipts and private documents.
                Unpublishing your page does not revoke shared photo URLs.
                Uploads pause when free provider capacity is unavailable.
              </p>
            </section>
          </div>
        </>
      )}
      {error && (
        <div role="alert" className={styles.panel}>
          {error}{" "}
          <button
            disabled={busy || loading}
            onClick={() => void load(data?.selected ?? undefined)}
          >
            Reload gallery
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading && <p role="status">Loading gallery…</p>}
      {canManage && data && showAlbum && (
        <form id="album-form" className={styles.panel} onSubmit={create}>
          <h2>Create event album</h2>
          <label>
            Album name
            <input name="name" required maxLength={160} disabled={busy} />
          </label>
          <label>
            Event
            <select name="eventId" required disabled={busy}>
              <option value="">Choose an event</option>
              {data.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          {!data.events.length && (
            <p>Create an event before adding an album.</p>
          )}
          <button disabled={busy || loading || !data.events.length}>
            Create album
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => setShowAlbum(false)}
          >
            Cancel
          </button>
        </form>
      )}
      {data && (
        <>
          {!data.albums.length && (
            <div className={styles.empty}>
              <ImagePlus aria-hidden="true" />
              <h2>A home for your memories</h2>
              <p>
                No event albums yet. Create an album when you are ready to add
                photos.
              </p>
            </div>
          )}
          {data.selected && canUpload && (
            <form className={styles.panel} onSubmit={upload}>
              <div className={styles.sectionHeading}>
                <span className={styles.icon}>
                  <Camera aria-hidden="true" />
                </span>
                <div>
                  <h3>Upload a single photo</h3>
                  <p className={styles.note}>
                    {data.albums.find((a) => a.id === data.selected)?.name}
                  </p>
                </div>
              </div>
              <div className={styles.upload}>
                <UploadCloud size={32} aria-hidden="true" />
                <h3>Choose a moment to remember</h3>
                <p className={styles.note}>
                  JPEG, PNG or WebP · Up to 3 MB
                  <br />
                  Original, optimized image and thumbnail are retained.
                </p>
                <label>
                  Photo
                  <input
                    type="file"
                    name="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    disabled={busy}
                  />
                </label>
                <button
                  disabled={
                    busy ||
                    loading ||
                    !data.storageConfigured ||
                    data.usedSlots >= 20
                  }
                >
                  {busy ? "Please wait…" : "Upload photo"}
                </button>
                {!data.storageConfigured && (
                  <p>Photo storage is not configured.</p>
                )}
                {data.usedSlots >= 20 && (
                  <p role="status">
                    All 20 demo slots are reserved. Remove a photo or recover a
                    failed upload to make room.
                  </p>
                )}
              </div>
            </form>
          )}
          {data.selected && !data.photos.length && !loading && (
            <p>No ready photos in this album yet.</p>
          )}
          {data.selected && (
            <div className={styles.header}>
              <h2>{data.albums.find((a) => a.id === data.selected)?.name}</h2>
              <span className={styles.badge}>{data.photos.length} photos</span>
            </div>
          )}
          <div className={styles.grid}>
            {data.photos.map((p) => (
              <article className={styles.photo} key={p.id}>
                <a
                  key={p.id}
                  href={p.optimized}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open gallery photo"
                >
                  <Image
                    unoptimized
                    src={p.thumbnail}
                    alt="Wedding gallery photo"
                    loading="lazy"
                    width={320}
                    height={320}
                  />
                </a>
                <div className={styles.photoBody}>
                  <p>
                    {p.width} × {p.height} px · {(p.bytes / 1048576).toFixed(1)}{" "}
                    MB
                  </p>
                  <div className={styles.photoActions}>
                    <a
                      href={p.optimized}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.secondary}
                    >
                      <Eye size={15} aria-hidden="true" />
                      Open photo
                    </a>
                    {canManage && (
                      <button
                        disabled={busy || loading}
                        className={styles.secondary}
                        aria-label="Remove photo"
                        onClick={() => void remove(p.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {canManage && data.uploads.length > 0 && (
            <section className={styles.panel}>
              <h2>Upload recovery</h2>
              <p>
                Pending and failed uploads reserve a demo slot. Pending uploads
                can be removed after two minutes.
              </p>
              {data.uploads.map((p) => (
                <p key={p.id}>
                  {p.status}{" "}
                  <button
                    disabled={busy || loading || !p.removable}
                    onClick={() => void remove(p.id)}
                  >
                    Remove upload
                  </button>
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}

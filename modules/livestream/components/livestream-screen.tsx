"use client";
import { useEffect, useState } from "react";
import {
  Radio,
  Plus,
  ShieldCheck,
  ExternalLink,
  Pencil,
  EyeOff,
} from "lucide-react";
import styles from "@/components/layout/module-page.module.css";
type Stream = {
  id: string;
  eventId: string;
  title: string;
  url: string;
  status: string;
  isPublic: boolean;
  revision: number;
  publiclyVisible: boolean;
};
type Data = { streams: Stream[]; events: { id: string; name: string }[] };
const empty = {
  eventId: "",
  title: "",
  url: "",
  status: "SCHEDULED",
  isPublic: false,
  revision: null as number | null,
};
export function LivestreamScreen({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<Data | null>(null),
    [form, setForm] = useState(empty),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [showForm, setShowForm] = useState(false);
  useEffect(() => {
    let current = true;
    fetch("/api/v1/livestreams", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok)
          throw new Error(b.error?.message ?? "Livestreams unavailable.");
        if (current) setData(b.data);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [reload]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/v1/livestreams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        b = await r.json();
      if (!r.ok)
        throw new Error(b.error?.message ?? "Could not save livestream.");
      setForm(empty);
      setShowForm(false);
      setReload((v) => v + 1);
      setNotice("Livestream saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Together from anywhere</p>
          <h1>External Livestreams</h1>
          <p>
            Connect your celebration to loved ones near and far. One YouTube
            broadcast link per event.
          </p>
        </div>
        {canManage && data && (
          <button
            disabled={busy}
            aria-expanded={showForm}
            aria-controls="livestream-form"
            onClick={() => {
              setShowForm((v) => !v);
              setForm(empty);
            }}
          >
            <Plus size={18} aria-hidden="true" />
            Configure event livestream
          </button>
        )}
      </header>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <span className={styles.icon}>
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <h2>Public visibility requirements</h2>
            <p className={styles.note}>
              All four conditions are required before a link appears on the
              public page.
            </p>
          </div>
        </div>
        <div className={styles.criteria}>
          {[
            [
              "1. Wedding page published",
              "Publish your wedding page in Settings.",
            ],
            [
              "2. Public livestreams enabled",
              "Enable the public livestream switch in Settings.",
            ],
            ["3. Event published", "Publish the associated event in Events."],
            [
              "4. Public stream enabled",
              "Allow public viewing and choose a status other than Disabled.",
            ],
          ].map(([title, text]) => (
            <div className={styles.criterion} key={title}>
              <strong>{title}</strong>
              {text}
            </div>
          ))}
        </div>
        <p className={styles.callout}>
          Broadcasts are hosted on YouTube. Video privacy and availability are
          managed there; Make My Marriage does not start or host a stream.
        </p>
      </section>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => {
              setError("");
              setReload((v) => v + 1);
            }}
          >
            Reload
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p>Loading livestreams...</p>}
      {canManage && data && showForm && (
        <form id="livestream-form" className={styles.panel} onSubmit={save}>
          <h2>
            {form.revision === null ? "Add livestream" : "Edit livestream"}
          </h2>
          <div className={styles.fields}>
            <label>
              Event
              <select
                required
                value={form.eventId}
                disabled={busy || form.revision !== null}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              >
                <option value="">Choose event</option>
                {data.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                required
                maxLength={160}
                value={form.title}
                disabled={busy}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              YouTube video URL
              <input
                type="url"
                required
                maxLength={500}
                value={form.url}
                disabled={busy}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                disabled={busy}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {["SCHEDULED", "LIVE", "ENDED", "DISABLED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.switchRow}>
            <span>
              <input
                className={styles.switch}
                role="switch"
                type="checkbox"
                checked={form.isPublic}
                disabled={busy}
                onChange={(e) =>
                  setForm({ ...form, isPublic: e.target.checked })
                }
              />{" "}
              Allow on the public wedding page
            </span>
          </label>
          <p>
            Public viewing also requires a published event and both public-page
            and livestream switches in Settings. YouTube controls video
            availability independently.
          </p>
          <button disabled={busy}>
            {busy ? "Saving..." : "Save livestream"}
          </button>{" "}
          <button
            className={styles.secondary}
            type="button"
            disabled={busy}
            onClick={() => {
              setForm(empty);
              setShowForm(false);
            }}
          >
            Cancel
          </button>
        </form>
      )}
      {data && !data.streams.length && (
        <div className={styles.empty}>
          <Radio aria-hidden="true" />
          <h2>Bring everyone closer</h2>
          <p>
            No livestreams configured yet. Add an existing YouTube broadcast
            when your event is ready.
          </p>
        </div>
      )}
      <div className={styles.streamGrid}>
        {data?.streams.map((s) => (
          <article
            key={s.id}
            className={`${styles.panel} ${s.status === "DISABLED" ? styles.disabledCard : ""}`}
          >
            <div className={styles.header}>
              <p className={styles.eyebrow}>
                {data.events.find((e) => e.id === s.eventId)?.name ?? "Event"}
              </p>
              <span className={styles.badge}>
                {s.status === "LIVE"
                  ? "● Live"
                  : s.status.charAt(0) + s.status.slice(1).toLowerCase()}
              </span>
            </div>
            <h2>{s.title}</h2>
            <p className={styles.note}>
              {s.publiclyVisible
                ? "Visible on public wedding page"
                : "Hidden from public wedding page"}
            </p>
            <div className={styles.streamArtwork}>
              <div>
                {s.status === "DISABLED" ? (
                  <EyeOff size={36} aria-hidden="true" />
                ) : (
                  <Radio size={36} aria-hidden="true" />
                )}
                <span>
                  {s.status === "DISABLED"
                    ? "Broadcast link disabled"
                    : "External YouTube broadcast"}
                </span>
              </div>
            </div>
            {s.status !== "DISABLED" && (
              <span className={styles.streamUrl}>{s.url}</span>
            )}
            <div className={styles.actions}>
              {s.status !== "DISABLED" && (
                <p>
                  <a
                    className={styles.secondary}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch on YouTube
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </p>
              )}
              {canManage && (
                <button
                  disabled={busy}
                  className={styles.secondary}
                  onClick={() => {
                    setForm({
                      eventId: s.eventId,
                      title: s.title,
                      url: s.url,
                      status: s.status,
                      isPublic: s.isPublic,
                      revision: s.revision,
                    });
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil size={16} aria-hidden="true" />
                  Edit configuration
                </button>
              )}
            </div>
            {s.status === "DISABLED" && (
              <p className={styles.note}>
                Disabled streams have no viewing link.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

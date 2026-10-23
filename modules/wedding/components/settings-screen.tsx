"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  Heart,
  LockKeyhole,
  Save,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { ProfileForm } from "@/modules/auth/components/profile-form";
import styles from "@/components/layout/module-page.module.css";
type Settings = {
  title: string;
  brideName: string;
  groomName: string;
  city: string;
  description: string;
  hashtag: string;
  weddingDate: string;
  timezone: string;
  slug: string;
  revision: number;
  published: boolean;
  publicGallery: boolean;
  publicLivestream: boolean;
};
const textKeys = [
  "title",
  "brideName",
  "groomName",
  "city",
  "description",
  "hashtag",
] as const;
const publicationKeys = [
  "published",
  "publicGallery",
  "publicLivestream",
] as const;
export function SettingsScreen({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<Settings | null>(null),
    [saved, setSaved] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    fetch("/api/v1/wedding", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error?.message ?? "Settings unavailable.");
        if (current) {
          setData(b.data);
          setSaved(b.data);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [reload]);
  async function save(
    event: React.FormEvent<HTMLFormElement>,
    section: "details" | "publication",
  ) {
    event.preventDefault();
    if (!data || !saved) return;
    setBusy(true);
    setError("");
    setNotice("");
    const values =
      section === "details"
        ? {
            ...data,
            published: saved.published,
            publicGallery: saved.publicGallery,
            publicLivestream: saved.publicLivestream,
          }
        : {
            ...saved,
            published: data.published,
            publicGallery: data.publicGallery,
            publicLivestream: data.publicLivestream,
          };
    const payload = {
      title: values.title,
      brideName: values.brideName,
      groomName: values.groomName,
      city: values.city,
      description: values.description,
      hashtag: values.hashtag,
      revision: saved.revision,
      published: values.published,
      publicGallery: values.publicGallery,
      publicLivestream: values.publicLivestream,
    };
    try {
      const r = await fetch("/api/v1/wedding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        b = await r.json();
      if (!r.ok) throw new Error(b.error?.message ?? "Save failed.");
      setSaved({ ...values, revision: b.data.revision });
      setData({ ...data, revision: b.data.revision });
      setNotice(
        section === "details"
          ? "Wedding details saved."
          : "Publication settings saved.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  const detailsDirty = Boolean(
    data && saved && textKeys.some((k) => data[k] !== saved[k]),
  );
  const publicationDirty = Boolean(
    data && saved && publicationKeys.some((k) => data[k] !== saved[k]),
  );
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Your workspace · Personal preferences
          </p>
          <h1>Settings &amp; Profile</h1>
          <p>
            Make this space your own, and choose how your celebration is shared.
          </p>
        </div>
        {saved && (
          <span className={styles.badge}>
            {saved.published
              ? "Public page published"
              : "Public page unpublished"}
          </span>
        )}
      </header>
      <ProfileForm />
      {error && (
        <div role="alert" className={styles.error}>
          {error}{" "}
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              if (
                (detailsDirty || publicationDirty) &&
                !window.confirm(
                  "Reload saved settings and discard your unsaved wedding changes?",
                )
              )
                return;
              setError("");
              setNotice("");
              setReload((v) => v + 1);
            }}
          >
            Reload saved settings
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.callout}>
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">Loading wedding settings...</p>}
      {data && (
        <>
          <form
            className={styles.panel}
            onSubmit={(e) => void save(e, "details")}
          >
            <div className={styles.sectionHeading}>
              <span className={styles.icon}>
                <Heart aria-hidden="true" />
              </span>
              <div>
                <h2>Wedding Details</h2>
                <p className={styles.note}>
                  The people, place and words at the heart of your celebration.
                </p>
              </div>
              <span className={styles.sectionNumber}>SECTION 02</span>
            </div>
            {!canManage && (
              <div className={styles.callout}>
                <LockKeyhole size={18} aria-hidden="true" />
                <p>
                  You can view wedding details. Only wedding managers can change
                  them; your personal profile remains editable.
                </p>
              </div>
            )}
            <div className={styles.detailsLayout}>
              <div>
                <label>
                  Celebration title
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={data.title}
                    disabled={!canManage || busy}
                    onChange={(e) =>
                      setData({ ...data, title: e.target.value })
                    }
                  />
                </label>
                <div className={styles.fields}>
                  {(
                    [
                      ["brideName", "Bride name", 120],
                      ["groomName", "Groom name", 120],
                      ["city", "Celebration city", 120],
                      ["hashtag", "Hashtag (optional)", 80],
                    ] as const
                  ).map(([key, label, max]) => (
                    <label key={key}>
                      {label}
                      <input
                        required={key !== "hashtag"}
                        minLength={key === "hashtag" ? undefined : 2}
                        maxLength={max}
                        value={data[key]}
                        disabled={!canManage || busy}
                        onChange={(e) =>
                          setData({ ...data, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Public welcome description
                  <textarea
                    value={data.description}
                    maxLength={2000}
                    disabled={!canManage || busy}
                    onChange={(e) =>
                      setData({ ...data, description: e.target.value })
                    }
                  />
                </label>
              </div>
              <aside className={styles.facts}>
                <LockKeyhole size={20} aria-hidden="true" />
                <h3>Celebration essentials</h3>
                <dl>
                  <dt>Wedding date</dt>
                  <dd>{data.weddingDate}</dd>
                  <dt>Wedding timezone</dt>
                  <dd>{data.timezone}</dd>
                  <dt>Public page address</dt>
                  <dd>/wedding/{data.slug}</dd>
                </dl>
                <p className={styles.note}>
                  Date, timezone and address are read-only in this version.
                </p>
              </aside>
            </div>
            {canManage && (
              <div className={styles.actions}>
                {detailsDirty && (
                  <span className={styles.badge} role="status">
                    Unsaved wedding details
                  </span>
                )}
                <button disabled={busy || !detailsDirty}>
                  <Save size={16} aria-hidden="true" />
                  {busy ? "Saving..." : "Save wedding details"}
                </button>
              </div>
            )}
          </form>
          <form
            className={styles.panel}
            onSubmit={(e) => void save(e, "publication")}
          >
            <div className={styles.sectionHeading}>
              <span className={styles.icon}>
                <Globe aria-hidden="true" />
              </span>
              <div>
                <h2>Publication &amp; Privacy</h2>
                <p className={styles.note}>
                  Choose what family and friends can see on your public page.
                </p>
              </div>
              <span className={styles.sectionNumber}>SECTION 03</span>
            </div>
            <label className={styles.switchRow}>
              <span>
                Publish wedding page
                <small>
                  Make your wedding page accessible to anyone with its address.
                </small>
              </span>
              <input
                className={styles.switch}
                role="switch"
                type="checkbox"
                checked={data.published}
                disabled={!canManage || busy}
                onChange={(e) =>
                  setData({ ...data, published: e.target.checked })
                }
              />
            </label>
            <div className={styles.fields}>
              {(
                [
                  ["publicGallery", "Include event photo gallery"],
                  ["publicLivestream", "Include public livestreams"],
                ] as const
              ).map(([key, label]) => (
                <label className={styles.switchRow} key={key}>
                  <span>
                    {label}
                    <small>
                      {data.published
                        ? "Included only for published events."
                        : "Hidden while the wedding page is unpublished."}
                    </small>
                  </span>
                  <input
                    className={styles.switch}
                    role="switch"
                    type="checkbox"
                    checked={data[key]}
                    disabled={!canManage || busy}
                    onChange={(e) =>
                      setData({ ...data, [key]: e.target.checked })
                    }
                  />
                </label>
              ))}
            </div>
            <div className={styles.callout}>
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>Your sharing choices</strong>
                <p>
                  Publishing shares the couple&apos;s names, date, city, welcome
                  description and published event locations. Photos and
                  livestream links need their additional switches. Guest lists,
                  private notes and financial records stay inside the workspace.
                </p>
                <p>
                  Unpublishing does not delete records or revoke photo URLs that
                  have already been shared.
                </p>
              </div>
            </div>
            <div className={styles.actions}>
              {saved?.published && (
                <Link
                  className={styles.secondary}
                  href={`/wedding/${saved.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open public page
                  <ExternalLink size={15} aria-hidden="true" />
                </Link>
              )}
              {publicationDirty && (
                <span className={styles.badge} role="status">
                  Unsaved publication choices
                </span>
              )}
              {canManage && (
                <button disabled={busy || !publicationDirty}>
                  <Save size={16} aria-hidden="true" />
                  {busy ? "Saving..." : "Save publication settings"}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}

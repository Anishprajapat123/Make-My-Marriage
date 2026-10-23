"use client";
import { useEffect, useState } from "react";
import { ContactRound, LockKeyhole, Save } from "lucide-react";
import styles from "@/components/layout/module-page.module.css";
type Profile = {
  displayName: string;
  phone: string;
  email: string;
  provider: string;
  revision: number;
};
export function ProfileForm() {
  const [data, setData] = useState<Profile | null>(null),
    [saved, setSaved] = useState<Profile | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    fetch("/api/v1/auth/profile", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error?.message ?? "Profile unavailable.");
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
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/v1/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: data.displayName,
            phone: data.phone,
            revision: data.revision,
          }),
        }),
        b = await r.json();
      if (!r.ok) throw new Error(b.error?.message ?? "Save failed.");
      setData({ ...data, revision: b.data.revision });
      setSaved({ ...data, revision: b.data.revision });
      setNotice(
        "Profile saved. Sign out and sign in again to refresh your name in the workspace header.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeading}>
        <span className={styles.icon}>
          <ContactRound aria-hidden="true" />
        </span>
        <div>
          <h2>Personal Profile</h2>
          <p className={styles.note}>
            Your identity in this wedding workspace.
          </p>
        </div>
        <span className={styles.sectionNumber}>SECTION 01</span>
      </div>
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
            Reload profile
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading your profile...</p>}
      {data && (
        <form onSubmit={save}>
          <div className={styles.profileFields}>
            <label>
              Display name
              <input
                required
                minLength={2}
                maxLength={120}
                value={data.displayName}
                disabled={busy}
                onChange={(e) =>
                  setData({ ...data, displayName: e.target.value })
                }
              />
            </label>
            <label>
              Phone (optional)
              <input
                type="tel"
                maxLength={40}
                value={data.phone}
                disabled={busy}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
              />
            </label>
            <label>
              Sign-in email
              <input readOnly value={data.email} />
              <span className={styles.note}>
                {data.provider === "GOOGLE"
                  ? "Google sign-in"
                  : "Verified password account"}
              </span>
            </label>
          </div>
          <div className={styles.callout}>
            <LockKeyhole size={18} aria-hidden="true" />
            <p>
              Your sign-in email and authentication provider cannot be changed
              here. Saving your profile does not change your wedding access.
            </p>
          </div>
          <div className={styles.actions}>
            {saved &&
              (data.displayName !== saved.displayName ||
                data.phone !== saved.phone) && (
                <span className={styles.badge} role="status">
                  Unsaved profile changes
                </span>
              )}
            <button
              disabled={
                busy ||
                !saved ||
                (data.displayName === saved.displayName &&
                  data.phone === saved.phone)
              }
            >
              <Save size={16} aria-hidden="true" />
              {busy ? "Saving…" : "Save personal profile"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

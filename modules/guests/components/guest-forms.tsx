"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GuestView, FamilyView, DuplicateDetails } from "../guest.types";
import { GUEST_SIDES, GUEST_TYPES } from "../guest.types";
import {
  guestFetch,
  GuestRequestError,
  ReferencePicker,
  sideLabels,
  typeLabels,
} from "./guest-ui";
import styles from "./guests.module.css";
function useHeading() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
export function FamilyForm({
  family,
  onCancel,
  onSaved,
}: {
  family?: FamilyView;
  onCancel: () => void;
  onSaved: (id: string, name: string) => void;
}) {
  const heading = useHeading();
  const [name, setName] = useState(family?.name ?? ""),
    [side, setSide] = useState(family?.side ?? "OTHER"),
    [notes, setNotes] = useState(family?.notes ?? ""),
    [primary, setPrimary] = useState(family?.primaryContactGuestId ?? null),
    [primaryName, setPrimaryName] = useState(
      family?.primaryContactName ?? null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await guestFetch<{ id: string }>(
        family ? `/api/v1/families/${family.id}` : "/api/v1/families",
        {
          method: family ? "PATCH" : "POST",
          body: JSON.stringify({
            name,
            side,
            notes,
            primaryContactGuestId: primary,
            ...(family ? { revision: family.revision } : {}),
          }),
        },
      );
      onSaved(result.id, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save family.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <p className={styles.eyebrow}>Together, by family</p>
      <h2 tabIndex={-1} ref={heading}>
        {family ? "Edit family" : "Create a family"}
      </h2>
      <p className={styles.muted}>
        A household groups individual guests. It does not create workspace
        accounts.
      </p>
      <form onSubmit={save}>
        <fieldset disabled={busy} className={styles.fieldset}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Family name
              <input
                required
                maxLength={180}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              Side
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as typeof side)}
              >
                {GUEST_SIDES.map((s) => (
                  <option key={s} value={s}>
                    {sideLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${styles.field} ${styles.full}`}>
              Private family notes (optional)
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>
          {family && (
            <ReferencePicker
              kind="contact"
              familyId={family.id}
              selectedId={primary}
              selectedLabel={primaryName}
              onChange={(id, label) => {
                setPrimary(id);
                setPrimaryName(label);
              }}
            />
          )}
        </fieldset>
        {error && (
          <p className={styles.alert} role="alert">
            {error}
            {family &&
              " Close this form and reload families before retrying a stale edit."}
          </p>
        )}
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel / discard edits
          </button>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Saving…" : family ? "Save family" : "Create family"}
          </button>
        </div>
      </form>
    </section>
  );
}
export function GuestForm({
  guest,
  initialFamily,
  onCancel,
  onSaved,
}: {
  guest?: GuestView;
  initialFamily?: { id: string; name: string };
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const heading = useHeading();
  const [fields, setFields] = useState({
    name: guest?.name ?? "",
    phone: guest?.phone ?? "",
    email: guest?.email ?? "",
    familyId: guest?.familyId ?? initialFamily?.id ?? null,
    relationship: guest?.relationship ?? "",
    side: guest?.side ?? "OTHER",
    guestType: guest?.guestType ?? "PRIMARY",
    notes: guest?.notes ?? "",
  });
  const [familyName, setFamilyName] = useState(
      guest?.familyName ?? initialFamily?.name ?? null,
    ),
    [newFamily, setNewFamily] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [duplicates, setDuplicates] = useState<DuplicateDetails | null>(null),
    [review, setReview] = useState<GuestView | null>(null);
  function change<K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) {
    setFields((f) => ({ ...f, [key]: value }));
    setDuplicates(null);
    setReview(null);
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await persist();
  }
  async function persist(confirmation?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await guestFetch<{ id: string }>(
        guest ? `/api/v1/guests/${guest.id}` : "/api/v1/guests",
        {
          method: guest ? "PATCH" : "POST",
          body: JSON.stringify({
            ...fields,
            ...(guest ? { revision: guest.revision } : {}),
            ...(confirmation ? { duplicateConfirmation: confirmation } : {}),
          }),
        },
      );
      onSaved(result.id);
    } catch (e) {
      if (e instanceof GuestRequestError && e.code === "POSSIBLE_DUPLICATE") {
        setDuplicates(e.details as DuplicateDetails);
        setReview(null);
      } else setError(e instanceof Error ? e.message : "Could not save guest.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Every person, remembered</p>
        <h2 ref={heading} tabIndex={-1}>
          {guest ? "Edit guest" : "Add a guest"}
        </h2>
        <p className={styles.muted}>
          One record per person. Contact details and family grouping are
          optional.
        </p>
        <form onSubmit={save}>
          <fieldset className={styles.fieldset} disabled={busy}>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.full}`}>
                Guest name
                <input
                  required
                  maxLength={180}
                  value={fields.name}
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                Phone (optional)
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  maxLength={40}
                  value={fields.phone}
                  onChange={(e) => change("phone", e.target.value)}
                />
                <small>Include + and the country code.</small>
              </label>
              <label className={styles.field}>
                Email (optional)
                <input
                  type="email"
                  maxLength={254}
                  value={fields.email}
                  onChange={(e) => change("email", e.target.value)}
                />
              </label>
            </div>
            <ReferencePicker
              kind="family"
              selectedId={fields.familyId}
              selectedLabel={familyName}
              onChange={(id, label) => {
                change("familyId", id);
                setFamilyName(label);
              }}
            />
            <button
              className={styles.secondary}
              type="button"
              onClick={() => setNewFamily((v) => !v)}
            >
              {newFamily ? "Close family creation" : "Create a new family"}
            </button>
            <details
              className={styles.optional}
              open={guest ? true : undefined}
            >
              <summary>Relationship, side, guest type & notes</summary>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  Relationship
                  <input
                    maxLength={120}
                    value={fields.relationship}
                    onChange={(e) => change("relationship", e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  Side
                  <select
                    value={fields.side}
                    onChange={(e) =>
                      change("side", e.target.value as typeof fields.side)
                    }
                  >
                    {GUEST_SIDES.map((s) => (
                      <option key={s} value={s}>
                        {sideLabels[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Guest type
                  <select
                    value={fields.guestType}
                    onChange={(e) =>
                      change(
                        "guestType",
                        e.target.value as typeof fields.guestType,
                      )
                    }
                  >
                    {GUEST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {typeLabels[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.full}`}>
                  Private notes
                  <textarea
                    maxLength={2000}
                    value={fields.notes}
                    onChange={(e) => change("notes", e.target.value)}
                  />
                </label>
              </div>
            </details>
          </fieldset>
          {error && (
            <p className={styles.alert} role="alert">
              {error}
              {guest &&
                " Close the form and reload the guest before retrying a stale edit."}
            </p>
          )}
          {duplicates && (
            <section
              className={styles.duplicate}
              aria-label="Possible duplicate guests"
            >
              <h3>Someone familiar?</h3>
              <p role="alert">
                Possible matches found. Shared contact details and identical
                names can be valid. Review these guests before keeping both
                records.
              </p>
              {duplicates.matches.map((m) => (
                <article className={styles.match} key={m.id}>
                  <div>
                    <strong>{m.name}</strong>
                    <p>
                      {m.familyName ?? "No family"} · {m.status.toLowerCase()}
                    </p>
                    <small>{m.reasons.join(" · ")}</small>
                  </div>
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await guestFetch<{ guest: GuestView }>(
                          `/api/v1/guests/${m.id}`,
                        );
                        setReview(r.guest);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not load guest.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Review existing guest
                  </button>
                </article>
              ))}
              {review && (
                <div className={styles.panel}>
                  <h4>{review.name}</h4>
                  <p>
                    {review.phone ?? "No phone"} · {review.email ?? "No email"}
                  </p>
                  <p>
                    {review.familyName ?? "Ungrouped"} ·{" "}
                    {review.relationship || "No relationship recorded"}
                  </p>
                  <p>{review.notes || "No notes"}</p>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setReview(null)}
                  >
                    Close review
                  </button>
                </div>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => {
                    setDuplicates(null);
                    setReview(null);
                    heading.current?.focus();
                  }}
                >
                  Return to editing
                </button>
                <button
                  type="button"
                  onClick={() => persist(duplicates.confirmation)}
                  className={styles.primary}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Confirm and keep both"}
                </button>
              </div>
            </section>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={busy}
              className={styles.secondary}
              onClick={onCancel}
            >
              Cancel / discard edits
            </button>
            {!duplicates && (
              <button className={styles.primary} disabled={busy}>
                {busy ? "Saving…" : guest ? "Save guest" : "Add guest"}
              </button>
            )}
          </div>
        </form>
      </section>
      {newFamily && (
        <FamilyForm
          onCancel={() => setNewFamily(false)}
          onSaved={(id, name) => {
            change("familyId", id);
            setFamilyName(name);
            setNewFamily(false);
          }}
        />
      )}
    </div>
  );
}

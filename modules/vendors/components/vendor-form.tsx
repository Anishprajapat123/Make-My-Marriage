"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  VENDOR_CATEGORIES,
  vendorLabel,
  type VendorOptions,
  type VendorView,
} from "../vendor.types";
import { VendorDialog } from "./vendor-dialog";
import { vendorFetch, VendorRequestError } from "./vendor-client";
import styles from "./vendors.module.css";
export function VendorForm({
  row,
  onClose,
  onSaved,
}: {
  row?: VendorView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [options, setOptions] = useState<VendorOptions | null>(null),
    [optionError, setOptionError] = useState(""),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    vendorFetch<VendorOptions>("/api/v1/vendors/options", {
      signal: controller.signal,
    })
      .then((v) => {
        if (!controller.signal.aborted) {
          setOptions(v);
          setOptionError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setOptionError(e.message);
      });
    return () => controller.abort();
  }, [retry]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || stale || !options) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const vendor = {
      name: String(f.get("name") ?? ""),
      category: String(f.get("category") ?? ""),
      contact: {
        personName: String(f.get("personName") ?? ""),
        phone: String(f.get("phone") ?? ""),
        email: String(f.get("email") ?? "")
          .trim()
          .toLowerCase(),
      },
      service: String(f.get("service") ?? ""),
      notes: String(f.get("notes") ?? ""),
      eventIds: f.getAll("eventIds").map(String),
    };
    const signature = JSON.stringify(vendor);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      await vendorFetch(row ? `/api/v1/vendors/${row.id}` : "/api/v1/vendors", {
        method: row ? "PATCH" : "POST",
        body: JSON.stringify(
          row
            ? { revision: row.revision, vendor }
            : { requestId: request.current!.id, vendor },
        ),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save vendor.");
      if (e instanceof VendorRequestError && e.code === "CONFLICT")
        setStale(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <VendorDialog
      title={row ? "Edit vendor" : "Add vendor"}
      onClose={onClose}
      busy={busy}
    >
      <p className={styles.muted}>
        A private supplier record. Adding a vendor does not create an account or
        send an invitation.
      </p>
      {optionError ? (
        <p role="alert">
          {optionError}{" "}
          <button
            className={styles.secondary}
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry event choices
          </button>
        </p>
      ) : !options ? (
        <p role="status">Loading event choices…</p>
      ) : null}
      <form onSubmit={save}>
        <fieldset className={styles.fieldset} disabled={busy}>
          <label className={styles.field}>
            Vendor name
            <input
              name="name"
              required
              maxLength={180}
              defaultValue={row?.name ?? ""}
              autoFocus
            />
          </label>
          <label className={styles.field}>
            Category
            <select name="category" required defaultValue={row?.category ?? ""}>
              <option value="">Choose category</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {vendorLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <details className={styles.optional} open={Boolean(row)}>
            <summary>Contact, service and optional details</summary>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                Contact person
                <input
                  name="personName"
                  maxLength={120}
                  defaultValue={row?.contact.personName ?? ""}
                />
              </label>
              <label className={styles.field}>
                Phone
                <input
                  name="phone"
                  type="tel"
                  maxLength={40}
                  defaultValue={row?.contact.phone ?? ""}
                />
              </label>
              <label className={styles.field}>
                Email
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  defaultValue={row?.contact.email ?? ""}
                />
              </label>
              <label className={styles.field}>
                Service description
                <textarea
                  name="service"
                  maxLength={500}
                  defaultValue={row?.service ?? ""}
                />
              </label>
            </div>
            <fieldset className={styles.events}>
              <legend>Assigned events (optional)</legend>
              {options?.events.length === 0 ? (
                <p>No events yet. You can add a vendor without one.</p>
              ) : null}
              {row?.events
                .filter(
                  (event) =>
                    !options?.events.some((option) => option.id === event.id),
                )
                .map((event) => (
                  <label key={event.id}>
                    <input
                      name="eventIds"
                      type="checkbox"
                      value={event.id}
                      defaultChecked
                    />
                    {event.name} (previous selection)
                  </label>
                ))}
              {options?.events.map((event) => (
                <label key={event.id}>
                  <input
                    name="eventIds"
                    type="checkbox"
                    value={event.id}
                    defaultChecked={
                      row?.events.some((e) => e.id === event.id) ?? false
                    }
                  />
                  {event.name}
                </label>
              ))}
            </fieldset>
            <label className={styles.field}>
              Private notes
              <textarea
                name="notes"
                maxLength={2000}
                defaultValue={row?.notes ?? ""}
              />
            </label>
          </details>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button
              className={styles.primary}
              disabled={busy || stale || !options}
            >
              {busy ? "Saving…" : "Save vendor"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={onClose}
              disabled={busy}
            >
              {stale ? "Close and reload" : "Cancel"}
            </button>
          </div>
        </fieldset>
      </form>
    </VendorDialog>
  );
}

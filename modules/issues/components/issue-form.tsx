"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ISSUE_PRIORITIES,
  issueLabel,
  type IssueOptions,
  type IssueView,
} from "../issue.types";
import { IssueDialog } from "./issue-dialog";
import { issueFetch, IssueRequestError } from "./issue-client";
import styles from "./issues.module.css";
export function IssueForm({
  row,
  onClose,
  onSaved,
}: {
  row?: IssueView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [options, setOptions] = useState<IssueOptions | null>(null),
    [optionError, setOptionError] = useState(""),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const [eventId, setEventId] = useState(row?.eventId ?? ""),
    [vendorId, setVendorId] = useState(row?.vendorId ?? ""),
    [assignedToMemberId, setAssignee] = useState(row?.assignedToMemberId ?? "");
  const request = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    issueFetch<IssueOptions>("/api/v1/issues/options", {
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
    const f = new FormData(e.currentTarget),
      issue = {
        title: String(f.get("title") ?? ""),
        description: String(f.get("description") ?? ""),
        priority: String(f.get("priority") ?? "MEDIUM"),
        eventId: eventId || null,
        vendorId: vendorId || null,
        ...(row ? { assignedToMemberId: assignedToMemberId || null } : {}),
      };
    const signature = JSON.stringify(issue);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      await issueFetch(row ? `/api/v1/issues/${row.id}` : "/api/v1/issues", {
        method: row ? "PATCH" : "POST",
        body: JSON.stringify(
          row
            ? { revision: row.revision, issue }
            : { requestId: request.current!.id, issue },
        ),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save issue.");
      if (e instanceof IssueRequestError && e.code === "CONFLICT")
        setStale(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <IssueDialog
      title={row ? "Edit issue" : "Report an issue"}
      onClose={onClose}
      busy={busy}
    >
      <p className={styles.muted}>
        Describe a wedding problem. This does not create a task or send an
        email.
      </p>
      {optionError ? (
        <p role="alert" className={styles.error}>
          {optionError}
          <button
            className={styles.secondary}
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry choices
          </button>
        </p>
      ) : !options ? (
        <p role="status">Loading permitted choices…</p>
      ) : null}
      <form onSubmit={save}>
        <fieldset className={styles.fieldset} disabled={busy}>
          <label className={styles.field}>
            Title
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={row?.title ?? ""}
              autoFocus
            />
          </label>
          <label className={styles.field}>
            Description
            <textarea
              name="description"
              required
              maxLength={4000}
              rows={5}
              defaultValue={row?.description ?? ""}
            />
          </label>
          <label className={styles.field}>
            Priority
            <select name="priority" defaultValue={row?.priority ?? "MEDIUM"}>
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {issueLabel(p)}
                </option>
              ))}
            </select>
          </label>
          {options &&
          (options.events.length || options.vendors.length || row) ? (
            <details className={styles.optional} open={Boolean(row)}>
              <summary>Optional links and assignment</summary>
              {options.events.length || eventId ? (
                <label className={styles.field}>
                  Event
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                  >
                    <option value="">No event</option>
                    {eventId &&
                    !options.events.some((e) => e.id === eventId) ? (
                      <option value={eventId}>
                        {row?.eventName ?? "Linked event"} (previous selection)
                      </option>
                    ) : null}
                    {options.events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {options.vendors.length || vendorId ? (
                <label className={styles.field}>
                  Vendor
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  >
                    <option value="">No vendor</option>
                    {vendorId &&
                    !options.vendors.some((v) => v.id === vendorId) ? (
                      <option value={vendorId}>
                        {row?.vendorName ?? "Linked vendor"} (previous
                        selection)
                      </option>
                    ) : null}
                    {options.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {row ? (
                <label className={styles.field}>
                  Assigned member
                  <select
                    value={assignedToMemberId}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {assignedToMemberId &&
                    !options.members.some(
                      (m) => m.id === assignedToMemberId,
                    ) ? (
                      <option value={assignedToMemberId}>
                        {row.assigneeName ?? "Previous assignee"} (previous
                        selection)
                      </option>
                    ) : null}
                    {options.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <small>
                    New assignees must have wedding-wide issue access.
                  </small>
                </label>
              ) : null}
            </details>
          ) : null}
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
              {busy ? "Saving…" : "Save issue"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={onClose}
            >
              {stale ? "Close and reload" : "Cancel"}
            </button>
          </div>
        </fieldset>
      </form>
    </IssueDialog>
  );
}

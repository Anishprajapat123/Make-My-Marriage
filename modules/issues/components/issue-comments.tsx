"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { IssueComments } from "../issue.types";
import { issueFetch } from "./issue-client";
import styles from "./issues.module.css";
export function IssueDiscussion({
  issueId,
  canComment,
  timezone,
  onBusy,
}: {
  issueId: string;
  canComment: boolean;
  timezone: string;
  onBusy: (busy: boolean) => void;
}) {
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [data, setData] = useState<IssueComments | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState("");
  const request = useRef<{ body: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    issueFetch<IssueComments>(
      `/api/v1/issues/${issueId}/comments?page=${page}`,
      { signal: controller.signal },
    )
      .then((v) => {
        if (!controller.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [issueId, page, refresh]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    onBusy(true);
    setSaveError("");
    if (request.current?.body !== body)
      request.current = { body, id: crypto.randomUUID() };
    try {
      await issueFetch(`/api/v1/issues/${issueId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, requestId: request.current!.id }),
      });
      setBody("");
      request.current = null;
      setLoading(true);
      setError("");
      setPage(1);
      setRefresh((n) => n + 1);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso));
  return (
    <section className={styles.discussion}>
      <h3>Comments</h3>
      <p className={styles.muted}>
        Newest first. Comments are separate from the issue’s audit history.
      </p>
      {loading ? (
        <p role="status">Loading discussion…</p>
      ) : error ? (
        <p role="alert" className={styles.error}>
          {error}
          <button
            className={styles.secondary}
            onClick={() => {
              setLoading(true);
              setError("");
              setRefresh((n) => n + 1);
            }}
          >
            Retry comments
          </button>
        </p>
      ) : data?.comments.length ? (
        <>
          <ul className={styles.comments}>
            {data.comments.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.authorName}</strong>
                  <time dateTime={c.createdAt}>{when(c.createdAt)}</time>
                </div>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
          <nav className={styles.pager} aria-label="Comment pages">
            <button
              className={styles.secondary}
              disabled={page === 1 || busy}
              onClick={() => {
                setLoading(true);
                setError("");
                setPage((n) => n - 1);
              }}
            >
              Newer comments
            </button>
            <span>Page {page}</span>
            <button
              className={styles.secondary}
              disabled={!data.hasNext || busy}
              onClick={() => {
                setLoading(true);
                setError("");
                setPage((n) => n + 1);
              }}
            >
              Older comments
            </button>
          </nav>
        </>
      ) : (
        <p className={styles.muted}>No comments yet.</p>
      )}
      {canComment ? (
        <form onSubmit={send}>
          <label className={styles.field}>
            Add a comment
            <textarea
              required
              maxLength={2000}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
            />
          </label>
          {saveError ? (
            <p role="alert" className={styles.error}>
              {saveError} Your comment is kept here for retry.
            </p>
          ) : null}
          <button className={styles.primary} disabled={busy || !body.trim()}>
            {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import type { IssueHistory } from "../issue.types";
import { issueLabel } from "../issue.types";
import { issueFetch } from "./issue-client";
import styles from "./issues.module.css";
export function IssueAuditHistory({
  issueId,
  timezone,
}: {
  issueId: string;
  timezone: string;
}) {
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [data, setData] = useState<IssueHistory | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    issueFetch<IssueHistory>(
      `/api/v1/issues/${issueId}/activity?page=${page}`,
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
      <h3>Change history</h3>
      <p className={styles.muted}>
        An immutable record of issue actions, separate from comments.
      </p>
      <button
        className={styles.secondary}
        disabled={loading}
        onClick={() => {
          setLoading(true);
          setError("");
          setRefresh((n) => n + 1);
        }}
      >
        Refresh history
      </button>
      {loading ? (
        <p role="status">Loading history…</p>
      ) : error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : data?.entries.length ? (
        <>
          <ul className={styles.comments}>
            {data.entries.map((e) => (
              <li key={e.id}>
                <strong>{issueLabel(e.action)}</strong>
                <p>
                  {e.actorName} · {when(e.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <nav className={styles.pager} aria-label="History pages">
            <button
              className={styles.secondary}
              disabled={page === 1}
              onClick={() => {
                setLoading(true);
                setError("");
                setPage((n) => n - 1);
              }}
            >
              Newer history
            </button>
            <span>Page {page}</span>
            <button
              className={styles.secondary}
              disabled={!data.hasNext}
              onClick={() => {
                setLoading(true);
                setError("");
                setPage((n) => n + 1);
              }}
            >
              Older history
            </button>
          </nav>
        </>
      ) : (
        <p className={styles.muted}>No history entries yet.</p>
      )}
    </section>
  );
}

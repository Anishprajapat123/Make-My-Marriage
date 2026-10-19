"use client";
import { useEffect, useState } from "react";
import { taskFetch, taskDate } from "./task-ui";
import styles from "./tasks.module.css";
type Entry = {
  id: string;
  actorName: string;
  summary: string;
  createdAt: string;
};
export function TaskHistory({
  taskId,
  revision,
  timezone,
}: {
  taskId: string;
  revision: number;
  timezone: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    taskFetch<{ entries: Entry[]; hasMore: boolean }>(
      `/api/v1/tasks/${taskId}/activity?page=${page}`,
    )
      .then((d) => {
        if (active) {
          setEntries(d.entries);
          setHasMore(d.hasMore);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId, revision, page, refresh]);
  return (
    <section className={styles.panel}>
      <h2>Activity history</h2>
      {loading ? (
        <p role="status">Loading activity…</p>
      ) : error ? (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      ) : entries.length ? (
        entries.map((e) => (
          <div className={styles.comment} key={e.id}>
            <strong>{e.actorName}</strong>
            <p>{e.summary}</p>
            <time className={styles.muted} dateTime={e.createdAt}>
              {taskDate(e.createdAt, timezone)}
            </time>
          </div>
        ))
      ) : (
        <p className={styles.muted}>No activity recorded.</p>
      )}
      <button
        className={styles.secondary}
        disabled={loading}
        onClick={() => {
          setLoading(true);
          setPage(1);
          setRefresh((r) => r + 1);
        }}
      >
        Refresh activity
      </button>
      {(page > 1 || hasMore) && (
        <div className={styles.pager}>
          <button
            className={styles.secondary}
            disabled={page === 1 || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }}
          >
            Newer
          </button>
          <button
            className={styles.secondary}
            disabled={!hasMore || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
          >
            Older
          </button>
        </div>
      )}
    </section>
  );
}

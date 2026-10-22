"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ArrowRight, Check } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import type { NotificationList } from "../notification.types";
import {
  notificationFetch,
  NOTIFICATIONS_CHANGED,
} from "./notification-client";
import styles from "./notifications.module.css";
type Props = {
  canView: boolean;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
  timezone: string;
};
export function NotificationsScreen(props: Props) {
  const [unread, setUnread] = useState(false),
    [cursor, setCursor] = useState<string | null>(null),
    [history, setHistory] = useState<(string | null)[]>([]),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<NotificationList | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [actionError, setActionError] = useState("");
  function reload() {
    setCursor(null);
    setHistory([]);
    setRefresh((n) => n + 1);
  }
  useEffect(() => {
    if (!props.canView) return;
    const controller = new AbortController();
    let latest = 0;
    async function load() {
      const version = ++latest;
      setLoading(true);
      setError("");
      const query = new URLSearchParams({
        unread: String(unread),
        limit: "25",
      });
      if (cursor) query.set("cursor", cursor);
      try {
        const result = await notificationFetch<NotificationList>(
          `/api/v1/notifications?${query}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted && latest === version) {
          setData(result);
          if (!result.items.length && cursor) {
            setCursor(null);
            setHistory([]);
          }
        }
      } catch (e) {
        if (!controller.signal.aborted && latest === version) {
          setData(null);
          setError(
            e instanceof Error ? e.message : "Could not load notifications.",
          );
        }
      } finally {
        if (!controller.signal.aborted && latest === version) setLoading(false);
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => {
      controller.abort();
      window.removeEventListener("focus", load);
    };
  }, [props.canView, unread, cursor, refresh]);
  async function mark(id: string) {
    if (busy) return;
    setBusy(id);
    setActionError("");
    try {
      await notificationFetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        body: "{}",
      });
      reload();
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not mark notification read.",
      );
    } finally {
      setBusy(null);
    }
  }
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: props.timezone,
    }).format(new Date(iso));
  return (
    <WorkspaceShell
      activePage="Notifications"
      weddingTitle={props.weddingTitle}
      memberName={props.memberName}
      roleLabel={props.roleLabel}
    >
      <section className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Your wedding workspace</p>
            <h1>Notifications & Inbox</h1>
            <p className={styles.muted}>
              Task assignments, kept in one place. Opening this inbox does not
              mark items read.
            </p>
          </div>
          {props.canView ? (
            <button
              className={styles.secondary}
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </button>
          ) : null}
        </header>
        {!props.canView ? (
          <div className={styles.empty}>
            <Bell aria-hidden="true" />
            <h2>Workspace access required</h2>
            <p>An active wedding membership is needed to view your inbox.</p>
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <div role="group" aria-label="Notification filters">
                <button
                  className={unread ? styles.secondary : styles.primary}
                  aria-pressed={!unread}
                  onClick={() => {
                    setUnread(false);
                    setCursor(null);
                    setHistory([]);
                  }}
                >
                  All
                </button>
                <button
                  className={unread ? styles.primary : styles.secondary}
                  aria-pressed={unread}
                  onClick={() => {
                    setUnread(true);
                    setCursor(null);
                    setHistory([]);
                  }}
                >
                  Unread
                </button>
              </div>
              <span className={styles.muted}>
                {loading
                  ? "Updating inbox…"
                  : error
                    ? "Unread count unavailable"
                    : `${data?.unreadCount ?? 0} unread`}
              </span>
            </div>
            {actionError ? (
              <p role="alert" className={styles.error}>
                {actionError} Please retry the action.
              </p>
            ) : null}
            {loading ? (
              <p role="status" className={styles.empty}>
                Loading notifications…
              </p>
            ) : error ? (
              <div role="alert" className={styles.empty}>
                <p>{error}</p>
                <button className={styles.secondary} onClick={reload}>
                  Retry notifications
                </button>
              </div>
            ) : data?.items.length ? (
              <>
                <ul aria-label="Notifications" className={styles.list}>
                  {data.items.map((item) => (
                    <li
                      key={item.id}
                      className={`${styles.card} ${item.isRead ? "" : styles.unread}`}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.badge}>
                          {item.isRead ? "Read" : "Unread"}
                        </span>
                        <time dateTime={item.createdAt}>
                          {when(item.createdAt)}
                        </time>
                      </div>
                      <h2>{item.taskTitle ?? "Task no longer available"}</h2>
                      <p className={styles.muted}>
                        {item.taskHref
                          ? "A task was assigned to you."
                          : "The task may have been deleted, reassigned or restricted. Its private details are no longer shown here."}
                      </p>
                      <div className={styles.actions}>
                        {item.taskHref ? (
                          <Link className={styles.primary} href={item.taskHref}>
                            Open task
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        ) : null}
                        {!item.isRead ? (
                          <button
                            className={styles.secondary}
                            disabled={busy !== null}
                            onClick={() => mark(item.id)}
                          >
                            <Check size={16} aria-hidden="true" />
                            {busy === item.id ? "Saving…" : "Mark as read"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                <nav className={styles.pager} aria-label="Notification pages">
                  <button
                    className={styles.secondary}
                    disabled={!history.length || busy !== null}
                    onClick={() => {
                      setCursor(history[history.length - 1]);
                      setHistory((h) => h.slice(0, -1));
                    }}
                  >
                    Previous
                  </button>
                  <span>Page {history.length + 1}</span>
                  <button
                    className={styles.secondary}
                    disabled={!data.nextCursor || busy !== null}
                    onClick={() => {
                      setHistory((h) => [...h, cursor]);
                      setCursor(data.nextCursor);
                    }}
                  >
                    Next
                  </button>
                </nav>
              </>
            ) : (
              <div className={styles.empty}>
                <Bell size={30} aria-hidden="true" />
                <h2>
                  {unread ? "You’re all caught up" : "Your inbox is clear"}
                </h2>
                <p>
                  {unread
                    ? "No unread notifications right now."
                    : "New task assignments from other wedding members will appear here. Existing tasks are not backfilled."}
                </p>
              </div>
            )}
            <p className={styles.footnote}>
              Only your notifications in this wedding appear here. Task access
              is checked when the inbox loads and when you open a task. Refresh
              or return to the window for updates. No email or scheduled
              reminders are sent by this feature.
            </p>
          </>
        )}
      </section>
    </WorkspaceShell>
  );
}

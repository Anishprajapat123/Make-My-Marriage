"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import type { NotificationList } from "../notification.types";
import {
  notificationFetch,
  NOTIFICATIONS_CHANGED,
} from "./notification-client";
import styles from "./notifications.module.css";
export function NotificationBell() {
  const [count, setCount] = useState<number | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let latest = 0;
    const load = async () => {
      const version = ++latest;
      try {
        const data = await notificationFetch<NotificationList>(
          "/api/v1/notifications?limit=1",
          { signal: controller.signal },
        );
        if (!controller.signal.aborted && latest === version) {
          setCount(data.unreadCount);
          setFailed(false);
        }
      } catch {
        if (!controller.signal.aborted && latest === version) {
          setCount(null);
          setFailed(true);
        }
      }
    };
    void load();
    window.addEventListener("focus", load);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      controller.abort();
      window.removeEventListener("focus", load);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [retry]);
  return (
    <div className={styles.bellGroup}>
      <Link
        href="/notifications"
        className={styles.bell}
        aria-label={
          failed
            ? "Notifications, unread count unavailable"
            : count === null
              ? "Notifications, unread count loading"
              : `Notifications, ${count} unread`
        }
      >
        <Bell size={19} aria-hidden="true" />
        <span aria-hidden="true" className={styles.count}>
          {failed ? "!" : count === null ? "…" : count > 99 ? "99+" : count}
        </span>
      </Link>
      {failed ? (
        <button
          className={styles.retryCount}
          onClick={() => setRetry((v) => v + 1)}
          aria-label="Retry unread notification count"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

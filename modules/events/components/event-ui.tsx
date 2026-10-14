"use client";
import { useEffect, useState } from "react";
import type { EventView } from "../event.types";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import styles from "./events.module.css";
export type ScreenProps = {
  timezone: string;
  canManage?: boolean;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
};
export function EventsShell({
  children,
  ...props
}: ScreenProps & { children: React.ReactNode }) {
  return (
    <WorkspaceShell activePage="Events" {...props}>
      <div className={styles.page}>{children}</div>
    </WorkspaceShell>
  );
}
export async function eventFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success)
    throw new Error(
      body?.error?.message ??
        "We could not complete this request. Please try again.",
    );
  return body.data;
}
export function useEvent(eventId?: string) {
  const [event, setEvent] = useState<EventView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(eventId));
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    eventFetch<{ event: EventView }>(`/api/v1/events/${eventId}`)
      .then((data) => {
        if (active) {
          setEvent(data.event);
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
  }, [eventId, revision]);
  return {
    event,
    setEvent,
    error,
    loading,
    retry: () => {
      setError("");
      setLoading(true);
      setRevision((r) => r + 1);
    },
  };
}
export function FetchState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <div className={styles.empty}>
      {loading ? (
        <p role="status">Loading your celebration…</p>
      ) : (
        <>
          <h2>We couldn’t load this page</h2>
          <p role="alert">{error}</p>
          <button className={styles.secondary} onClick={retry}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}

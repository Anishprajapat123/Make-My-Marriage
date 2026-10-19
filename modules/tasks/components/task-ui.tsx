"use client";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { formatEventTime } from "@/lib/date/time";
import type { ReactNode } from "react";
import styles from "./tasks.module.css";
export type TasksProps = {
  timezone: string;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
  memberId: string;
  canManage: boolean;
  canUpdateAssigned: boolean;
};
export function TasksShell({
  children,
  ...props
}: TasksProps & { children: ReactNode }) {
  return (
    <WorkspaceShell activePage="Tasks" {...props}>
      <div className={styles.page}>{children}</div>
    </WorkspaceShell>
  );
}
export async function taskFetch<T>(
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
        "We couldn't complete this request. Please try again.",
    );
  return body.data;
}
export function taskDate(iso: string | null, timezone: string) {
  return iso ? formatEventTime(iso, timezone) : "No deadline";
}
export function TasksDenied() {
  return (
    <WorkspaceShell activePage="Tasks">
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1>Tasks access restricted</h1>
          <p>Ask your wedding owner for task access.</p>
          <a className={styles.secondary} href="/dashboard">
            Back to dashboard
          </a>
        </div>
      </div>
    </WorkspaceShell>
  );
}
export function TaskFetchState({
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
        <p role="status">Loading your tasks…</p>
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

"use client";
import { useEffect, useState } from "react";
import type { FamilyList, GuestList } from "../guest.types";
import styles from "./guests.module.css";
export class GuestRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: unknown = null,
  ) {
    super(message);
  }
}
export async function guestFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success)
    throw new GuestRequestError(
      body?.error?.message ??
        "We couldn't complete this request. Please try again.",
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.details,
    );
  return body.data;
}
export function Pager({
  page,
  total,
  limit = 25,
  busy = false,
  onPage,
}: {
  page: number;
  total: number;
  limit?: number;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  if (total <= limit && page === 1) return null;
  return (
    <nav className={styles.pager} aria-label="Result pages">
      <button
        className={styles.secondary}
        disabled={busy || page === 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        Previous
      </button>
      <span>
        Page {page} of {Math.max(1, Math.ceil(total / limit))}
      </span>
      <button
        className={styles.secondary}
        disabled={busy || page * limit >= total}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        Next
      </button>
    </nav>
  );
}
export function ReferencePicker({
  kind,
  familyId,
  selectedId,
  selectedLabel,
  onChange,
}: {
  kind: "family" | "contact";
  familyId?: string;
  selectedId: string | null;
  selectedLabel?: string | null;
  onChange: (id: string | null, label: string | null) => void;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [data, setData] = useState<{
    items: { id: string; name: string }[];
    total: number;
  }>({ items: [], total: 0 });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "10",
      });
      if (kind === "contact") {
        params.set("familyId", familyId!);
        params.set("status", "ACTIVE");
      }
      guestFetch<FamilyList | GuestList>(
        `/api/v1/${kind === "family" ? "families" : "guests"}?${params}`,
        { signal: controller.signal },
      )
        .then((result) => {
          if (!controller.signal.aborted)
            setData({
              items: "families" in result ? result.families : result.guests,
              total: result.total,
            });
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, page, refresh, kind, familyId]);
  const label = kind === "family" ? "Family" : "Primary contact";
  return (
    <details className={styles.picker}>
      <summary>
        {label}:{" "}
        {selectedId ? selectedLabel || "Selected guest" : "None selected"}
      </summary>
      <label className={styles.field}>
        Search {kind === "family" ? "families" : "family guests"}
        <input
          value={search}
          maxLength={180}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            setLoading(true);
          }}
        />
      </label>
      <button
        type="button"
        className={styles.secondary}
        onClick={() => onChange(null, null)}
      >
        Clear selection
      </button>
      {loading ? (
        <p role="status">Loading choices…</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => setRefresh((v) => v + 1)}>
            Retry choices
          </button>
        </p>
      ) : (
        <>
          {!data.items.length && (
            <p className={styles.muted}>
              No matching{" "}
              {kind === "family" ? "families" : "active guests in this family"}.
            </p>
          )}
          <div className={styles.choices}>
            {data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selectedId === item.id}
                className={`${styles.choice} ${selectedId === item.id ? styles.selected : ""}`}
                onClick={() => onChange(item.id, item.name)}
              >
                {item.name}
                {selectedId === item.id ? " · Selected" : ""}
              </button>
            ))}
          </div>
          <Pager
            page={page}
            total={data.total}
            limit={10}
            onPage={(p) => {
              setLoading(true);
              setPage(p);
            }}
          />
        </>
      )}
    </details>
  );
}
export const sideLabels = {
  BRIDE: "Bride's side",
  GROOM: "Groom's side",
  BOTH: "Both sides",
  OTHER: "Other / unspecified",
};
export const typeLabels = {
  PRIMARY: "Primary",
  COMPANION: "Companion",
  CHILD: "Child",
  OTHER: "Other",
};

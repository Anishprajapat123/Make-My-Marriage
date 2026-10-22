"use client";
export const NOTIFICATIONS_CHANGED = "mmm:notifications-changed";
export async function notificationFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success)
    throw new Error(
      body?.error?.message ??
        "Notifications could not be loaded. Please retry.",
    );
  return body.data as T;
}

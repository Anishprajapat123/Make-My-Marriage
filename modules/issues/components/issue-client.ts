"use client";
export class IssueRequestError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export async function issueFetch<T>(
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
    throw new IssueRequestError(
      body?.error?.message ??
        "The request could not be completed. Please retry.",
      body?.error?.code ?? "REQUEST_FAILED",
    );
  return body.data as T;
}

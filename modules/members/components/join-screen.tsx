"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./members.module.css";
export function JoinScreen({
  signedIn,
  signedInEmail = "",
}: {
  signedIn: boolean;
  signedInEmail?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<{
      accepted: boolean;
      weddingTitle: string;
      roles: string[];
    } | null>(null),
    [error, setError] = useState(""),
    [errorCode, setErrorCode] = useState(""),
    [loading, setLoading] = useState(signedIn),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetch("/api/v1/membership-invitation", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          if (active) setErrorCode(body?.error?.code ?? "");
          throw new Error(body?.error?.message ?? "Unable to load invitation.");
        }
        if (active) {
          setData(body.data);
          setError("");
          setErrorCode("");
        }
      })
      .catch((e) => {
        if (active) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [signedIn, revision]);
  async function accept() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/membership-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result?.error?.message ?? "Could not accept invitation.",
        );
      setData((d) => ({ ...d!, accepted: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function dismiss() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/membership-invitation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok)
        throw new Error("Could not dismiss the invitation. Please try again.");
      router.replace(signedIn ? "/dashboard" : "/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  async function switchAccount() {
    setBusy(true);
    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className={styles.join}>
      <p className={styles.eyebrow}>
        Make My Marriage · A celebration together
      </p>
      <h1>
        {data?.accepted
          ? "You’re part of the team."
          : "You’re invited to collaborate."}
      </h1>
      {signedIn && signedInEmail && (
        <p className={styles.muted}>
          Signed in as <strong>{signedInEmail}</strong>
        </p>
      )}
      {!signedIn ? (
        <>
          <p className={styles.muted}>
            Sign in with the invited email address, or create and verify your
            account, to review this invitation. Joining always requires your
            confirmation.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/login">
              Sign in
            </Link>
            <Link className={styles.secondary} href="/register">
              Create account
            </Link>
          </div>
          <p className={styles.muted}>
            If you verify email in another browser, reopen your original
            invitation link there before signing in.
          </p>
        </>
      ) : loading ? (
        <p role="status">Checking your invitation…</p>
      ) : (
        <>
          {error && (
            <p className={styles.alert} role="alert">
              {errorCode === "WRONG_ACCOUNT"
                ? "This invitation was sent to a different email address. Switch account and sign in using the address that received the invitation."
                : error}
            </p>
          )}
          {errorCode === "WRONG_ACCOUNT" && (
            <p className={styles.muted}>
              If you are already the wedding owner, you do not need to accept a
              collaborator invitation for your own workspace. Choose Continue to
              my workspace below. If the invitation email was entered
              incorrectly, ask the sender to revoke it and create one for the
              correct address.
            </p>
          )}
          {data && !data.accepted && (
            <>
              <h2>{data.weddingTitle}</h2>
              <p className={styles.muted}>
                You’ll join this wedding with these roles:
              </p>
              <ul>
                {data.roles.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className={styles.muted}>
                You can belong to one active or suspended wedding at a time.
                Accepting adds your account to this wedding; it does not create
                another wedding.
              </p>
              <button
                className={styles.primary}
                disabled={busy}
                onClick={accept}
              >
                {busy ? "Joining…" : "Accept invitation"}
              </button>
            </>
          )}
          {data?.accepted && (
            <>
              <p className={styles.success} role="status">
                Your wedding workspace is ready.
              </p>
              <Link className={styles.primary} href="/dashboard">
                Open wedding workspace
              </Link>
            </>
          )}
          {!data?.accepted && (
            <div className={styles.actions}>
              {errorCode !== "WRONG_ACCOUNT" && (
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => {
                    setLoading(true);
                    setRevision((v) => v + 1);
                  }}
                >
                  Retry invitation
                </button>
              )}
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={switchAccount}
              >
                {busy ? "Please wait…" : "Switch account"}
              </button>
            </div>
          )}
        </>
      )}
      {!data?.accepted && (
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={dismiss}
          >
            {signedIn ? "Continue to my workspace" : "Dismiss invitation"}
          </button>
        </div>
      )}
      {!signedIn && error && (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

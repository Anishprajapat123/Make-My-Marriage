"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import styles from "./sign-out-button.module.css";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    if (pending) return;

    setPending(true);
    setError("");

    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      setPending(false);
      setError("Sign-out couldn’t complete. Please try again.");
    }
  }

  return (
    <div className={styles.container}>
      <button
        aria-busy={pending}
        className={styles.button}
        disabled={pending}
        onClick={handleSignOut}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path
            d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10m4-3 4-4-4-4m4 4H9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        <span>{pending ? "Signing out…" : "Sign out"}</span>
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

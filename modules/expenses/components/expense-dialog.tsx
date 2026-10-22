"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./expenses.module.css";
export function ExpenseDialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      className={styles.dialog}
      ref={dialog}
      aria-labelledby="expense-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className={styles.dialogHeader}>
        <h2 id="expense-dialog-title">{title}</h2>
        <button
          className={styles.secondary}
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Close expense dialog"
        >
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}

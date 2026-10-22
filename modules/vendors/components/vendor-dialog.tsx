"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./vendors.module.css";
export function VendorDialog({
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement;
    el?.showModal();
    return () => {
      el?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="vendor-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className={styles.dialogHeader}>
        <h2 id="vendor-dialog-title">{title}</h2>
        <button className={styles.secondary} disabled={busy} onClick={onClose}>
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}

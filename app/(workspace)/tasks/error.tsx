"use client";
import Link from "next/link";
import styles from "@/modules/tasks/components/tasks.module.css";
export default function TasksError({ retry }: { retry: () => void }) {
  return (
    <section className={styles.page}>
      <div className={styles.empty}>
        <h1>Tasks are temporarily unavailable</h1>
        <p>Please try again in a moment.</p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={retry}>
            Try again
          </button>
          <Link href="/dashboard" className={styles.secondary}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

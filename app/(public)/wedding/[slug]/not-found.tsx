import Link from "next/link";
import styles from "@/components/layout/module-page.module.css";
export default function WeddingNotFound() {
  return (
    <main className={styles.screen}>
      <section className={styles.empty}>
        <p className={styles.eyebrow}>Make My Marriage</p>
        <h1>This celebration page is unavailable</h1>
        <p>
          The page may not be published, or the address may have changed. Check
          the link with the person who shared it.
        </p>
        <Link href="/" className={styles.button}>
          Back to Make My Marriage
        </Link>
      </section>
    </main>
  );
}

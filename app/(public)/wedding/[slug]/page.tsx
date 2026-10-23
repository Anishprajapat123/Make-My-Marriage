import Image from "next/image";
import { notFound } from "next/navigation";
import { Heart, MapPin, Shirt, ExternalLink } from "lucide-react";
import { publicWedding } from "@/modules/wedding/public-wedding.service";
import styles from "@/components/layout/module-page.module.css";
export const dynamic = "force-dynamic";
export default async function PublicWeddingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await publicWedding((await params).slug);
  if (!data) notFound();
  return (
    <main className={`${styles.screen} ${styles.public}`}>
      <nav className={styles.publicNav} aria-label="Wedding page">
        <a href="#welcome">
          {data.brideName} &amp; {data.groomName}
        </a>
        <span className={styles.eyebrow}>A celebration together</span>
      </nav>
      <header className={styles.publicHero} id="welcome">
        <div className={styles.monogram} aria-hidden="true">
          {data.brideName.slice(0, 1)} &amp; {data.groomName.slice(0, 1)}
        </div>
        <p className={styles.eyebrow}>The union of two families</p>
        <h1>{data.title}</h1>
        <h2>
          {data.brideName} &amp; {data.groomName}
        </h2>
        <p>
          {new Intl.DateTimeFormat("en-IN", {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(`${data.date}T00:00:00Z`))}{" "}
          · {data.city}
        </p>
        {data.description && (
          <p style={{ whiteSpace: "pre-wrap" }}>{data.description}</p>
        )}
        {data.hashtag && <span className={styles.badge}>{data.hashtag}</span>}
        <nav className={styles.tabs} aria-label="Celebration sections">
          <a href="#schedule">Schedule</a>
          {data.photos.length > 0 && <a href="#memories">Gallery</a>}
          {data.streams.length > 0 && <a href="#broadcasts">Livestreams</a>}
        </nav>
      </header>
      <section id="schedule" className={styles.publicSection}>
        <p className={styles.eyebrow}>Chronicle of celebrations</p>
        <h2>The Ceremonial Schedule</h2>
        <p className={styles.note}>
          All event times are shown in {data.timezone}.
        </p>
        {!data.events.length && (
          <div className={styles.empty}>
            The schedule will be shared here when ready.
          </div>
        )}
        <div className={styles.streamGrid}>
          {data.events.map((e) => (
            <article className={styles.panel} key={e.id}>
              <p className={styles.eyebrow}>
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: data.timezone,
                }).format(new Date(e.startAt))}
              </p>
              <h3>{e.name}</h3>
              <p className={styles.note}>
                <MapPin size={14} aria-hidden="true" /> {e.venue}
              </p>
              {e.dressCode && (
                <p className={styles.note}>
                  <Shirt size={14} aria-hidden="true" /> Dress code:{" "}
                  {e.dressCode}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
      {data.photos.length > 0 && (
        <section id="memories" className={styles.publicSection}>
          <p className={styles.eyebrow}>Visual anthology</p>
          <h2>Ceremonial Moments &amp; Memories</h2>
          <p className={styles.note}>
            A glimpse of the celebration, shared with love.
          </p>
          <div className={styles.grid}>
            {data.photos.map((p) => (
              <a
                className={styles.photo}
                key={p.id}
                href={p.optimized}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open celebration photo"
              >
                <Image
                  unoptimized
                  src={p.thumbnail}
                  alt="Celebration memory"
                  width={320}
                  height={320}
                />
              </a>
            ))}
          </div>
        </section>
      )}
      {data.streams.length > 0 && (
        <section id="broadcasts" className={styles.publicSection}>
          <p className={styles.eyebrow}>Together from afar</p>
          <h2>Join Us Remotely · Live Broadcasts</h2>
          <p className={styles.note}>
            Share the celebration from wherever you are.
          </p>
          <div className={styles.streamGrid}>
            {data.streams.map((s) => (
              <article className={styles.panel} key={s.id}>
                <p>
                  <span className={styles.badge}>
                    {s.status === "LIVE"
                      ? "● Live now"
                      : s.status === "ENDED"
                        ? "Ended"
                        : "Scheduled"}
                  </span>
                </p>
                <h3>{s.title}</h3>
                <p className={styles.note}>
                  Watch on YouTube. Video availability is controlled by the
                  host.
                </p>
                <div className={styles.actions}>
                  <a
                    className={styles.button}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch on YouTube
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer className={styles.publicFooter}>
        <Heart size={24} aria-hidden="true" />
        <h2>
          Celebrating {data.brideName} &amp; {data.groomName}
        </h2>
        <p className={styles.note}>Made with love · Make My Marriage</p>
      </footer>
    </main>
  );
}

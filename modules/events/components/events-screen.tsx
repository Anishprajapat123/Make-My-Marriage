"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, Plus } from "lucide-react";
import { EVENT_STATUSES, type EventView } from "../event.types";
import { formatEventTime, localParts } from "../event.time";
import {
  EventsShell,
  FetchState,
  eventFetch,
  type ScreenProps,
} from "./event-ui";
import styles from "./events.module.css";
export function EventsScreen(props: ScreenProps) {
  const [events, setEvents] = useState<EventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  useEffect(() => {
    let active = true;
    eventFetch<{ events: EventView[] }>("/api/v1/events")
      .then((d) => {
        if (active) {
          setEvents(d.events);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const filtered = events.filter(
    (e) =>
      e.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (filter === "ALL" ||
        (filter === "UPCOMING" &&
          e.status === "PUBLISHED" &&
          new Date(e.endAt ?? e.startAt) >= new Date()) ||
        e.status === filter),
  );
  const groups = Object.groupBy(
    filtered,
    (e) => localParts(e.startAt, props.timezone).date,
  );
  return (
    <EventsShell {...props}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Itinerary & schedule</span>
          <h1>Events</h1>
          <p className={styles.subtext}>
            Plan and coordinate every celebration.
          </p>
        </div>
        <div className={styles.actions}>
          <span className={styles.meta}>
            <Clock size={16} /> {props.timezone}
          </span>
          {props.canManage && (
            <Link className={styles.primary} href="/events/new">
              <Plus size={16} />
              Create event
            </Link>
          )}
        </div>
      </div>
      <p className={styles.notice}>
        Published events can appear in your enabled guest-facing schedule.
        Drafts stay within your planning workspace.
        {!props.canManage && " You have read-only access."}
      </p>
      {loading || error ? (
        <FetchState
          loading={loading}
          error={error}
          retry={() => {
            setLoading(true);
            setRevision((r) => r + 1);
          }}
        />
      ) : events.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.emptyIcon}>
            <CalendarDays size={28} />
          </div>
          <h2>No events scheduled yet</h2>
          <p>
            Bring your wedding celebrations into a shared timeline, from the
            first gathering to the reception.
          </p>
          {props.canManage ? (
            <Link className={styles.primary} href="/events/new">
              <Plus size={16} />
              Create your first event
            </Link>
          ) : (
            <p>A wedding organizer can add events to this workspace.</p>
          )}
        </section>
      ) : (
        <>
          <div className={styles.tools}>
            <label className={styles.search}>
              <span className="sr-only">Search events by name</span>
              <input
                placeholder="Search by event name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className={styles.filters}>
              {["ALL", "UPCOMING", ...EVENT_STATUSES].map((s) => (
                <button
                  aria-pressed={filter === s}
                  className={`${styles.chip} ${filter === s ? styles.selected : ""}`}
                  key={s}
                  onClick={() => setFilter(s)}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {!filtered.length ? (
            <section className={styles.empty}>
              <h2>No matching events</h2>
              <p>Try another name or reset the filters.</p>
              <button
                className={styles.secondary}
                onClick={() => {
                  setQuery("");
                  setFilter("ALL");
                }}
              >
                Reset filters
              </button>
            </section>
          ) : (
            Object.entries(groups).map(([date, items]) => (
              <section key={date} className={styles.group}>
                <div className={styles.day}>
                  <span className={styles.eyebrow}>The celebration</span>
                  <h3>
                    {new Intl.DateTimeFormat("en", {
                      timeZone: "UTC",
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(`${date}T12:00Z`))}
                  </h3>
                  <span className={styles.meta}>
                    {items!.length} {items!.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <div className={styles.cards}>
                  {items!.map((e) => (
                    <article key={e.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <div>
                          <div className={styles.actions}>
                            {e.ceremonyType && (
                              <span className={styles.badge}>
                                {e.ceremonyType}
                              </span>
                            )}
                            <span
                              className={styles.badge}
                              data-status={e.status}
                            >
                              {e.status}
                            </span>
                          </div>
                          <h3>{e.name}</h3>
                        </div>
                        <div className={styles.actions}>
                          <Link
                            href={`/events/${e.id}`}
                            className={styles.secondary}
                          >
                            View details
                          </Link>
                          {props.canManage && (
                            <Link
                              href={`/events/${e.id}/edit`}
                              className={styles.secondary}
                              aria-label={`Edit ${e.name}`}
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className={styles.cardInfo}>
                        <span className={styles.meta}>
                          <Clock size={16} />
                          <span>
                            {formatEventTime(e.startAt, props.timezone)}
                            {e.endAt && (
                              <> → {formatEventTime(e.endAt, props.timezone)}</>
                            )}
                          </span>
                        </span>
                        <span className={styles.meta}>
                          <MapPin size={16} />
                          {e.venue.name}, {e.venue.city}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </EventsShell>
  );
}

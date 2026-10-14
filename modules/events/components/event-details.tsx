"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Plus, CalendarDays } from "lucide-react";
import type { EventView } from "../event.types";
import { formatEventTime, localParts } from "../event.time";
import {
  EventsShell,
  FetchState,
  eventFetch,
  useEvent,
  type ScreenProps,
} from "./event-ui";
import styles from "./events.module.css";
type DialogState =
  { kind: "edit" | "deleteItem"; itemId?: string } | { kind: "deleteEvent" };
export function EventDetails(props: ScreenProps & { eventId: string }) {
  const { event, setEvent, error, loading, retry } = useEvent(props.eventId);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [modal, setModal] = useState<DialogState | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  function openModal(next: DialogState) {
    setFailure("");
    setModal(next);
  }
  useEffect(() => {
    if (modal) {
      dialogRef.current?.showModal();
    } else dialogRef.current?.close();
  }, [modal]);
  const item = event?.timelineItems.find(
    (i) => modal && "itemId" in modal && i.id === modal.itemId,
  );
  const when = item
    ? localParts(item.at, props.timezone)
    : event
      ? localParts(event.startAt, props.timezone)
      : { date: "", time: "" };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event || !modal || pending) return;
    setPending(true);
    setFailure("");
    try {
      const url = `/api/v1/events/${event.id}`;
      const version = `?updatedAt=${encodeURIComponent(event.updatedAt)}`;
      if (modal.kind === "deleteEvent") {
        await eventFetch(url + version, { method: "DELETE" });
        router.push("/events");
        router.refresh();
      } else if (modal.kind === "deleteItem") {
        const data = await eventFetch<{ event: EventView }>(
          `${url}/timeline/${modal.itemId}${version}`,
          { method: "DELETE" },
        );
        setEvent(data.event);
      } else {
        const values = new FormData(e.currentTarget);
        const data = await eventFetch<{ event: EventView }>(
          `${url}/timeline${modal.itemId ? `/${modal.itemId}` : ""}`,
          {
            method: modal.itemId ? "PATCH" : "POST",
            body: JSON.stringify({
              title: values.get("title"),
              date: values.get("date"),
              time: values.get("time"),
              note: values.get("note"),
              updatedAt: event.updatedAt,
            }),
          },
        );
        setEvent(data.event);
      }
      setModal(null);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setPending(false);
    }
  }
  return (
    <EventsShell {...props}>
      <Link className={styles.back} href="/events">
        <ArrowLeft size={16} />
        Back to Events
      </Link>
      {loading || error ? (
        <FetchState loading={loading} error={error} retry={retry} />
      ) : (
        event && (
          <>
            <div className={styles.heading}>
              <div>
                <div className={styles.actions}>
                  {event.ceremonyType && (
                    <span className={styles.badge}>{event.ceremonyType}</span>
                  )}
                  <span className={styles.badge} data-status={event.status}>
                    {event.status}
                  </span>
                </div>
                <h1>{event.name}</h1>
                <p className={styles.subtext}>{event.description}</p>
              </div>
              {props.canManage && (
                <div className={styles.actions}>
                  <Link
                    href={`/events/${event.id}/edit`}
                    className={styles.secondary}
                  >
                    Edit event
                  </Link>
                  <button
                    className={styles.danger}
                    onClick={() => openModal({ kind: "deleteEvent" })}
                  >
                    Delete event
                  </button>
                </div>
              )}
            </div>
            {!props.canManage && (
              <p className={styles.notice}>
                You have read-only access to this event.
              </p>
            )}
            <div className={styles.layout}>
              <section className={styles.card}>
                <div className={styles.heading}>
                  <h2>Event particulars</h2>
                  <span className={styles.meta}>
                    <Clock size={14} />
                    {props.timezone}
                  </span>
                </div>
                <div className={styles.fieldGrid}>
                  <div>
                    <span className={styles.eyebrow}>Date & time</span>
                    <p className={styles.detailText}>
                      {formatEventTime(event.startAt, props.timezone)}
                      {event.endAt && (
                        <> → {formatEventTime(event.endAt, props.timezone)}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className={styles.eyebrow}>Venue</span>
                    <p className={styles.detailText}>
                      {event.venue.name}
                      <br />
                      {event.venue.addressLine1}
                      <br />
                      {[
                        event.venue.city,
                        event.venue.state,
                        event.venue.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {event.venue.mapUrl && (
                      <a
                        className={styles.secondary}
                        href={event.venue.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin size={14} />
                        Open in Maps
                      </a>
                    )}
                  </div>
                </div>
                {event.dressCode && (
                  <>
                    <span className={styles.eyebrow}>Dress code</span>
                    <p className={styles.detailText}>{event.dressCode}</p>
                  </>
                )}
                {event.notes && (
                  <>
                    <span className={styles.eyebrow}>
                      Additional instructions
                    </span>
                    <p className={styles.detailText}>{event.notes}</p>
                  </>
                )}
              </section>
              <aside className={styles.card}>
                <span className={styles.eyebrow}>Good to know</span>
                <h3>One shared schedule</h3>
                <p className={styles.detailText}>
                  All wedding guests are invited to every event. Drafts stay
                  within your planning workspace.
                </p>
                {event.venue.directions && (
                  <>
                    <span className={styles.eyebrow}>Directions</span>
                    <p className={styles.detailText}>
                      {event.venue.directions}
                    </p>
                  </>
                )}
              </aside>
            </div>
            <section className={styles.section}>
              <div className={styles.heading}>
                <div>
                  <h2>Ceremony timeline</h2>
                  <p className={styles.subtext}>
                    A clear run of events, from preparation to the final moment.
                  </p>
                </div>
                {props.canManage && (
                  <button
                    className={styles.primary}
                    onClick={() => openModal({ kind: "edit" })}
                  >
                    <Plus size={16} />
                    Add timeline item
                  </button>
                )}
              </div>
              {!event.timelineItems.length ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    <CalendarDays size={24} />
                  </div>
                  <h2>The stage is quiet</h2>
                  <p>
                    No timeline items yet. Preparation activities can begin
                    before the event starts.
                  </p>
                  {props.canManage && (
                    <button
                      className={styles.secondary}
                      onClick={() => openModal({ kind: "edit" })}
                    >
                      Add the first milestone
                    </button>
                  )}
                </div>
              ) : (
                <ol className={styles.timeline}>
                  {event.timelineItems.map((i) => (
                    <li key={i.id}>
                      <article className={styles.card}>
                        <div className={styles.cardTop}>
                          <div>
                            <span className={styles.meta}>
                              {formatEventTime(i.at, props.timezone)}
                            </span>
                            <h3>{i.title}</h3>
                            <p className={styles.detailText}>{i.note}</p>
                          </div>
                          {props.canManage && (
                            <div className={styles.actions}>
                              <button
                                aria-label={`Edit ${i.title}`}
                                className={styles.secondary}
                                onClick={() =>
                                  openModal({ kind: "edit", itemId: i.id })
                                }
                              >
                                Edit
                              </button>
                              <button
                                aria-label={`Delete ${i.title}`}
                                className={styles.danger}
                                onClick={() =>
                                  openModal({
                                    kind: "deleteItem",
                                    itemId: i.id,
                                  })
                                }
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <dialog
              ref={dialogRef}
              className={styles.dialog}
              aria-labelledby="dialog-title"
              onCancel={(e) => {
                if (pending) e.preventDefault();
                else setModal(null);
              }}
              onClose={() => {
                if (!pending) setModal(null);
              }}
            >
              <form
                key={`${modal?.kind}-${item?.id ?? "new"}`}
                onSubmit={submit}
              >
                <h2 id="dialog-title">
                  {modal?.kind === "deleteEvent"
                    ? "Delete this event?"
                    : modal?.kind === "deleteItem"
                      ? "Delete this milestone?"
                      : item
                        ? "Edit timeline item"
                        : "Add timeline item"}
                </h2>
                {failure && (
                  <p className={styles.error} role="alert">
                    {failure}
                  </p>
                )}
                <fieldset
                  disabled={pending}
                  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
                >
                  {modal?.kind === "edit" ? (
                    <>
                      <div className={styles.field}>
                        <label htmlFor="milestone-title">Title *</label>
                        <input
                          id="milestone-title"
                          name="title"
                          defaultValue={item?.title ?? ""}
                          maxLength={160}
                          required
                          autoFocus
                        />
                      </div>
                      <div className={styles.fieldGrid}>
                        <div className={styles.field}>
                          <label htmlFor="milestone-date">Date *</label>
                          <input
                            id="milestone-date"
                            name="date"
                            type="date"
                            required
                            defaultValue={when.date}
                          />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor="milestone-time">Time *</label>
                          <input
                            id="milestone-time"
                            name="time"
                            type="time"
                            required
                            defaultValue={when.time}
                          />
                        </div>
                      </div>
                      <p className={styles.notice}>
                        Time zone: {props.timezone}. Preparation can take place
                        before the event starts.
                      </p>
                      <div className={styles.field}>
                        <label htmlFor="milestone-note">Note (optional)</label>
                        <textarea
                          id="milestone-note"
                          name="note"
                          maxLength={1000}
                          defaultValue={item?.note ?? ""}
                        />
                      </div>
                    </>
                  ) : (
                    <p className={styles.detailText}>
                      {modal?.kind === "deleteEvent"
                        ? "This event and its timeline items will be permanently removed. Events with linked records cannot be deleted; reassign or remove those links first."
                        : `“${item?.title}” will be permanently removed from this timeline.`}
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setModal(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={
                        modal?.kind === "edit" ? styles.primary : styles.danger
                      }
                    >
                      {pending
                        ? "Saving…"
                        : modal?.kind === "edit"
                          ? "Save milestone"
                          : "Confirm delete"}
                    </button>
                  </div>
                </fieldset>
              </form>
            </dialog>
          </>
        )
      )}
    </EventsShell>
  );
}

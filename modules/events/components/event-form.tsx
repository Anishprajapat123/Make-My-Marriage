"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { eventInputSchema, type EventInput } from "../event.schema";
import { EVENT_STATUSES, type EventView } from "../event.types";
import { localParts } from "../event.time";
import {
  EventsShell,
  FetchState,
  eventFetch,
  useEvent,
  type ScreenProps,
} from "./event-ui";
import styles from "./events.module.css";
export function EventForm(props: ScreenProps & { eventId?: string }) {
  const { event, error, loading, retry } = useEvent(props.eventId);
  return (
    <EventsShell {...props}>
      <Link
        className={styles.back}
        href={props.eventId ? `/events/${props.eventId}` : "/events"}
      >
        <ArrowLeft size={16} />
        Back to {props.eventId ? "event" : "Events"}
      </Link>
      {props.eventId && (loading || error) ? (
        <FetchState loading={loading} error={error} retry={retry} />
      ) : (
        <FormContent key={event?.updatedAt ?? "new"} {...props} event={event} />
      )}
    </EventsShell>
  );
}
function FormContent({
  event,
  timezone,
}: ScreenProps & { event: EventView | null; eventId?: string }) {
  const router = useRouter();
  const start = event
    ? localParts(event.startAt, timezone)
    : { date: "", time: "" };
  const end = event?.endAt
    ? localParts(event.endAt, timezone)
    : { date: "", time: "" };
  const [form, setForm] = useState<EventInput>({
    name: event?.name ?? "",
    ceremonyType: event?.ceremonyType ?? "",
    description: event?.description ?? "",
    date: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    status: event?.status ?? "DRAFT",
    dressCode: event?.dressCode ?? "",
    notes: event?.notes ?? "",
    venue: event?.venue ?? {
      name: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      mapUrl: "",
      directions: "",
    },
    updatedAt: event?.updatedAt,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  function update(path: string, value: string) {
    setError("");
    setErrors((e) => ({ ...e, [path]: "" }));
    setForm((f) =>
      path.startsWith("venue.")
        ? { ...f, venue: { ...f.venue, [path.slice(6)]: value } }
        : { ...f, [path]: value },
    );
  }
  const field = (
    path: string,
    label: string,
    type = "text",
    required = false,
    maxLength = 160,
  ) => {
    const value = path.startsWith("venue.")
      ? form.venue[path.slice(6) as keyof EventInput["venue"]]
      : form[path as keyof EventInput];
    return (
      <div className={styles.field}>
        <label htmlFor={path}>
          {label}
          {required ? " *" : " (optional)"}
        </label>
        {type === "textarea" ? (
          <textarea
            id={path}
            value={String(value ?? "")}
            maxLength={maxLength}
            onChange={(e) => update(path, e.target.value)}
            aria-invalid={!!errors[path]}
            aria-describedby={errors[path] ? `${path}-error` : undefined}
          />
        ) : (
          <input
            id={path}
            type={type}
            value={String(value ?? "")}
            maxLength={maxLength}
            required={required}
            onChange={(e) => update(path, e.target.value)}
            aria-invalid={!!errors[path]}
            aria-describedby={errors[path] ? `${path}-error` : undefined}
          />
        )}{" "}
        {errors[path] && (
          <span id={`${path}-error`} role="alert" className={styles.error}>
            {errors[path]}
          </span>
        )}
      </div>
    );
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const button = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement;
    const input = {
      ...form,
      status: button?.value === "DRAFT" ? "DRAFT" : form.status,
    };
    const p = eventInputSchema.safeParse(input);
    if (!p.success) {
      setErrors(
        Object.fromEntries(
          p.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      );
      setError("Please check the highlighted fields.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await eventFetch<{ event: EventView }>(
        event ? `/api/v1/events/${event.id}` : "/api/v1/events",
        { method: event ? "PATCH" : "POST", body: JSON.stringify(p.data) },
      );
      router.push(`/events/${result.event.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            Your celebration, thoughtfully planned
          </span>
          <h1>{event ? "Edit event" : "Create event"}</h1>
          <p className={styles.subtext}>
            Set the details that bring everyone together.
          </p>
        </div>
      </div>
      <p className={styles.notice}>
        <Clock size={14} style={{ display: "inline", marginRight: 8 }} />
        All dates and times use your wedding time zone: {timezone}.
      </p>
      <div className={styles.layout}>
        <form onSubmit={submit} className={styles.card}>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <fieldset
            disabled={pending}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            {field("name", "Event name", "text", true)}
            <div className={styles.fieldGrid}>
              {field("ceremonyType", "Ceremony type")}
              <div className={styles.field}>
                <label htmlFor="status">Event status *</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {field("description", "Description", "textarea", false, 2000)}
            <section className={styles.section}>
              <h2>Date & schedule</h2>
              <div className={styles.fieldGrid}>
                {field("date", "Start date", "date", true)}
                {field("startTime", "Start time", "time", true)}
                {field("endDate", "End date", "date")}
                {field("endTime", "End time", "time")}
              </div>
              <p className={styles.subtext}>
                For an overnight event, choose the following date for its end.
                Leave both end fields empty if the finish time is undecided.
              </p>
            </section>
            <section className={styles.section}>
              <h2>Venue & location</h2>
              {field("venue.name", "Venue name", "text", true)}
              {field("venue.addressLine1", "Address", "text", true, 300)}
              <div className={styles.fieldGrid}>
                {field("venue.city", "City", "text", true, 120)}
                {field("venue.state", "State", "text", false, 120)}
              </div>
              {field("venue.postalCode", "Postal code", "text", false, 20)}
              {field("venue.mapUrl", "Map URL", "url", false, 2048)}
              {field("venue.directions", "Directions", "textarea", false, 1000)}
            </section>
            <section className={styles.section}>
              <h2>Guest guidance</h2>
              {field("dressCode", "Dress code", "text", false, 300)}
              {field(
                "notes",
                "Additional instructions",
                "textarea",
                false,
                2000,
              )}
            </section>
            <p className={styles.notice}>
              All wedding guests are invited to every event. Published events
              can appear in your enabled guest-facing schedule; drafts remain
              within the workspace.
            </p>
            <div className={styles.formFooter}>
              <Link
                href={event ? `/events/${event.id}` : "/events"}
                className={styles.secondary}
              >
                Cancel
              </Link>
              <div className={styles.actions}>
                <button
                  type="submit"
                  name="save"
                  value="selected"
                  className={styles.primary}
                >
                  {pending
                    ? "Saving…"
                    : event
                      ? "Save changes"
                      : form.status === "PUBLISHED"
                        ? "Publish event"
                        : "Save event"}
                </button>
                <button
                  type="submit"
                  name="save"
                  value="DRAFT"
                  className={styles.secondary}
                >
                  Save as draft
                </button>
              </div>
            </div>
          </fieldset>
        </form>
        <aside className={styles.card}>
          <span className={styles.eyebrow}>Schedule preview</span>
          <h3>{form.name || "Your next celebration"}</h3>
          <span className={styles.badge} data-status={form.status}>
            {form.status}
          </span>
          <p className={styles.detailText}>
            {form.date || "Choose a start date"} {form.startTime}
            {form.endDate && ` → ${form.endDate} ${form.endTime}`}
          </p>
          <p className={styles.detailText}>
            {form.venue.name || "Venue to be decided"}
            <br />
            {form.venue.city}
          </p>
          {form.dressCode && (
            <p className={styles.detailText}>Dress code: {form.dressCode}</p>
          )}
          <p className={styles.subtext}>
            Add ceremony milestones from the event details page after saving.
          </p>
        </aside>
      </div>
    </>
  );
}

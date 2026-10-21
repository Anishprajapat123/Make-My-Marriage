"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  guestFetch,
  GuestRequestError,
} from "@/modules/guests/components/guest-ui";
import { formatEventTime } from "@/lib/date/time";
import type { PublicInvitation } from "../invitation.types";
import styles from "./public-invitation.module.css";
type Companion = {
  clientId: string;
  name: string;
  guestType: "COMPANION" | "CHILD";
  attending: boolean;
  existing: boolean;
};
function safeMap(url: string) {
  try {
    const value = new URL(url);
    return ["https:", "http:"].includes(value.protocol)
      ? value.toString()
      : null;
  } catch {
    return null;
  }
}
export function PublicInvitationScreen({ token }: { token: string }) {
  const [data, setData] = useState<PublicInvitation | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [attendance, setAttendance] = useState<"YES" | "NO" | "">(""),
    [companions, setCompanions] = useState<Companion[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [duplicate, setDuplicate] = useState<string | null>(null);
  const request = useRef<{ key: string; id: string } | null>(null);
  const endpoint = `/api/v1/public/invitations/${encodeURIComponent(token)}`;
  const apply = useCallback((value: PublicInvitation) => {
    setData(value);
    setAttendance(value.rsvp.response === "PENDING" ? "" : value.rsvp.response);
    setCompanions(value.rsvp.companions.map((c) => ({ ...c, existing: true })));
    setDuplicate(null);
    request.current = null;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    guestFetch<PublicInvitation>(endpoint, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          apply(value);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, refresh, apply]);
  const hi = data?.invitation.language === "hi";
  function reload() {
    setLoading(true);
    setNotice("");
    setRefresh((v) => v + 1);
  }
  function changed() {
    setDuplicate(null);
    setNotice("");
  }
  async function submit(confirmation?: string) {
    if (!data || busy) return;
    if (!attendance) {
      setError(
        hi
          ? "कृपया अपना उत्तर चुनें।"
          : "Please choose whether you will attend.",
      );
      return;
    }
    const selected =
      attendance === "YES"
        ? companions
            .filter((c) => c.attending)
            .map(({ clientId, name, guestType }) => ({
              clientId,
              name,
              guestType,
            }))
        : [];
    if (selected.some((c) => !c.name.trim())) {
      setError("Enter a name for each attending companion.");
      return;
    }
    const body = {
      attendance,
      revision: data.rsvp.revision,
      companions: selected,
    };
    const key = JSON.stringify(body);
    if (request.current?.key !== key)
      request.current = { key, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await guestFetch(`${endpoint}/rsvp`, {
        method: "POST",
        body: JSON.stringify({
          ...body,
          requestId: request.current!.id,
          ...(confirmation ? { duplicateConfirmation: confirmation } : {}),
        }),
      });
      const latest = await guestFetch<PublicInvitation>(endpoint);
      apply(latest);
      setNotice(
        hi
          ? "धन्यवाद! आपका उत्तर सहेज लिया गया है।"
          : "Thank you! Your response is saved. You can update it using this same link.",
      );
    } catch (e) {
      if (
        e instanceof GuestRequestError &&
        e.code === "COMPANION_REVIEW_REQUIRED"
      )
        setDuplicate((e.details as { confirmation: string }).confirmation);
      else {
        setError(
          e instanceof Error ? e.message : "Could not save your response.",
        );
        if (
          e instanceof GuestRequestError &&
          e.code === "INVITATION_UNAVAILABLE"
        )
          setData(null);
      }
    } finally {
      setBusy(false);
    }
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }
  return (
    <main className={styles.page}>
      <header className={styles.brand}>
        Make My Marriage <span>A celebration together</span>
      </header>
      {loading ? (
        <section className={styles.state} role="status">
          Opening your invitation…
        </section>
      ) : !data ? (
        <section className={styles.state}>
          <h1>We couldn’t open this invitation</h1>
          <p role="alert">
            {error || "Please ask the wedding host for a new link."}
          </p>
          <button onClick={reload}>Try again</button>
          <p>This guest invitation does not require an account.</p>
        </section>
      ) : (
        <>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>
              {hi ? "आप सादर आमंत्रित हैं" : "You are warmly invited"}
            </p>
            <h1>
              {data.wedding.bride}
              <em>&</em>
              {data.wedding.groom}
            </h1>
            <p className={styles.date}>
              {data.wedding.date} · {data.wedding.city}
            </p>
            <div className={styles.divider} />
            <h2>{data.invitation.title}</h2>
            <p className={styles.welcome}>{data.invitation.welcomeMessage}</p>
            <p className={styles.guest}>
              {hi ? "प्रिय" : "Dear"} {data.guest.name},{" "}
              {hi
                ? "हमारे साथ इस खास दिन का हिस्सा बनें।"
                : "we would love to celebrate with you."}
            </p>
            <a className={styles.primary} href="#rsvp">
              {hi ? "अपना उत्तर दें" : "Respond to invitation"}
            </a>
          </section>
          {data.invitation.story && (
            <section className={styles.story}>
              <p className={styles.eyebrow}>
                {hi ? "हमारी कहानी" : "A note from us"}
              </p>
              <p>{data.invitation.story}</p>
            </section>
          )}
          <section className={styles.events}>
            <p className={styles.eyebrow}>
              {hi ? "समारोह" : "The celebrations"}
            </p>
            <h2>{hi ? "हमारे साथ उत्सव मनाएं" : "Come celebrate with us"}</h2>
            <p className={styles.muted}>
              {hi
                ? "आप सभी प्रकाशित समारोहों में आमंत्रित हैं।"
                : "You are invited to every published event."}{" "}
              · {data.wedding.timezone}
            </p>
            {!data.events.length ? (
              <p>The host will share the event schedule soon.</p>
            ) : (
              <div className={styles.eventGrid}>
                {data.events.map((event) => (
                  <article key={event.id}>
                    <h3>{event.name}</h3>
                    <p className={styles.eventTime}>
                      {formatEventTime(event.startAt, data.wedding.timezone)}
                      {event.endAt && (
                        <>
                          {" "}
                          —{" "}
                          {formatEventTime(event.endAt, data.wedding.timezone)}
                        </>
                      )}
                    </p>
                    {event.description && <p>{event.description}</p>}
                    <strong>{event.venue.name}</strong>
                    <p>
                      {event.venue.addressLine1}, {event.venue.city}
                    </p>
                    {event.dressCode && <p>Dress code: {event.dressCode}</p>}
                    {event.venue.directions && <p>{event.venue.directions}</p>}
                    {safeMap(event.venue.mapUrl) && (
                      <a
                        href={safeMap(event.venue.mapUrl)!}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        View directions ↗
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className={styles.rsvp} id="rsvp">
            <p className={styles.eyebrow}>RSVP</p>
            <h2>{hi ? "क्या आप आ रहे हैं?" : "Will you join us?"}</h2>
            <p className={styles.muted}>
              {hi
                ? "साइन इन करने की आवश्यकता नहीं है।"
                : "No sign-in needed. This response is for you and the named companions you add below."}
            </p>
            {notice && (
              <p className={styles.success} role="status">
                {notice}
              </p>
            )}
            <form onSubmit={onSubmit}>
              <fieldset disabled={busy}>
                <legend className={styles.srOnly}>
                  {hi ? "अपना उत्तर चुनें" : "Choose your response"}
                </legend>
                <div className={styles.responseChoices}>
                  <label className={attendance === "YES" ? styles.chosen : ""}>
                    <input
                      type="radio"
                      name="attendance"
                      value="YES"
                      checked={attendance === "YES"}
                      onChange={() => {
                        setAttendance("YES");
                        changed();
                      }}
                    />
                    {hi ? "हाँ, मैं आऊंगा/आऊंगी" : "Yes, I’ll be there"}
                  </label>
                  <label className={attendance === "NO" ? styles.chosen : ""}>
                    <input
                      type="radio"
                      name="attendance"
                      value="NO"
                      checked={attendance === "NO"}
                      onChange={() => {
                        setAttendance("NO");
                        changed();
                      }}
                    />
                    {hi
                      ? "क्षमा करें, मैं नहीं आ सकता/सकती"
                      : "Sorry, I can’t attend"}
                  </label>
                </div>
                {attendance === "YES" && data.rsvp.canAddCompanions && (
                  <div className={styles.party}>
                    <h3>{hi ? "साथ आने वाले अतिथि" : "Your companions"}</h3>
                    <p className={styles.muted}>
                      Add each person by name, including children. Up to 10
                      companions can attend with you. Do not add people already
                      invited separately; contact the host if unsure.
                    </p>
                    {companions.map((c, index) => (
                      <article className={styles.companion} key={c.clientId}>
                        <label className={styles.check}>
                          <input
                            type="checkbox"
                            checked={c.attending}
                            onChange={(e) => {
                              setCompanions((rows) =>
                                rows.map((r) =>
                                  r.clientId === c.clientId
                                    ? { ...r, attending: e.target.checked }
                                    : r,
                                ),
                              );
                              changed();
                            }}
                          />{" "}
                          Include companion {index + 1}
                        </label>
                        <div className={styles.fields}>
                          <label>
                            Companion name
                            <input
                              maxLength={180}
                              required={c.attending}
                              value={c.name}
                              readOnly={c.existing}
                              onChange={(e) => {
                                setCompanions((rows) =>
                                  rows.map((r) =>
                                    r.clientId === c.clientId
                                      ? { ...r, name: e.target.value }
                                      : r,
                                  ),
                                );
                                changed();
                              }}
                            />
                          </label>
                          <label>
                            Guest type
                            <select
                              value={c.guestType}
                              disabled={c.existing}
                              onChange={(e) => {
                                setCompanions((rows) =>
                                  rows.map((r) =>
                                    r.clientId === c.clientId
                                      ? {
                                          ...r,
                                          guestType: e.target
                                            .value as Companion["guestType"],
                                        }
                                      : r,
                                  ),
                                );
                                changed();
                              }}
                            >
                              <option value="COMPANION">Companion</option>
                              <option value="CHILD">Child</option>
                            </select>
                          </label>
                        </div>
                        {c.existing ? (
                          <small>
                            Ask the host to change saved guest names. Uncheck to
                            mark this person as not attending.
                          </small>
                        ) : (
                          <button
                            type="button"
                            className={styles.secondary}
                            onClick={() => {
                              setCompanions((rows) =>
                                rows.filter((r) => r.clientId !== c.clientId),
                              );
                              changed();
                            }}
                          >
                            Remove companion
                          </button>
                        )}
                      </article>
                    ))}
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={
                        companions.length >= 20 ||
                        companions.filter((c) => c.attending).length >= 10
                      }
                      onClick={() => {
                        setCompanions((rows) => [
                          ...rows,
                          {
                            clientId: crypto.randomUUID(),
                            name: "",
                            guestType: "COMPANION",
                            attending: true,
                            existing: false,
                          },
                        ]);
                        changed();
                      }}
                    >
                      +{" "}
                      {hi ? "साथ आने वाला अतिथि जोड़ें" : "Add named companion"}
                    </button>
                    <p className={styles.muted}>
                      {1 + companions.filter((c) => c.attending).length}{" "}
                      individual people attending in this response.
                    </p>
                  </div>
                )}
              </fieldset>
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={() => {
                      reload();
                    }}
                  >
                    Reload invitation / discard edits
                  </button>
                </div>
              )}
              {duplicate && (
                <div className={styles.warning} role="alert">
                  <h3>Please check these additional guests</h3>
                  <p>
                    Some names may already be in the wedding’s guest records. If
                    they are already invited, ask the host before adding them
                    again. No other guest’s private details are shown here.
                  </p>
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => setDuplicate(null)}
                  >
                    Return to editing
                  </button>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={busy}
                    onClick={() => submit(duplicate)}
                  >
                    Confirm additional people and submit
                  </button>
                </div>
              )}
              {!duplicate && (
                <button
                  className={styles.primary}
                  disabled={busy || !attendance}
                >
                  {busy ? "Saving…" : hi ? "उत्तर सहेजें" : "Save my RSVP"}
                </button>
              )}
            </form>
          </section>
          <footer className={styles.footer}>
            This invitation link is personal. Please share it only with your own
            party.
            <br />
            With love, {data.wedding.bride} & {data.wedding.groom}
          </footer>
        </>
      )}
    </main>
  );
}

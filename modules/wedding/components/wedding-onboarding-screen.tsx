"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flower2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import styles from "./wedding-onboarding-screen.module.css";

type WeddingForm = {
  brideName: string;
  groomName: string;
  title: string;
  weddingDate: string;
  city: string;
  timezone: string;
  language: "en" | "hi";
};

const initialForm: WeddingForm = {
  brideName: "",
  groomName: "",
  title: "",
  weddingDate: "",
  city: "",
  timezone: "Asia/Kolkata",
  language: "en",
};

const timezoneSuggestions = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Kathmandu",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

function formatWeddingDate(date: string) {
  if (!date) return "Not selected";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export function WeddingOnboardingScreen({
  accessPaused = false,
}: {
  accessPaused?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function continueToReview() {
    if (formRef.current?.reportValidity()) {
      setStep(2);
      setError("");
    }
  }

  async function createWedding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wedding: form }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error?.message ??
            "We couldn’t create your wedding workspace. Please try again.",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "We couldn’t reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link
          aria-label="Make My Marriage home"
          className={styles.brand}
          href="/"
        >
          <span aria-hidden="true" className={styles.brandMark}>
            <Flower2 size={20} strokeWidth={1.5} />
          </span>
          <span>Make My Marriage</span>
        </Link>
        <SignOutButton />
      </header>

      {accessPaused ? (
        <section aria-labelledby="paused-title" className={styles.pausedCard}>
          <div className={styles.introEyebrow}>WORKSPACE ACCESS</div>
          <h1 id="paused-title">Your access is paused.</h1>
          <p>
            This account already has a suspended wedding membership. Contact a
            wedding owner to restore access before creating or joining another
            workspace.
          </p>
        </section>
      ) : (
        <div className={styles.content}>
          <section className={styles.intro}>
            <div className={styles.introEyebrow}>A SHARED PLACE TO BEGIN</div>
            <h1>Create your wedding workspace.</h1>
            <p>
              Start with the details that bring your celebration into focus. You
              can add events, invite family, and build your guest list next.
            </p>
            <div className={styles.privacyNote}>
              <ShieldCheck aria-hidden="true" size={18} />
              <span>
                You’re in control of who joins your planning workspace.
              </span>
            </div>
          </section>

          <section aria-labelledby="setup-title" className={styles.formCard}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.stepCaption}>
                  WEDDING SETUP · STEP {step} OF 2
                </span>
                <h2 id="setup-title">
                  {step === 1 ? "The wedding basics" : "Review your details"}
                </h2>
              </div>
              <div aria-label={`Step ${step} of 2`} className={styles.progress}>
                <span className={styles.progressActive} />
                <span className={step === 2 ? styles.progressActive : ""} />
              </div>
            </div>

            {step === 1 ? (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  continueToReview();
                }}
                ref={formRef}
              >
                <div className={styles.coupleFields}>
                  <div className={styles.field}>
                    <label htmlFor="brideName">Bride’s name</label>
                    <input
                      autoComplete="given-name"
                      id="brideName"
                      maxLength={120}
                      minLength={2}
                      name="brideName"
                      onChange={updateField}
                      placeholder="e.g. Priya Sharma"
                      required
                      value={form.brideName}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="groomName">Groom’s name</label>
                    <input
                      autoComplete="off"
                      id="groomName"
                      maxLength={120}
                      minLength={2}
                      name="groomName"
                      onChange={updateField}
                      placeholder="e.g. Anish Prajapat"
                      required
                      value={form.groomName}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="title">Wedding name</label>
                  <input
                    autoComplete="off"
                    id="title"
                    maxLength={160}
                    minLength={2}
                    name="title"
                    onChange={updateField}
                    placeholder="e.g. Priya & Anish’s Wedding"
                    required
                    value={form.title}
                  />
                  <span className={styles.hint}>
                    This is how your celebration will appear in the workspace.
                  </span>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="weddingDate">Wedding date</label>
                    <input
                      id="weddingDate"
                      name="weddingDate"
                      onChange={updateField}
                      required
                      type="date"
                      value={form.weddingDate}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="city">Wedding city</label>
                    <div className={styles.inputWithIcon}>
                      <MapPin aria-hidden="true" size={17} />
                      <input
                        autoComplete="address-level2"
                        id="city"
                        maxLength={120}
                        minLength={2}
                        name="city"
                        onChange={updateField}
                        placeholder="e.g. Jaipur"
                        required
                        value={form.city}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="timezone">Time zone</label>
                    <input
                      autoComplete="off"
                      id="timezone"
                      list="timezone-suggestions"
                      maxLength={80}
                      name="timezone"
                      onChange={updateField}
                      placeholder="Asia/Kolkata"
                      required
                      value={form.timezone}
                    />
                    <datalist id="timezone-suggestions">
                      {timezoneSuggestions.map((timezone) => (
                        <option key={timezone} value={timezone} />
                      ))}
                    </datalist>
                    <span className={styles.hint}>
                      Used for local event times and reminders.
                    </span>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="language">Preferred language</label>
                    <select
                      id="language"
                      name="language"
                      onChange={updateField}
                      value={form.language}
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>

                <div aria-live="polite" className={styles.formMessage}>
                  {error ? <p role="alert">{error}</p> : null}
                </div>

                <div className={styles.actions}>
                  <span className={styles.requiredNote}>
                    All fields are required
                  </span>
                  <button className={styles.primaryButton} type="submit">
                    Review details <ArrowRight aria-hidden="true" size={17} />
                  </button>
                </div>
              </form>
            ) : (
              <form className={styles.form} onSubmit={createWedding}>
                <p className={styles.reviewIntro}>
                  You’ll become the owner of this wedding workspace. You can
                  invite members and add more details later.
                </p>
                <dl className={styles.reviewList}>
                  <div>
                    <dt>The couple</dt>
                    <dd>
                      {form.brideName} &amp; {form.groomName}
                    </dd>
                  </div>
                  <div>
                    <dt>Wedding name</dt>
                    <dd>{form.title}</dd>
                  </div>
                  <div>
                    <dt>Date and city</dt>
                    <dd>
                      {formatWeddingDate(form.weddingDate)} · {form.city}
                    </dd>
                  </div>
                  <div>
                    <dt>Time zone</dt>
                    <dd>{form.timezone}</dd>
                  </div>
                  <div>
                    <dt>Language</dt>
                    <dd>
                      {form.language === "hi" ? "हिन्दी (Hindi)" : "English"}
                    </dd>
                  </div>
                </dl>
                <div aria-live="polite" className={styles.formMessage}>
                  {error ? <p role="alert">{error}</p> : null}
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.backButton}
                    disabled={pending}
                    onClick={() => setStep(1)}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" size={16} /> Back
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={pending}
                    type="submit"
                  >
                    {pending ? (
                      "Creating workspace…"
                    ) : (
                      <>
                        Create wedding <Check aria-hidden="true" size={17} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

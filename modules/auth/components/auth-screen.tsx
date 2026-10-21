"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Flower2,
  Mail,
  Sparkles,
} from "lucide-react";
import styles from "./auth-screen.module.css";

type AuthScreenVariant =
  "login" | "register" | "forgot-password" | "verify-email" | "reset-password";

const pageContent: Record<
  AuthScreenVariant,
  { eyebrow: string; title: string; description: string }
> = {
  login: {
    eyebrow: "YOUR WEDDING, ALL TOGETHER",
    title: "Welcome back.",
    description: "Sign in to continue planning your celebration.",
  },
  register: {
    eyebrow: "A CALMER WAY TO PLAN",
    title: "Let’s begin together.",
    description: "Create an account for your wedding planning workspace.",
  },
  "forgot-password": {
    eyebrow: "ACCOUNT RECOVERY",
    title: "A fresh start.",
    description:
      "Enter the email address on your account and we’ll help you get back in.",
  },
  "verify-email": {
    eyebrow: "ONE LAST STEP",
    title: "Verify your email.",
    description: "Confirm your email address to activate your account.",
  },
  "reset-password": {
    eyebrow: "ACCOUNT RECOVERY",
    title: "Choose a new password.",
    description: "Use a strong password you have not used for this account.",
  },
};

function Brand() {
  return (
    <Link aria-label="Make My Marriage home" className={styles.brand} href="/">
      <span aria-hidden="true" className={styles.brandMark}>
        <Flower2 size={20} strokeWidth={1.5} />
      </span>
      <span>Make My Marriage</span>
    </Link>
  );
}

function Field({
  id,
  label,
  placeholder,
  type = "text",
  autoComplete,
  required = true,
  minLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        autoComplete={autoComplete}
        id={id}
        minLength={minLength}
        name={id}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function CelebrationCard() {
  return (
    <div aria-hidden="true" className={styles.celebrationCard}>
      <div className={styles.cardTopline}>
        <span>THE CELEBRATION OF</span>
        <span className={styles.cardIcon}>
          <Sparkles size={15} />
        </span>
      </div>
      <div className={styles.cardMonogram}>
        <span>A</span>
        <i>&</i>
        <span>M</span>
      </div>
      <p className={styles.cardNames}>Aarav & Meera</p>
      <p className={styles.cardDate}>EIGHTEENTH OCTOBER · JAIPUR</p>
      <div className={styles.cardRule} />
      <div className={styles.cardEvent}>
        <span className={styles.eventIcon}>
          <CalendarDays size={15} />
        </span>
        <span>
          <strong>The wedding ceremony</strong>
          <small>Sunday · 6:00 in the evening</small>
        </span>
        <Check className={styles.eventCheck} size={16} />
      </div>
      <span className={styles.cardSeal}>A DAY TO REMEMBER</span>
    </div>
  );
}

function StoryPanel() {
  return (
    <section
      aria-label="Make My Marriage introduction"
      className={styles.story}
    >
      <div className={styles.storyGlow} />
      <Brand />
      <div className={styles.storyCopy}>
        <span className={styles.storyEyebrow}>
          <span /> MADE FOR YOUR BIG MOMENTS
        </span>
        <h2>
          Make room for
          <br />
          <em>the moments.</em>
        </h2>
        <p>
          Bring your people, plans, and little details together in one place.
        </p>
      </div>
      <CelebrationCard />
      <p className={styles.storyFooter}>A little more joy in every detail.</p>
    </section>
  );
}

function VerificationNotice() {
  return (
    <div className={styles.previewNotice} role="note">
      <span aria-hidden="true">
        <Sparkles size={15} />
      </span>
      <p>
        Email and password accounts must verify their email before signing in.
      </p>
    </div>
  );
}

function LoginFields() {
  return (
    <>
      <Field
        autoComplete="email"
        id="email"
        label="Email address"
        placeholder="you@example.com"
        type="email"
      />
      <Field
        autoComplete="current-password"
        id="password"
        label="Password"
        placeholder="Enter your password"
        type="password"
      />
      <div className={styles.formOptions}>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      <button className={styles.primaryButton} type="submit">
        Sign in <ArrowRight aria-hidden="true" size={16} />
      </button>
    </>
  );
}

function RegisterFields() {
  return (
    <>
      <Field
        autoComplete="name"
        id="name"
        label="Your name"
        placeholder="How should we address you?"
      />
      <Field
        autoComplete="email"
        id="email"
        label="Email address"
        placeholder="you@example.com"
        type="email"
      />
      <Field
        autoComplete="new-password"
        id="password"
        label="Create a password"
        placeholder="At least 8 characters"
        type="password"
        minLength={8}
      />
      <button className={styles.primaryButton} type="submit">
        Create account <ArrowRight aria-hidden="true" size={16} />
      </button>
    </>
  );
}

function RecoveryFields() {
  return (
    <>
      <Field
        autoComplete="email"
        id="email"
        label="Email address"
        placeholder="you@example.com"
        type="email"
      />
      <button className={styles.primaryButton} type="submit">
        <Mail aria-hidden="true" size={16} /> Send recovery email
      </button>
    </>
  );
}

function VerifyEmailFields({ token }: { token: string }) {
  return (
    <>
      {!token ? (
        <p className={styles.formHint}>
          This link is missing its verification token. You can request another
          by creating your account again.
        </p>
      ) : null}
      <button className={styles.primaryButton} disabled={!token} type="submit">
        Verify email <ArrowRight aria-hidden="true" size={16} />
      </button>
    </>
  );
}

function ResetPasswordFields({ token }: { token: string }) {
  return (
    <>
      {!token ? (
        <p className={styles.formHint}>
          This link is missing its reset token. Request a new password reset
          email to continue.
        </p>
      ) : null}
      <Field
        autoComplete="new-password"
        id="password"
        label="New password"
        minLength={8}
        placeholder="At least 8 characters"
        type="password"
      />
      <Field
        autoComplete="new-password"
        id="confirmPassword"
        label="Confirm new password"
        minLength={8}
        placeholder="Enter the password again"
        type="password"
      />
      <button className={styles.primaryButton} disabled={!token} type="submit">
        Update password <ArrowRight aria-hidden="true" size={16} />
      </button>
    </>
  );
}

async function postAuthJson(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(
      result?.error?.message ??
        "We could not complete that request. Try again.",
    );
  }
  return result.data as { message: string };
}

export function AuthScreen({
  variant,
  token = "",
  googleEnabled = false,
  emailEnabled = true,
  returnTo = "/dashboard",
}: {
  variant: AuthScreenVariant;
  token?: string;
  googleEnabled?: boolean;
  emailEnabled?: boolean;
  returnTo?: "/dashboard" | "/join";
}) {
  const router = useRouter();
  const content = pageContent[variant];
  const isLogin = variant === "login";
  const isRegister = variant === "register";
  const isForgotPassword = variant === "forgot-password";
  const isVerifyEmail = variant === "verify-email";
  const isResetPassword = variant === "reset-password";
  const emailUnavailable = !emailEnabled && (isRegister || isForgotPassword);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "");
    const password = String(values.get("password") ?? "");

    try {
      if (isLogin) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          redirectTo: returnTo,
        });
        if (!result?.ok || result.error) {
          throw new Error(
            "We couldn’t sign you in. Check your details and verify your email address.",
          );
        }
        router.replace(returnTo);
        router.refresh();
        return;
      }

      if (isRegister) {
        const result = await postAuthJson("/api/v1/auth/register", {
          displayName: String(values.get("name") ?? ""),
          email,
          password,
        });
        setMessage(result.message);
        return;
      }

      if (isForgotPassword) {
        const result = await postAuthJson("/api/v1/auth/password/forgot", {
          email,
        });
        setMessage(result.message);
        return;
      }

      if (isVerifyEmail) {
        const result = await postAuthJson("/api/v1/auth/verify-email", {
          token,
        });
        setMessage(result.message);
        return;
      }

      if (isResetPassword) {
        if (password !== String(values.get("confirmPassword") ?? "")) {
          throw new Error("The passwords do not match.");
        }
        const result = await postAuthJson("/api/v1/auth/password/reset", {
          token,
          password,
        });
        setMessage(result.message);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We could not complete that request. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!googleEnabled) {
      return;
    }
    setPending(true);
    setError("");
    try {
      await signIn("google", { redirectTo: returnTo });
    } catch {
      setError("Google sign-in could not start. Please try again.");
      setPending(false);
    }
  }

  return (
    <main className={styles.authLayout}>
      <StoryPanel />
      <section aria-labelledby="auth-title" className={styles.formSide}>
        <div className={styles.mobileBrand}>
          <Brand />
        </div>
        <div className={styles.formWrap}>
          <div className={styles.formIntro}>
            <span className={styles.formEyebrow}>{content.eyebrow}</span>
            <h1 id="auth-title">{content.title}</h1>
            <p>{content.description}</p>
          </div>

          {isLogin || (isRegister && emailEnabled) ? (
            <VerificationNotice />
          ) : null}

          {!isForgotPassword && !isVerifyEmail && !isResetPassword ? (
            <>
              <button
                className={styles.googleButton}
                disabled={!googleEnabled || pending}
                onClick={handleGoogleSignIn}
                type="button"
              >
                <span aria-hidden="true" className={styles.googleMark}>
                  G
                </span>
                {googleEnabled
                  ? "Continue with Google"
                  : "Google sign-in unavailable"}
              </button>
              {!emailUnavailable && (
                <div aria-hidden="true" className={styles.separator}>
                  <span />
                  <span>or use your email</span>
                  <span />
                </div>
              )}
            </>
          ) : null}

          <div className={styles.fields}>
            {emailUnavailable ? (
              <p className={styles.formHint} role="status">
                {isRegister
                  ? googleEnabled
                    ? "Create your account with Google. No separate app password or verification email is needed."
                    : "New account signup is temporarily unavailable. Existing users can still sign in."
                  : "Password reset emails are temporarily unavailable. If you created your account with Google, return to sign in and choose Continue with Google."}
              </p>
            ) : null}
            <form onSubmit={handleSubmit}>
              {isLogin ? <LoginFields /> : null}
              {isRegister && emailEnabled ? <RegisterFields /> : null}
              {isForgotPassword && emailEnabled ? <RecoveryFields /> : null}
              {isVerifyEmail ? <VerifyEmailFields token={token} /> : null}
              {isResetPassword ? <ResetPasswordFields token={token} /> : null}
              {error ? (
                <p className={styles.formError} role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className={styles.formSuccess} role="status">
                  {message}
                </p>
              ) : null}
              {pending ? (
                <span className={styles.pendingText} role="status">
                  Please wait…
                </span>
              ) : null}
            </form>
          </div>

          <p className={styles.switchPrompt}>
            {isLogin ? (
              <>
                New to the workspace?{" "}
                <Link href="/register">Create an account</Link>
              </>
            ) : null}
            {isRegister ? (
              <>
                Already have an account? <Link href="/login">Sign in</Link>
              </>
            ) : null}
            {isForgotPassword ? (
              <>
                Remembered your password?{" "}
                <Link href="/login">Back to sign in</Link>
              </>
            ) : null}
            {isVerifyEmail ? (
              <>
                Already verified? <Link href="/login">Sign in</Link>
              </>
            ) : null}
            {isResetPassword ? (
              <>
                <Link href="/login">Back to sign in</Link>
              </>
            ) : null}
          </p>
        </div>
        <p className={styles.formFooter}>
          Made with care for the celebrations that bring us together.
        </p>
      </section>
    </main>
  );
}

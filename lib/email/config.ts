import "server-only";

/** Configuration presence only; account activation/delivery still needs verification. */
export function emailConfigured() {
  return (
    process.env.EMAIL_PROVIDER === "brevo" &&
    Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM)
  );
}

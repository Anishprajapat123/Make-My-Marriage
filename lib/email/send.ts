import "server-only";

type Message = { to: string; subject: string; text: string };

/** Explicit provider selection: a free-provider failure must never fall back to SES. */
export async function sendTransactionalEmail(message: Message) {
  const provider = process.env.EMAIL_PROVIDER ?? "disabled";
  if (provider === "ses") {
    throw new Error(
      "Paid email sending is disabled for this zero-budget demo.",
    );
  }
  if (provider !== "brevo") {
    throw new Error("Transactional email provider is not configured.");
  }
  const key = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Brevo sender is not configured.");
  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Make My Marriage", email: from },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("Email provider request failed.");
  }
  // Never include the response body: it can contain recipient addresses or content.
  if (response.status !== 201) {
    throw new Error(
      `Email provider rejected the request (${response.status}).`,
    );
  }
}

import "server-only";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

let client: SESv2Client | undefined;

export async function sendTransactionalEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const region = process.env.AWS_REGION;
  const from = process.env.SES_FROM_EMAIL;
  if (!region || !from) {
    throw new Error("Amazon SES is not configured.");
  }

  client ??= new SESv2Client({ region });
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Text: { Data: text, Charset: "UTF-8" } },
        },
      },
    }),
  );
}

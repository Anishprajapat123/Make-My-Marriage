# Temporary public deployment: Vercel Hobby + Brevo Free

## Current policy: strict zero budget

Google sign-in credentials are now configured privately in production and its
authorization start is verified. Full callback acceptance remains pending. User
confirmed Atlas Free/M0 on 21 October 2026; this is user-reported tier confirmation,
not a full MongoDB/AWS billing audit. The app still uses Vercel Hobby and no paid
email delivery. Prior setup history below includes superseded pending states.

The latest user decision supersedes all SES approval recorded below. This is a
learning/idea demo; no paid service, trial, upgrade, top-up or overage is permitted.
Dedicated SES keys are inactive and removed from Vercel. EMAIL_PROVIDER=disabled
is the deployment setting; the adapter rejects SES and defaults disabled locally.
No free-provider account or live email delivery is verified yet. Existing verified
users can sign in and guest invitation/RSVP needs no email. New registrations
cannot complete verification, password-reset emails are unavailable, and member
invitations must use their issuance copy link until free email is configured.
Never bypass email verification or claim email was sent when disabled.

Vercel is Hobby. Atlas Free status and unrelated account charges have not been
verified: disabling this project's SES does not certify the entire AWS account
or MongoDB account has zero charges. Prior deployment history below is retained.

## Superseding decision — AWS SES

Production website: https://make-my-marriage-sepia.vercel.app. The initial build
completed successfully. Dedicated IAM user make-my-marriage-vercel-ses is limited
to ses:SendEmail for the verified sender in ap-south-2; key material exists only
in Vercel Production. SES sandbox remains enabled. Do not claim arbitrary-recipient
registration email delivery or $0 AWS billing. Production AUTH_SECRET is distinct
from local development. .vercelignore excludes local environments and artifacts.

The user subsequently chose AWS SES. The Brevo setup below is historical and is
not required. Set EMAIL_PROVIDER=ses, AWS_REGION, SES_FROM_EMAIL and appropriate
server-side AWS authentication in Vercel. The SES block has been removed. Keep
hosting on Hobby, but do not describe the overall deployment as guaranteed $0.
Verify SES sandbox/production status before allowing public registration. Local
AWS CLI credentials are not automatically available to Vercel.

Status: preparation only. No hosted deployment or live Brevo email is verified yet.

The user approved Vercel Hobby and a free email provider on 21 October 2026.
This is a personal, non-commercial deployment. Do not start paid trials, add-ons,
automatic top-ups, or paid marketplace integrations. Free limits can interrupt
availability; this is not an unlimited production hosting promise.

## Account setup

1. Sign in to Vercel with the intended personal GitHub account, Anishprajapat123.
   Select Hobby. The automation browser has a separate login session.
2. Create a Brevo Free account. Verify the account email, add and verify a sender
   under Senders, Domains & Dedicated IPs, and activate transactional email.
   Brevo may require account review. Do not bypass that review or buy a plan.
3. Create a Brevo API key under SMTP & API / API Keys. An SMTP key is different.
   Store BREVO_API_KEY and EMAIL_FROM in ignored .env.local, never in Git or chat.
   EMAIL_FROM is the plain verified sender address.
4. Brevo Free includes 300 emails per day. Do not purchase extra credits or enable
   paid options. Authentication/registration, reset emails and member invitations
   share that allowance. Guest RSVP links do not send email.
5. Free sender domains cannot be authenticated by you. Brevo documents temporary
   sender rewriting through its own domain; verify actual delivery before launch.
   The Vercel subdomain is a website address, not an email domain you control.

## Vercel project

Use Next.js framework detection, repository root, npm ci, and npm run build.
Vercel runs the Next.js deployment directly; it does not run our Dockerfile.
Keep Docker support for later hosting. Confirm the current local invitation/RSVP
changes are included: importing GitHub alone will omit uncommitted work. Do not
commit or push without explicit user instruction.

Set production variables privately in Vercel:

| Variable | Value |
| --- | --- |
| MONGODB_URI | URI for the intended Atlas Free deployment database |
| AUTH_SECRET | New strong production secret, separate from local development |
| AUTH_TRUST_HOST | true behind Vercel's trusted hosting proxy |
| APP_BASE_URL | Stable HTTPS production project URL, never localhost |
| EMAIL_PROVIDER | brevo |
| BREVO_API_KEY | Private Brevo API key |
| EMAIL_FROM | Verified Brevo sender email |

Do not upload .env.local wholesale. Do not configure AWS access keys, SES sender,
paid storage or an S3 bucket for this deployment. The email adapter rejects SES on
Vercel even if it is selected accidentally, and never falls back after a Brevo
failure. Google login is optional; enable only after configuring its exact HTTPS
callback and production credentials. Never use NEXT_PUBLIC_ for server secrets.

Verify Atlas is actually on a Free plan; its tier and other existing AWS resources
have not been certified as free by this setup. Use a restricted database user and
review network access for the host. Do not silently open Atlas to the whole internet.

## Before public release

- Confirm the Hobby plan and absence of paid integrations.
- Verify production database access, required indexes, and transaction support.
- Configure available free edge protections and public auth throttling before
  unrestricted sign-ups. Existing per-token RSVP throttling alone is insufficient.
- Verify hosted registration, inbox delivery, verification, login/logout, reset,
  collaborator acceptance and guest RSVP. Sending a real test email requires the
  user's authorization for that recipient.
- Confirm no generated invitation points to localhost or a changing preview URL.
- Keep environment values and bearer invitation links out of deployment logs.
- Review public dashboard preview labels and unfinished navigation with the user.

## References

- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Brevo plans](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans)
- [Brevo sender setup](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email)
- [Brevo domain troubleshooting](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication)
- [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email)

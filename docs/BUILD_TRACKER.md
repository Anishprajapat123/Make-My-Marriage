# Make My Marriage — Build Tracker

This tracker records what is built and what remains for the Make My Marriage V1. It follows the [PRD](<Make My Marriage — Product Requirements Document (PRD).md>), [System Design](Make_My_Marriage_System_Design_Document.md), [Database Design](Make_My_Marriage_Database_Design_Document.md), and [API Design](Make_My_Marriage_API_Design_Document.md). Those documents remain the source of truth if this checklist is incomplete or out of date.

## Recent work

Next-slice preparation (21 October 2026): user confirms live Google login reached
onboarding/dashboard (user acceptance, not an automated callback test). Atlas is
user-confirmed Free/M0. Google collaborator acceptance is still a separate pending
journey; email remains intentionally disabled. Reviewed expense contracts and
Stitch inventory; prepared EXPENSES_STITCH_PROMPT.md with mobile/state coverage and
explicit budget/payment/money/removal contract gaps. No expense feature code or
paid service was added. Recent deployment/Google changes are being saved to dev.

Google deployment update (21 October 2026): credentials securely copied from
ignored local configuration into Vercel Production; deployment READY. Hosted
Continue with Google reaches Google's account sign-in page, requesting only
openid/profile/email with the exact production callback. Lint, formatting,
TypeScript and hosted build pass. User confirms Atlas Free/M0. Full interactive
OAuth callback, onboarding and invitation acceptance still require a real Google
sign-in; no completed login is claimed. Existing local emails are not silently
linked to Google. Dedicated SES keys remain disabled; email delivery stays off.

Google self-service preparation (21 October 2026): selected direct Google OAuth
for the strict zero-budget demo. Existing Google provider/account foundation is
present, but AUTH_GOOGLE_ID/SECRET are absent. Added explicit email-unavailable
UI and registration/recovery API guards so disabled sending cannot create a false
email-success journey. Added Google-start failure recovery and owner setup guide.
Lint/TypeScript pass. OAuth credentials, hosted Google acceptance and public
audience configuration remain required; do not mark the feature live/complete.

Strict zero-budget decision (21 October 2026): user clarified this is a learning
and idea demo with no paid services. Disabled the dedicated SES IAM keys (zero
active keys verified), set production EMAIL_PROVIDER=disabled, and removed AWS
credentials from Vercel. Email adapter now defaults disabled and rejects SES
locally as well. Existing verified accounts and guest RSVP remain usable; new
email verification/password resets require a configured free provider. No account
verification bypass or automatic success behavior was introduced. Free-provider
activation and Atlas billing-tier verification remain pending.

Zero-budget safeguards redeployed successfully to the existing public URL.
Verified production READY, login 200, database-backed invalid invitation 410,
and absence of both AWS access-key variables in Vercel. Lint, TypeScript,
formatting and hosted production build pass. No real emails sent. These follow-up
changes are not committed/pushed yet.

Vercel launch (21 October 2026): deployed production to
https://make-my-marriage-sepia.vercel.app on the existing Hobby workspace. Added
production-only environment settings and a fresh Auth.js secret. Created IAM user
make-my-marriage-vercel-ses in verified account 291786456658, restricted to
ses:SendEmail from the configured verified identity in ap-south-2. Its key pair is
stored directly in Vercel, never in Git. SES remains sandbox-only; public sign-up
email delivery is limited to verified recipients. No production-access request
or real email send was performed. Initial anonymous login returns 200 and session
API returns 401 as expected. Final base-URL redeployment is READY. Hosted login
and registration return 200; protected Events redirects with 307; anonymous
session returns 401; a database-backed invalid invitation returns generic 410.
Full hosted account/email acceptance remains unverified.

Deployment decision update (21 October 2026): user chose AWS SES instead of Brevo.
Explicit EMAIL_PROVIDER=ses now works on Vercel; removed the earlier SES block.
Vercel hosting remains Hobby, but AWS email is not guaranteed free. Hosted AWS
authentication, SES sandbox status and final URL must be verified before launch.

Temporary Vercel deployment preparation (21 October 2026): user approved Hobby
hosting and a free email provider. Added a dependency-free Brevo adapter for auth
and collaborator email, with explicit provider selection and no SES fallback.
SES is rejected on Vercel. Local SES remains available. Lint/type checking pass.
Deployment awaits access to the signed-in browser, verified Brevo sender/key,
Atlas free-tier verification and hosted security checks. See FREE_DEPLOYMENT.md.
No live deployment, email send, commit or push was performed in this step.

Guests verification (21 October 2026): 73 unit/security/component checks pass,
including validation/service coverage and both UI review regressions. The live
production-server journey passes with isolated owner, read-only, denied, suspended
and foreign-wedding sessions. Verified guest/family CRUD, duplicate confirmation,
primary-contact clearing, archive/restore, stale edits, list error/retry, pagination
with 1,000 seeded guests, and desktop/tablet/mobile overflow/screenshots. Temporary
QA accounts/weddings/guests/families were cleaned and absence asserted. Email was
disabled; no personal wedding data was changed. See GUESTS_QA_REVIEW.md for limits
and rerun instructions. Production/load certification remains separate.

Guests review fixes (21 October 2026): clicking the active tab is now a no-op,
preventing a loading state without a matching fetch. New-guest editor keys include
the target family, so switching Add person between households resets the draft
and its family selection. Live guest-flow acceptance remains pending.
Lint, type checking, formatting, and the production build pass after these fixes.

Guests first slice (19 October 2026): implemented the refined Stitch desktop/mobile
ledger direction, responsive guest/family screens and forms, guest details,
paginated pickers/search/filters/sorting, duplicate review/keep-both, archive/restore,
and family/contact management. APIs use tenant/permission checks, revisions,
transactional reference guards and activity. The user approved archive/restore,
explicit keep-both, and blocking deletion of populated families. No sample data
was inserted. Live database/browser verification is still pending; do not treat
compilation as acceptance of every workflow. Import, links, RSVP and merge remain
separate increments.
Lint, TypeScript, formatting and the production build pass. No guest-flow tests
or live fixture runs were added or executed in this implementation step.

Guests design review (19 October 2026): reviewed all four source documents and
retrieved the existing Stitch guest preview/HTML. Refinement scope and unresolved
lifecycle/duplicate/family policies are recorded in GUESTS_STITCH_PROMPT.md. Guest
at that point had not started; the original design included excluded features.
The user subsequently supplied refined desktop/mobile screens, used above.

Invitation usability follow-up (19 October 2026): the acceptance page shows the
signed-in account's own email, explains wrong-account recovery, hides ineffective
retry for email mismatches, and switches directly to login after sign-out. The
continue-to-workspace action dismisses the browser journey without accepting it.

Review fixes (19 October 2026): Family Admin templates now include assigned-task
permissions, with an explicit tenant-scoped migration option for existing system
roles. Invitation journeys can be dismissed without changing the invitation;
terminal lookup errors clear the cookie, while wrong-account errors preserve it.
No live role migration was applied automatically.
Lint, TypeScript checking, formatting, and the production build pass after these
review fixes. The earlier live QA results remain documented separately.

## Status key

- `[x]` Complete and verified for its stated scope.
- `[~]` In progress.
- `[ ]` Not started.
- `[?]` Needs a product or technical decision.

**Important:** a UI preview alone does not mean the feature is implemented. Mark a feature complete only when its agreed UI, server behavior, authorization, persistence, and relevant verification are complete. Update this file as work lands.

## Current project status

- `[x]` Initial Next.js App Router and TypeScript scaffold, shared configuration, modular-monolith folders, Docker foundation, and project instructions.
- `[x]` Responsive dashboard UI preview for desktop and mobile, using clearly labeled sample content.
- `[~]` Dashboard identity now comes from the authenticated wedding and member. Planning counts, search results, notifications, and activity remain explicitly labeled sample data; no planning changes are saved.
- `[ ]` Production features and persistence. No business module should be treated as implemented solely because its folder or a dashboard preview exists.

## Recommended implementation sequence

Build incrementally, one reviewable feature slice at a time. For each slice: agree on the UI and states, build the responsive UI, implement its server-side rules and persistence, verify permissions and tenant isolation, then mark it complete. Avoid creating every screen as a disconnected mock before wiring any feature to real behavior.

### 0. Foundation

- `[x]` Application scaffold and approved folder structure.
- `[x]` Tailwind, ESLint, TypeScript, Next.js, Docker, environment example, and README foundation.
- `[x]` Confirm local MongoDB Atlas connection configuration; the development connection was verified during account-flow testing. Configure and verify secrets independently in staging and production.
- `[~]` Shared foundations include a server-only Mongoose connection, error-response helpers, Zod boundary validation, auth-token/user models, and SES email delivery. Logging and broader test conventions remain to be established.
- `[ ]` Establish unit, integration, API, security, and E2E test conventions before relying on them for feature acceptance.

### 1. Dashboard UI preview

- `[x]` Dashboard layout and responsive desktop/mobile presentation.
- `[x]` Sample wedding overview, planning summaries, upcoming event, attention items, recent activity, and preview states.
- `[x]` Make unavailable workspace navigation visibly non-navigating until its screen exists.
- `[ ]` Replace sample content with authenticated, tenant-scoped dashboard data after the foundation and core modules are available.
- `[ ]` Add real loading, empty, and error states when connecting the dashboard to data.

### 2. Account, authentication, and workspace access

- `[x]` Responsive login, registration, verification, and password-recovery screens connected to the account lifecycle APIs.
- `[~]` Local account creation, email verification before sign-in, credentials login, password recovery/reset, and current-browser sign-out are implemented. Verify failure states, email delivery failures, and all flows with automated tests before treating the feature as complete.
- `[~]` Auth.js v5 JWT sessions and a protected workspace shell are in place. Disabled users and sessions issued before password reset are rejected; verify sign-out and revocation behavior end to end.
- `[~]` Responsive wedding setup and validated onboarding API create the wedding tenant, default system role templates, and initial owner membership in one MongoDB transaction. Verify transaction rollback, duplicate membership, and concurrent creation behavior before marking complete.
- `[ ]` Resolve tenant context from the verified session and membership on the server.
- `[ ]` Enforce one active or suspended wedding membership per account; retain removed history and allow a removed member to join or create another wedding.
- `[x]` Members first slice implemented and development-verified: multiple roles, invite/list/revoke/replace/expiry, verified acceptance, suspend/restore/remove/rejoin, owner/self/permission protections, stale edits, and transactional one-membership enforcement. The isolated standalone-browser journey uses separate accounts/two weddings, exercises concurrent acceptance and responsive states, and cleans up QA records. One authorized SES test reached the user's inbox. Production/load verification, custom-role editing, and ownership transfer remain separate work.
- `[ ]` Verify that guests never need accounts and that UI visibility is not used as authorization.

### 3. Core planning

- `[~]` Events and wedding timeline implemented: responsive list/search/status filters, create/edit, details, venue and guest guidance, timeline CRUD, tenant/permission checks, overnight scheduling, stale-write checks, and linked-record delete protection. Live verified-owner Atlas/browser journey passes at desktop/tablet/mobile widths; two-account isolation, fresh onboarding, and final user visual acceptance remain separate checks. Event reminders and public schedule delivery belong to later slices.
- `[x]` Tasks first slice implemented and verified in development: list/filter/counts, create/edit/details, assignments, timezone deadlines, bounded checklists, planner comments, audit history, assigned-task scope, and revisions. Live Atlas/Playwright checks use two temporary weddings and planner/family sessions, including suspended access, stale writes, foreign/inactive references, linked-event deletion, and error recovery. Desktop/tablet/mobile screenshots have no horizontal overflow. Templates/boards/task notifications and production/load/concurrency acceptance remain later work.
- `[x]` Guest/family first slice implemented and verified in development: individual records, responsive ledger/forms/details, paginated search/filter/sort, data-driven counts, duplicate review/keep-both, archive/restore, family/contact management, versioned tenant-scoped APIs and transactional activity. Unit/component/security checks and isolated live browser/database access/tenant checks pass; see GUESTS_QA_REVIEW.md. Import preview/commit, export, guest links and RSVP are later increments; production/load acceptance remains separate.
- `[ ]` Issues: reporting, status/assignment, comments, and activity history.
- `[ ]` Activity log for important workspace changes.

### 4. Invitations and guest experience

- `[ ]` Public wedding page and wedding information display.
- `[ ]` Invitation creation and guest invitation links with secure token lifecycle; store token hashes where required by the database design.
- `[ ]` Public invitation lookup and RSVP flow, including safe repeat submissions and confirmation states.
- `[ ]` Public route rate limits and checks that one guest token cannot access another guest's data.
- `[ ]` Guest-facing event information and venue details, with no guest account requirement.

### 5. Wedding operations

- `[ ]` Expenses and payments, including role-restricted access, categories, status, due dates, summaries, and upcoming payment reminders.
- `[ ]` Vendor records, member/vendor access boundaries, and vendor invitations where defined.
- `[ ]` In-app notifications and member reminders, with preferences and read state.
- `[ ]` Dashboard aggregation endpoint and real dashboard widgets after the source modules are available.
- `[ ]` Search and reports for the approved V1 scope.

### 6. Gallery and livestream

- `[ ]` Event-based gallery albums and photo browsing.
- `[ ]` S3 upload authorization and completion verification; store metadata in MongoDB and original, optimized, and thumbnail variants in S3.
- `[ ]` Restrict uploads to authorized admin/photographer roles; use short-lived signed URLs and validate file type/size/resource ownership.
- `[ ]` Public livestream information using an external provider; no in-app video infrastructure.

### 7. Security, quality, and release

- `[ ]` Tenant-isolation tests for every tenant-owned module and cross-tenant resource access.
- `[ ]` Permission/security tests for members, guests, vendors, expenses, invitation tokens, and uploads.
- `[ ]` Configure strict AWS WAF rate limits for public authentication endpoints before production exposure.
- `[ ]` API contract and error-response consistency; maintain OpenAPI alongside validated contracts as APIs are implemented.
- `[ ]` E2E coverage for account setup, core planning, invitation/RSVP, gallery, and livestream journeys.
- `[ ]` Validate expected guest-list and public-page loads against the design targets before release.
- `[ ]` Configure and verify development, staging, and production environments and AWS deployment.
- `[ ]` Production readiness review, observability, secret handling, backups, and operational runbook.

## Agreed scope and decisions

- Dashboard first; build the remaining UI and functionality incrementally, in sequence, for desktop and mobile.
- One wedding is one tenant. Multiple members can share a wedding; guests do not create accounts.
- Use Auth.js v5 beta as the approved authentication direction.
- Product is free. Do not add billing, subscriptions, or freemium features.
- Guest reminders and WhatsApp are Phase 2; V1 reminders/notifications are in-app for authenticated members.
- Use S3 for photo objects and an external provider for livestreaming.
- Exclude accommodation, transportation, seating planner, guest check-in, face recognition, and automatic post-wedding deletion.
- Do not introduce microservices, Kubernetes, Kafka/RabbitMQ, or Redis without a newly approved concrete requirement.

## Change log

- 19 October 2026: Members verification passes with 57 unit/security/component tests and the live standalone Playwright journey. Added concise role-checkbox accessible names and removed irrelevant migration wording from role descriptions. Tested registration/verification continuation using a seeded QA verification token, actual acceptance/rejoin, permission/status boundaries, expired/revoked links, stale UI recovery, list failure/retry, and concurrent acceptance across two weddings. A separately approved single SES email was sent only after verifying `anish-dev` and the user confirmed inbox receipt. Temporary accounts, weddings, and invitations were cleaned and a read-only check found zero remaining. No personal account/membership changes or AWS infrastructure changes were made during verification.

- Members implementation uses the new Stitch desktop/mobile list direction. Invitation and access forms/acceptance screens extend that theme because separate Stitch designs were not provided. Approved multiple roles, SES plus copy-link, seven-day expiry, and conservative owner/self/permission protections. An HTTP-only invitation cookie preserves the journey through account verification/sign-in and keeps bearer tokens out of client auth state. No live invitation emails have been sent during implementation.

- Members design preparation: checked the Stitch project (25 screens); no wedding-member management or invitation-acceptance screens were present. Added `MEMBERS_STITCH_PROMPT.md` for desktop/mobile/tablet design, including invitation and membership lifecycle states. Role cardinality, delivery/expiry, owner protection, and lifecycle API contracts remain decisions before implementation. No member feature code added in this step.

- Tasks verification: 46 unit/security/component checks and the opt-in live two-tenant Tasks journey pass. Fixed the event reference guard so cached development Mongoose schemas cannot strip the transactional update; it now uses explicit tenant/event ObjectIds in a native MongoDB update. Temporary QA records were removed, with a separate read-only check confirming zero remaining QA users/weddings. Existing personal wedding roles were not migrated.

- Live local review: 20 unit/security/component checks and the authenticated owner Playwright journey pass. Temporary QA events are removed. Login/account screens, mobile navigation, event/timeline CRUD, overnight scheduling, duplicate onboarding rejection, stale writes, and sign-out were exercised; screenshots cover desktop/tablet/mobile widths.
- Improved dashboard preview timeline spacing, stacked Events date groups at tablet width, and collapsed optional venue/guest form details with values preserved on submission.
- Approved Tasks access: planners manage all tasks; family members view only assigned tasks and update their status/checklists. Refined Stitch designs were approved and used for the first slice. Existing family system roles require the explicit tenant-scoped permission migration described in README; it has not been applied automatically.

- Fixed implicit Enter submission in the event form: the primary save button preserves the selected status; only an explicit Save as draft action overrides it. Added regression coverage for both actions.

- Fixed wedding onboarding role creation for the installed Mongoose version: multiple documents in a session require `ordered: true`. The wedding, roles, and owner membership remain in the same transaction.

- Events flow implemented from the refined Stitch direction for desktop, tablet, and mobile. All forms use consistent fields; excluded seating/transport content and design simulators were removed. No planning demo data is inserted.
- Event services derive tenant/timezone/permissions from verified membership. Default event statuses and optional ceremony type are documented; timeline items are bounded at 100. Sixteen unit/security/component checks cover overnight dates, DST gaps/ambiguity, tenant filters, readonly mutations, stale edits, blocked deletion, timeline bounds, cross-origin input rejection, and UI error recovery. Persistence is mocked in automated checks; authenticated Atlas and browser visual acceptance remain outstanding.

- Initial scaffold completed.
- Responsive dashboard UI preview created; it currently uses sample data only.
- Dashboard search now safely normalizes repeated query parameters; unfinished sidebar items do not navigate to placeholder content.
- Local registration, email verification, credentials sign-in, forgot/reset password, Auth.js JWT sessions, protected workspace layout, and sign-out control added. Local MongoDB and SES integration were exercised manually; automated auth/security tests and production AWS WAF rate limits remain outstanding.
- Auth tokens are stored as hashes with expiry; password resets increment a session version. Configure AWS WAF rate-based rules for public auth endpoints before production exposure.
- Wedding onboarding UI and API added. Wedding, default system role templates, and the owner membership are created atomically; the dashboard shows the current wedding identity while keeping preview metrics labeled as sample data.
- Family Member defaults no longer grant wedding-wide event, task, guest, or RSVP visibility. Current wedding resolution now combines permissions from all tenant-scoped roles assigned to a member.
- Wedding description, couple/cover image, contact information, hashtag, and theme editing remain follow-up wedding profile work; only the fields in the onboarding API contract are collected in this slice.

## 21 October 2026 — guest invitations and RSVP

- Implemented invitation content/publishing, individual copyable guest links, explicit replacement/revocation, public published-event schedule, and no-account RSVP with named companions.
- Added host response counts, party-scoped public data, stale-write protection, idempotent retries, duplicate confirmation, and archive-triggered link revocation.
- Family Member now receives read-only Events; unauthorized routes show an access explanation instead of a misleading 404. Applied VIEW_EVENTS only to the current owner's wedding system role.
- Guests first-slice QA completed with 73 checks and a 1,000-guest live journey; invitation live verification is recorded separately in INVITATIONS_QA_REVIEW.md.
- No deployment, commit, push, new dependency, or guest email sending in this step.

# Make My Marriage

Expenses first slice: open `/expenses` as an authorized member. Add an INR
expense with a built-in category suggestion or type your own custom category;
custom labels stay on that expense and are not added to the suggestion list.
Create an
Estimated or Committed cost, optionally choose an event/payer/deadline, and record
a full payment only after it was paid outside the app. Paid entries are protected;
unpaid entries archive/restore. Budget entry and partial payments are deferred.
Finance Manager and Owner can manage/pay; Family Admin currently reads only.
The UI uses real records and does not insert sample financial data. Restart local
dev once after pulling new Mongoose models. Live expense acceptance is pending.

Temporary free hosting setup: see [Vercel + Brevo deployment](docs/FREE_DEPLOYMENT.md).

Next.js modular-monolith application for the Make My Marriage project. The
current implementation includes the responsive dashboard preview and an
initial account-authentication foundation: local registration with email
verification, credentials sign-in, password recovery, Auth.js sessions, and a
protected workspace shell. Wedding onboarding creates the wedding tenant,
default role templates, and initial owner membership transactionally. The dashboard still
shows sample planning metrics. Events now support responsive lists, creation,
editing, details, and ceremony timeline management with tenant/permission checks.
Broader membership/permission management is not implemented yet.

After signing in and completing onboarding, open `/events` from the workspace.
Create an event, choose its draft/published status, then add timeline items from
its details page. Times use the wedding timezone; optional end dates allow
overnight events. Editing/deleting requires the latest event version, and linked
records prevent event deletion. Public event delivery and event reminders are
future slices. No sample event records are created.

## Architecture boundaries

- `app/` owns route composition and thin HTTP handlers.
- `modules/` owns domain types, validation, services, repositories, and models
  as each domain is implemented.
- `lib/` owns cross-cutting infrastructure such as database connections,
  authentication integration, tenant context, storage clients, and logging.
- `components/ui/` is for shared primitives; feature-specific UI belongs with
  its domain when it is introduced.
- Tenant context must be resolved on the server. Tenant-owned repository
  methods must require that context and scope reads and writes by `tenantId`.
- Guest invitation tokens are a separate public access path and do not create
  guest accounts.

## Local development

1. Install the locked dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and configure `MONGODB_URI`,
   `APP_BASE_URL`, `AUTH_SECRET`, `AWS_REGION`, and `SES_FROM_EMAIL` for account
   flows. The development machine also needs AWS credentials authorized to send
   through SES. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` only when enabling
   Google sign-in. Never commit `.env.local` or credentials.
3. Local development trusts its local host automatically. For production, set
   `AUTH_TRUST_HOST=true` only behind a trusted ingress that validates the
   incoming host. Configure AWS WAF rate limits on public auth
   endpoints before exposing registration, login, email verification, or
   password recovery to the internet.
4. Start the development server with `npm run dev` and open
   `http://localhost:3000`.

To run the Dockerized production build locally, use `docker compose up --build`
and open `http://localhost:3000`. The compose file runs only the application;
the project targets MongoDB Atlas and does not bundle a local database service.

Run `npm run lint`, `npm run typecheck`, and `npm run build` to check the
application. `npm run format:check` verifies formatting.

## Tests

- `npm run test` runs Vitest once; `npm run test:watch` starts its watch mode.
- `npm run test:e2e` runs Playwright against the application. Playwright starts
  the development server if one is not already available.
- Install the Playwright browser once with `npx playwright install` before
  running E2E tests on a fresh machine.
- Place unit, component, API, integration, and security tests under `tests/`.
  Async Server Components should be covered through E2E tests because Vitest
  does not currently run them directly.

The live workspace walkthrough in `tests/e2e/workspace-flow.spec.ts` requires
`TEST_LOGIN_EMAIL` and `TEST_LOGIN_PASSWORD` in the test process environment.
Use an existing verified account with a wedding and event-management permissions
against your local development database. The test creates clearly named disposable
event/timeline records and removes them in cleanup. It checks login, existing
membership rejection, event CRUD, timeline CRUD, version conflicts, mobile
navigation, and sign-out. Screenshots at desktop/tablet/mobile widths are saved
under ignored `test-results/`. Do not commit credentials or authenticated traces.

## Tasks first slice

Open `/tasks` after signing in and completing wedding setup. Planners can create,
edit, assign, filter, and delete tasks, maintain checklists, and post comments.
Assigned family members can see their own tasks and update status/checklist
completion. Deadlines use the wedding timezone; storage is UTC. No sample tasks
are inserted. Task counts, comments, and change history come from MongoDB.

New weddings receive explicit assigned-task permissions for the Family Member
system role. Existing weddings need a deliberate migration; custom roles are not
changed. From the repository root, inspect the selected wedding's dry-run first:

```powershell
node --env-file=.env.local scripts/migrate-task-permissions.mjs --tenant=<wedding-object-id>
```

Then repeat with `--apply`. Replace `<wedding-object-id>` with the actual wedding
ID, without angle brackets. This idempotent script updates only that wedding's
`FAMILY_MEMBER` system role and refuses roles with broad task permissions. It
never prints connection strings. Do not run against production without reviewing
the target environment. Owners/organizers already have full task permissions.

Family Admin templates also include assigned-task permissions so the strict
member-management permission check permits managing Family Members. For existing
weddings, run the same dry-run with `--role=FAMILY_ADMIN`, review the selected
tenant, then repeat with `--apply`. The default remains `FAMILY_MEMBER`; neither
variant changes custom roles or runs automatically.

The first slice includes list/form/details and paginated comments/activity.
Templates, calendar/Kanban, and task notifications remain later work. The first
slice passes automated development verification, including actual separate-session
tenant/assigned access and desktop/tablet/mobile layouts. See
[`docs/QA_REVIEW.md`](docs/QA_REVIEW.md) for scope, limitations, and the explicitly
enabled live QA command. It creates temporary fixtures and cleans them afterward;
production/load/concurrent-race acceptance remains separate.

## Guests and families

Open `/guests` after wedding setup. `VIEW_GUESTS` permits reading the ledger;
`MANAGE_GUESTS` permits adding/editing guests and families, archive/restore, and
primary-contact selection. Each attendee has a separate record. Contact details
are optional; phone numbers need `+` and country code. Lists and pickers paginate
on the server. Shared contacts/names produce a review warning, with explicit
keep-both confirmation when they describe different people.

Archive retains the guest and family association. Restore a guest before editing
their details. Moving/archiving a family primary contact clears that selection.
Families can be deleted only when empty of both active and archived records.
No email, guest account, guest link, import, export, or RSVP behavior is added by
this slice. Existing MongoDB configuration is used; no new dependency is required.
The first slice passes automated development verification, including isolated
browser/database lifecycle, permissions, tenant isolation and 1,000-guest pagination
checks. See [docs/GUESTS_QA_REVIEW.md](docs/GUESTS_QA_REVIEW.md) for scope and rerun
instructions. No sample guest data is inserted; QA fixtures are temporary and
cleaned afterward. Production/load acceptance remains separate.

## Members and collaborator invitations

Open `/members` as a user with `MANAGE_MEMBERS`. This slice supports multiple
existing roles, invitation history, seven-day invitation links, and member
suspend/restore/remove actions. Owner memberships and self-access changes are
protected. Removed membership history and its task/comment references are retained.

Invitations use the existing `APP_BASE_URL`, `AWS_REGION`, `SES_FROM_EMAIL`, and
AWS credentials configuration. SES sandbox restrictions still apply. Creation
reports whether SES accepted the send request separately from invitation creation;
it does not claim inbox delivery. Copy the link while the issuance/replacement
result is visible; only its hash is stored. Replacement invalidates the old link.

Recipients open `/join/<token>`, then sign in or register and verify the invited
email. An HTTP-only cookie preserves the invitation in the same browser; recipients
using another browser should reopen their invitation there. Joining requires an
explicit confirmation and cannot create a second active/suspended membership.
Recipients can dismiss the invitation and continue to their workspace or normal
sign-in. Invalid, expired, and revoked invitations clear the journey cookie after
authenticated lookup; wrong-account errors retain it for account switching.

The first Members slice is verified in development, including separate-account
acceptance, role/status restrictions, concurrent acceptance across two weddings,
and responsive layouts. One authorized SES test reached the user's inbox. See
[`docs/MEMBERS_QA_REVIEW.md`](docs/MEMBERS_QA_REVIEW.md) for the precise scope and
remaining production/load checks.

To rerun the isolated live Members test with temporary development records:

```powershell
npm run build
$env:RUN_MEMBERS_LIVE_QA='1'
npm run test:e2e -- --config playwright.members.config.ts
```

The separate standalone server runs on port 3101 with email disabled. Registration
verification uses a temporary known-token fixture; no email is sent to QA accounts.
The real SES check requires the additional explicit `RUN_REAL_SES_MEMBER_QA=1`
opt-in and separate approval to send its single test email to the fixed test
recipient. Keep it disabled during ordinary reruns. Test credentials are random,
remain in memory, and generated records are cleaned in `finally`.

## Dashboard

`/dashboard` now reads real planning data from the same server service exposed at
`GET /api/v1/dashboard`. Each section requires its module permission; assigned-only
members see only their scoped task counts and recent tasks. Vendor accounts do not
receive vendor-directory counts. Upcoming events are the next three published
future events. Search covers the visible snapshot only; use each module to search
all its records. Missing data shows an empty state, and failed loading offers retry.
Reload to refresh. No fabricated activity, budget or planning statistics are shown.

## Vendors and expense linking

Open `/vendors` as an authorized wedding member. VIEW_VENDORS permits directory
reads; MANAGE_VENDORS additionally permits add/edit/archive/restore. Vendor-role
accounts cannot use the directory until scoped vendor access is implemented.
No invitation/account is created when adding a supplier. Contacts, events and
notes are optional. Archived suppliers keep their history and expense links.

In an unpaid expense's **Optional details**, choose an active vendor or leave it
unlinked. Existing archived links can be retained; paid expense links stay locked.
Vendor details show exact linked Estimated, Committed-unpaid and Paid totals only
with VIEW_EXPENSES. These totals do not represent a contract balance. Vendor
documents, invitations and separate vendor payment entry are deferred. This slice
adds no paid resources or dependencies. Live vendor acceptance remains pending.

## Guest invitations and RSVP

Open `/invitations` as a member with MANAGE_INVITATIONS. Save the invitation content and explicitly publish it, then create and copy each guest's individual link. Links are shown only when issued or replaced; replacement invalidates the old link. This slice does not send guest invitation emails. RSVP totals require VIEW_RSVP.

Guests open their link without signing in, view published events, and respond with named companions. Every companion is an individual guest record. Unselected companions remain recorded as declined. Archiving a primary guest revokes their link; restore does not reactivate it.

Restart an already-running development server once after updating this feature so cached Mongoose models load the new fields. Family Member defaults now include read-only Events. For other existing weddings, preview `node --env-file=.env.local scripts/migrate-family-event-access.mjs --tenant=<wedding-id>` and add `--apply` only for the intended wedding. The current owner's wedding has already been updated.

Before deployment, configure trusted-edge/WAF rate limits for public endpoints. The application also applies MongoDB-backed per-token limits, which do not replace protection against random-token traffic.

Invitation QA (temporary development records, no email): build, set `RUN_INVITATIONS_LIVE_QA=1`, then run `npm run test:e2e -- --config playwright.invitations.config.ts`.

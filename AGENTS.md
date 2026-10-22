<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Make My Marriage — Agent Instructions

The approved product and architecture rules are in [`docs/AGENTS.md`](docs/AGENTS.md). Read that file and the relevant approved design documents before implementing a feature. The PRD, System Design, Database Design, and API Design documents are the product and technical sources of truth; if they conflict, call out the conflict and follow the latest explicit user decision rather than silently inventing a rule.

## Repository rules

- Keep this application a TypeScript modular monolith using the Next.js App Router, Node.js, MongoDB Atlas, Mongoose, and AWS S3 as documented. Do not add microservices, Kubernetes, Kafka/RabbitMQ, or Redis without a concrete approved requirement.
- Keep `app/` focused on route composition and thin Route Handlers. Put domain behavior in `modules/<domain>/`; put cross-cutting server infrastructure in `lib/`; keep reusable UI primitives in `components/ui/` and domain-specific UI with its module.
- Keep server-only code, secrets, database access, authorization checks, and storage credentials out of client components. Validate data at every external boundary.
- Do not create fake production behavior or placeholders that imply a feature is implemented. Scaffold-only changes should stay visibly scaffold-only.

## Tenant, identity, and access rules

- Local email/password accounts must verify their email address before they can sign in. Verification tokens are one-time, expiring, and stored only as hashes.

- One wedding is one tenant. A user can have at most one `ACTIVE` or `SUSPENDED` wedding membership at a time. Preserve `REMOVED` membership history; a user with only removed memberships may later join or create a different wedding.
- Every tenant-owned read and write must include the tenant scope in the database operation. Resolve tenant context on the server from a verified session and membership. Never authorize using a client-supplied `tenantId` alone.
- A wedding can have multiple members. Authorization must verify both tenant membership and the relevant role/permission for each operation; do not rely only on hidden UI controls.
- Member management uses multiple existing `roleIds`. Invitations expire after seven days, use hashed one-time tokens, and are emailed through SES with a copyable link returned only when issued/replaced. Report email-delivery failures separately from invitation creation. Protect all owner memberships and block self-access changes/ownership transfer in this slice; non-owner managers cannot grant or manage permissions beyond their own. Acceptance requires the verified invited email and atomically enforces one current membership; rejoining the same wedding reactivates its retained removed membership.
- Tasks use wedding-member IDs for assignment. Use explicit assigned-task permissions for family access; scope reads, counts, comments, activity, and updates to assignments unless the member has broad task access. Assigned updates can change status and existing checklist completion only. Require task revisions on updates/deletion.
- Events use the server-resolved wedding timezone and optional end date/time. Store UTC instants; reject ambiguous/nonexistent daylight-saving times. Event and timeline mutations require the current version, and event deletion must preserve linked records.
- Tasks: planners manage all tasks; family members see only their assigned tasks and may update status/checklists. Enforce assignment scope on the server when implementing this feature.
- Guests do not create accounts. Public access is limited to explicitly designed wedding, invitation, RSVP, and livestream flows and must use the corresponding public token/lookup rules. Store only hashed invitation tokens where specified by the database design.
- Guests first slice: archive/restore retains individual records; duplicate contacts/names trigger a tenant-scoped warning with explicit keep-both confirmation, never a unique-contact constraint or automatic merge. All guest/family mutations require revisions and MANAGE_GUESTS; reads require VIEW_GUESTS or MANAGE_GUESTS. Family deletion is blocked while any active or archived guest remains. Primary contacts must be active guests in the same family; moving/archiving them clears that reference transactionally.

## Product scope

- Dashboard summaries use real server-resolved data and module permissions.
  Reuse assignment-scoped task access; do not expose vendor-directory counts to
  VENDOR accounts or financial totals without VIEW_EXPENSES. Missing permissions
  produce null sections, not fabricated zero metrics. Do not restore sample
  activity or unscoped cross-module feeds. Dashboard search covers its snapshot.

- Approved Vendors first-slice defaults: use `category` as the canonical field;
  archive/restore preserves linked expenses. Derive financial totals only from
  linked expenses and expose them only with VIEW_EXPENSES. Vendor-account
  directory access is deferred until vendor-specific access is designed; the
  existing VENDOR role's VIEW_VENDORS grant alone must not expose the directory.

- Approved Expenses first slice: INR only, exact Decimal128 storage and decimal
  string API values. Expenses start Estimated/Committed; one full manual payment
  atomically makes them Paid. No partial payments, refunds or payment corrections.
  Paid entries cannot be edited or archived; unpaid entries support archive/restore
  with retained history. Budget editing is deferred and UI shows Budget not set.
  VIEW_EXPENSES is required for reads and alongside the relevant write permission;
  payment recording additionally requires MANAGE_PAYMENTS. Never process money.
- Expense category is required free text (up to 80 characters) with optional
  built-in suggestions. Preserve custom labels on each expense; never create a
  permanent custom-category catalog or add them to suggestion lists. Normalize
  whitespace and built-in spellings; category filtering supports custom labels.

- Google OAuth through Auth.js is the chosen first self-service signup option
  for the zero-budget demo. Use basic identity scopes only; no billable identity
  service or automatic provider linking. Keep local verified-password accounts
  working. Email signup/reset must show unavailable states while free email is
  unconfigured; never send users into fake email-success flows. See
  docs/GOOGLE_SIGN_IN_SETUP.md for the pending one-time owner setup.

- Strict zero-budget learning/demo project: use only free services without paid
  trials, upgrades, top-ups or overage billing. This supersedes earlier approval
  to send through SES. Keep paid email disabled locally and on Vercel; never
  fall back to SES. A free provider requires account/sender verification before
  enabling email. Preserve verified-email sign-in; never auto-verify accounts.
  Keep Vercel on Hobby and confirm Atlas is Free before promising zero cost.
  AWS/S3/Docker remain future architecture directions, not permission to incur
  charges. Follow docs/FREE_DEPLOYMENT.md.

- The product is free. Do not add SaaS billing, subscriptions, freemium tiers, or premium entitlements.
- V1 includes in-app notifications/reminders for authenticated members. Guest reminders and WhatsApp are Phase 2; use email only where the approved documents require it (such as account/security flows).
- Use S3 for original, optimized, and thumbnail photo objects; MongoDB stores metadata and object references. Upload authorization and completion must be server-verified.
- Do not add accommodation, transportation, seating planning, guest check-in, face recognition, or automatic post-wedding deletion unless the user changes the product scope.
- Use an external livestream provider initially. Do not build video infrastructure into this application.

## Change and verification rules

- Before a substantial feature, state the approach and affected modules; keep responsibilities aligned with the design documents.
- Keep [`docs/BUILD_TRACKER.md`](docs/BUILD_TRACKER.md) current as work is completed. Mark UI previews separately from implemented features, and update the root and `docs/AGENTS.md` instructions when the user approves lasting product, architecture, or workflow decisions.
- Add only dependencies needed for the approved feature. Avoid speculative infrastructure and duplicated domain logic.
- Do not commit or push unless the user explicitly requests it.
- Follow the repository scripts for linting, type checking, formatting, and production builds when validation is requested or needed for the change. Add/run tests when requested or when the task explicitly requires test verification.

## Approved guest invitation and Events follow-up

- Family Member has VIEW_EVENTS for the full workspace schedule, without MANAGE_EVENTS. Existing system roles use an explicit tenant-scoped migration; never silently migrate every wedding.
- Guest invitations are separate from seven-day collaborator invitations. Public guest links are opaque hashed bearer tokens, explicitly replaceable/revocable, with no automatic expiry. Archiving a guest revokes their link; restoring the guest does not reactivate it.
- Guests RSVP without accounts and may add named companions as individual guest records. Public responses expose only the linked party and published events, never the guest directory or private contact/notes. Enforce revision checks, retry idempotence, bounded companions, and explicit duplicate confirmation on the server.

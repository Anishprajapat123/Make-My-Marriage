# Make My Marriage — Development Rules

This file is the project-specific development guide. The four design documents in this folder define product and technical behavior. Read the relevant documents before implementing a feature. When they conflict, report the conflict and follow the user's latest explicit decision; do not silently make a new product decision.

## Product and architecture

- Build a free wedding planning and management product. Do not add billing, subscriptions, freemium tiers, or premium entitlements.
- Local email/password accounts must verify their email address before sign-in. Keep registration and password-recovery responses generic so they do not disclose whether an address has an account.
- Use the approved TypeScript, Next.js App Router, Node.js modular-monolith architecture with MongoDB Atlas/Mongoose and AWS S3. Do not introduce microservices, Kubernetes, Kafka/RabbitMQ, or Redis without an approved concrete requirement.
- Keep the application modular: thin pages and Route Handlers in `app/`, domain behavior in `modules/`, cross-cutting infrastructure in `lib/`, and reusable shared UI in `components/`.
- Do not implement fake production functionality or expand product scope without user approval.

## Tenant and authorization requirements

- One wedding is one tenant. A user may have at most one `ACTIVE` or `SUSPENDED` membership at a time. Retain `REMOVED` membership history; a user with no active or suspended membership may later join or create another wedding.
- Every tenant-owned database read and write must be scoped by `tenantId`. Resolve tenant context on the server from a verified authenticated membership; never trust a client-supplied tenant ID.
- A wedding may have multiple members. Enforce membership and the required role/permission on the server for every protected operation; UI visibility is not authorization.
- Approved Members slice: support multiple existing roles, seven-day SES invitations plus a copyable issuance/replacement link, token hashes only in MongoDB, and retained invitation history. Protect owner memberships; disable self-access edits/removal and ownership transfer. Non-owner managers may neither grant nor manage permissions beyond their own. Revalidate inviter permissions on acceptance, require the verified invited email, and atomically consume the invitation with the one-current-membership constraint. Rejoining the same wedding reactivates the retained removed membership and preserves existing references. Keep email delivery failure distinct from successful invitation creation.
- Event reads require `VIEW_EVENTS`, mutations require `MANAGE_EVENTS`; resolve timezone from the wedding. Support overnight schedules and optional ends, bounded timeline entries, stale-write protection, and blocked deletion of linked events. Keep desktop/mobile fields consistent; ceremony type is optional.
- Approved Tasks access: planners manage all tasks; family members see only tasks assigned to their membership and update status/checklists. Enforce this scope on every read/write; do not grant wedding-wide task access to represent assigned access.
- Task assignments use `assigneeMemberIds`, with explicit `VIEW_ASSIGNED_TASKS`/`UPDATE_ASSIGNED_TASKS` permissions. Checklist completion cannot add/remove/rename steps for assigned-only members. Planners post comments in the first slice; scoped members may read them. Keep revisions, tenant-scoped references, and transactional append-only activity records for task mutations. Existing family system roles require the explicit tenant-scoped migration documented in README.
- Guests have no accounts. Limit guest access to designed public pages, invitation links, RSVP, and public livestream lookup. Validate/expire/revoke tokens as designed, store invitation tokens hashed when specified, and avoid leaking tenant data through public endpoints.
- Approved Guests first slice: archive/restore rather than permanent guest deletion; warn on likely duplicates and require explicit keep-both confirmation. Do not enforce unique phone/email/family names or add automatic merge. Require revisions on guest/family mutations. Use VIEW_GUESTS/MANAGE_GUESTS for reads and MANAGE_GUESTS for writes. Block family deletion with any remaining guests, including archived guests. Primary contact must be an active guest in that family; clear it atomically when the guest moves or is archived. Guest/family behavior stays in modules/guests; import, guest links and RSVP are later slices.

## Product boundaries

- Approved Issues slice: planners manage with VIEW_ISSUES + MANAGE_ISSUES;
  REPORT_ISSUES-only members may report, read and comment on their own reports.
  Apply scope to counts/comments/reference lookups too. Vendor-role accounts have
  no general directory access. Resolve/reopen preserves history; deletion is
  deferred. Assignees must have access to the issue, not merely active membership.

- Notifications first slice implements the approved design handoff: new active
  task assignees with task-read access, excluding the actor; unchanged assignments
  and existing tasks are not backfilled. Persist notifications in the task
  transaction with event/recipient deduplication. Inbox/count/read mutations are
  tenant + recipientMemberId scoped. Generic stored text must not expose historical
  task titles after access is lost; reuse taskScope to authorize enrichment and
  normal task routes to recheck navigation. Refresh on navigation/focus/manual retry;
  no polling, email, push, preferences, read-all or scheduled reminders in this slice.

- Dashboard first slice: real, permission-scoped server summaries shared by the
  page and GET /api/v1/dashboard. Keep assignment-only task scope, independent
  guest/RSVP permissions, VIEW_EXPENSES financial gating and VENDOR directory
  exclusion. Return null for unauthorized sections and skip their queries. Keep
  previews bounded; snapshot search is not global search. Cross-module activity
  requires a separate permission-filtering contract before implementation.

- Approved Vendors defaults (22 October 2026): canonical `category`, archive/restore
  retaining expense links, and financial totals derived only from linked expenses
  with VIEW_EXPENSES required. Defer vendor-account directory access until a
  vendor-specific access contract exists; VENDOR's existing VIEW_VENDORS grant
  alone does not authorize the full directory. Do not duplicate payment balances.

- Approved Expenses first slice: INR, exact Decimal128 and decimal string
  contracts, Estimated/Committed creation and one embedded full-payment record
  that derives Paid. Archive/restore unpaid entries; protect paid entries from
  edits/archive. No partial payments, corrections/refunds or budget editing yet.
  Require VIEW_EXPENSES plus MANAGE_EXPENSES/MANAGE_PAYMENTS for their mutations,
  revisions, idempotent creation/payment retries and tenant-scoped references.
  Recording payment documents money already paid externally; it never transfers
  money. Financial records are never exposed to guests or unauthorized members.
- Expense categories allow required free text (maximum 80 characters) alongside
  built-in suggestions. Custom values belong only to the expense, not a global
  or tenant category list. Preserve display casing for custom labels and support
  escaped exact case-insensitive filtering. Normalize built-in labels consistently.

- Selected self-service demo path: direct Google OAuth via existing Auth.js,
  basic identity scopes, no paid identity platform or silent local-account linking.
  Preserve existing local verified users. Unconfigured email signup/reset returns
  a global unavailable response before account lookup and has matching UI states.
  OAuth client creation is an owner setup prerequisite, not per-visitor approval.

- Strict zero-budget demo supersedes the earlier SES approval. No paid trials,
  top-ups, overage billing or paid resources. Paid email is disabled locally and
  on Vercel, with no SES fallback. A free provider must have a verified sender
  and active Free account before use. Preserve verified-email authentication;
  do not auto-verify accounts to compensate for unavailable email. Confirm Atlas
  is Free and Vercel remains Hobby. AWS/S3 architecture is future direction only.

- V1 notifications and reminders are in-app for authenticated members. Guest reminders and WhatsApp are Phase 2. Email is only for flows explicitly approved in the API and product documents.
- Store photo/document objects in S3 and their metadata/references in MongoDB. Gallery uploads use original, optimized, and thumbnail variants; authorize uploads and verify completion server-side.
- Use an external livestream provider initially. Do not build video hosting infrastructure.
- Excluded from V1: accommodation, transportation, seating planner, guest check-in, face recognition, automatic post-wedding deletion, and SaaS billing.

## Implementation practices

- Keep secrets, database/storage clients, and authorization logic server-side. Use explicit server/client boundaries and validate all external input.
- Keep domain logic in its owning module and avoid duplicated business rules across pages, Route Handlers, services, and repositories.
- Tenant-aware repositories must require tenant context and apply it to the actual MongoDB query/update filter. Review indexes and unique constraints against the database design.
- Do not add a dependency without a concrete feature need. Prefer the simplest approach that satisfies the approved design.
- Before substantial implementation, state the approach and affected modules. Discuss architecture changes and unresolved conflicts before implementing them.
- Keep [`BUILD_TRACKER.md`](BUILD_TRACKER.md) current as work is completed. Distinguish UI previews from implemented features, and update this guide and the root `AGENTS.md` when the user approves lasting product, architecture, or workflow decisions.
- Use the existing package scripts for lint, formatting, type checking, and build validation when requested or appropriate. Add/run tests when the user requests them or the task explicitly requires test verification.
- Never commit or push unless the user explicitly asks.

## Approved invitation / RSVP follow-up

Family Member may read the full workspace Events schedule but cannot mutate events. Guest invitation links and RSVP are now an implemented slice, separate from collaborator invitations. Guest tokens have no automatic expiry; replacement/revocation and guest archive invalidate access. Restore requires an explicit new link. Guests need no account and can add named companions as individual records. Preserve party isolation, published-event-only public DTOs, hashed tokens, revision checks, idempotent retries, and duplicate confirmation. Do not expose private guest contacts, notes, or unrelated guests. Guest invitation links are copied/shared in this slice; no guest email delivery is claimed.

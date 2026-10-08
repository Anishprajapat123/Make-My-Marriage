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

- One wedding is one tenant. A user can have at most one `ACTIVE` or `SUSPENDED` wedding membership at a time. Preserve `REMOVED` membership history; a user with only removed memberships may later join or create a different wedding.
- Every tenant-owned read and write must include the tenant scope in the database operation. Resolve tenant context on the server from a verified session and membership. Never authorize using a client-supplied `tenantId` alone.
- A wedding can have multiple members. Authorization must verify both tenant membership and the relevant role/permission for each operation; do not rely only on hidden UI controls.
- Guests do not create accounts. Public access is limited to explicitly designed wedding, invitation, RSVP, and livestream flows and must use the corresponding public token/lookup rules. Store only hashed invitation tokens where specified by the database design.

## Product scope

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

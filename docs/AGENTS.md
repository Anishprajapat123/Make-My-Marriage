# Make My Marriage — Development Rules

This file is the project-specific development guide. The four design documents in this folder define product and technical behavior. Read the relevant documents before implementing a feature. When they conflict, report the conflict and follow the user's latest explicit decision; do not silently make a new product decision.

## Product and architecture

- Build a free wedding planning and management product. Do not add billing, subscriptions, freemium tiers, or premium entitlements.
- Use the approved TypeScript, Next.js App Router, Node.js modular-monolith architecture with MongoDB Atlas/Mongoose and AWS S3. Do not introduce microservices, Kubernetes, Kafka/RabbitMQ, or Redis without an approved concrete requirement.
- Keep the application modular: thin pages and Route Handlers in `app/`, domain behavior in `modules/`, cross-cutting infrastructure in `lib/`, and reusable shared UI in `components/`.
- Do not implement fake production functionality or expand product scope without user approval.

## Tenant and authorization requirements

- One wedding is one tenant. A user may have at most one `ACTIVE` or `SUSPENDED` membership at a time. Retain `REMOVED` membership history; a user with no active or suspended membership may later join or create another wedding.
- Every tenant-owned database read and write must be scoped by `tenantId`. Resolve tenant context on the server from a verified authenticated membership; never trust a client-supplied tenant ID.
- A wedding may have multiple members. Enforce membership and the required role/permission on the server for every protected operation; UI visibility is not authorization.
- Guests have no accounts. Limit guest access to designed public pages, invitation links, RSVP, and public livestream lookup. Validate/expire/revoke tokens as designed, store invitation tokens hashed when specified, and avoid leaking tenant data through public endpoints.

## Product boundaries

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

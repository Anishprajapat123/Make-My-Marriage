<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Make My Marriage Project Rules

1. Read the PRD, System Design, Database Design, and API Design before implementing major functionality.
2. Keep the application a modular monolith; do not introduce microservices.
3. One wedding is one tenant. In V1, one user account belongs to at most one wedding; one wedding can have multiple members.
4. Every tenant-owned database query must be scoped to `tenantId`. Never trust client-supplied tenant context; derive it from an authenticated membership or a valid guest invitation token.
5. Guests do not have application accounts. Keep guest access limited to public wedding and invitation/RSVP flows.
6. Use TypeScript, MongoDB Atlas, and Mongoose. Store photos/documents in S3 and references/metadata in MongoDB.
7. Keep business logic in domain modules. Keep route handlers thin, and do not put business logic in page components.
8. Validate external input. Keep secrets and database/storage code on the server.
9. Do not add dependencies without a concrete need. Avoid premature infrastructure.
10. Do not introduce billing/subscription features or automatic post-wedding deletion.
11. Before major implementation work, explain the approach and affected modules.

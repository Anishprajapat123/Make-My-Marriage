# Make My Marriage — Build Tracker

This tracker records what is built and what remains for the Make My Marriage V1. It follows the [PRD](<Make My Marriage — Product Requirements Document (PRD).md>), [System Design](Make_My_Marriage_System_Design_Document.md), [Database Design](Make_My_Marriage_Database_Design_Document.md), and [API Design](Make_My_Marriage_API_Design_Document.md). Those documents remain the source of truth if this checklist is incomplete or out of date.

## Status key

- `[x]` Complete and verified for its stated scope.
- `[~]` In progress.
- `[ ]` Not started.
- `[?]` Needs a product or technical decision.

**Important:** a UI preview alone does not mean the feature is implemented. Mark a feature complete only when its agreed UI, server behavior, authorization, persistence, and relevant verification are complete. Update this file as work lands.

## Current project status

- `[x]` Initial Next.js App Router and TypeScript scaffold, shared configuration, modular-monolith folders, Docker foundation, and project instructions.
- `[x]` Responsive dashboard UI preview for desktop and mobile, using clearly labeled sample content.
- `[ ]` Dashboard connected to authentication, tenant-scoped data, and the dashboard API. Current names, counts, search results, notifications, and activity are sample-only; no changes are saved.
- `[ ]` Production features and persistence. No business module should be treated as implemented solely because its folder or a dashboard preview exists.

## Recommended implementation sequence

Build incrementally, one reviewable feature slice at a time. For each slice: agree on the UI and states, build the responsive UI, implement its server-side rules and persistence, verify permissions and tenant isolation, then mark it complete. Avoid creating every screen as a disconnected mock before wiring any feature to real behavior.

### 0. Foundation

- `[x]` Application scaffold and approved folder structure.
- `[x]` Tailwind, ESLint, TypeScript, Next.js, Docker, environment example, and README foundation.
- `[ ]` Confirm local MongoDB Atlas connection configuration and required secrets in each environment.
- `[ ]` Add shared database connection, error handling, logging, and validation foundations as the first feature needs them.
- `[ ]` Establish unit, integration, API, security, and E2E test conventions before relying on them for feature acceptance.

### 1. Dashboard UI preview

- `[x]` Dashboard layout and responsive desktop/mobile presentation.
- `[x]` Sample wedding overview, planning summaries, upcoming event, attention items, recent activity, and preview states.
- `[x]` Make unavailable workspace navigation visibly non-navigating until its screen exists.
- `[ ]` Replace sample content with authenticated, tenant-scoped dashboard data after the foundation and core modules are available.
- `[ ]` Add real loading, empty, and error states when connecting the dashboard to data.

### 2. Account, authentication, and workspace access

- `[ ]` Login, registration/onboarding, logout, password recovery, and profile UI.
- `[ ]` Auth.js v5 foundation, session handling, and protected workspace routes.
- `[ ]` Wedding creation/setup flow and the initial owner membership.
- `[ ]` Resolve tenant context from the verified session and membership on the server.
- `[ ]` Enforce one active or suspended wedding membership per account; retain removed history and allow a removed member to join or create another wedding.
- `[ ]` Member management, member invitations/acceptance, custom roles, and permission checks.
- `[ ]` Verify that guests never need accounts and that UI visibility is not used as authorization.

### 3. Core planning

- `[ ]` Events and wedding timeline: create, view, edit, delete, event details, venues, and timeline activities.
- `[ ]` Tasks: assignment, due dates, priorities, statuses, event association, checklists/comments as scoped by the design.
- `[ ]` Guest and family management: individual guest records, duplicate checks, filtering/search, guest statistics, and import preview/commit for the expected wedding size.
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

- Initial scaffold completed.
- Responsive dashboard UI preview created; it currently uses sample data only.
- Dashboard search now safely normalizes repeated query parameters; unfinished sidebar items do not navigate to placeholder content.

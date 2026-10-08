# Make My Marriage

Next.js modular-monolith scaffold for the Make My Marriage project.

This repository currently contains application structure and tooling only. It
does not implement authentication, wedding workflows, tenant access, database
models, or file uploads. The empty module folders reserve the approved domain
boundaries. `docs/AGENTS.md` contains the project development rules.

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
2. Copy `.env.example` to `.env.local` and add local values when implementing
   integrations. The scaffold itself does not require secrets to start.
3. Start the development server with `npm run dev` and open
   `http://localhost:3000`.

To run the Dockerized production build locally, use `docker compose up --build`
and open `http://localhost:3000`. The compose file runs only the application;
the project targets MongoDB Atlas and does not bundle a local database service.

Run `npm run lint`, `npm run typecheck`, and `npm run build` to check the
scaffold. `npm run format:check` verifies formatting.

## Tests

- `npm run test` runs Vitest once; `npm run test:watch` starts its watch mode.
- `npm run test:e2e` runs Playwright against the application. Playwright starts
  the development server if one is not already available.
- Install the Playwright browser once with `npx playwright install` before
  running E2E tests on a fresh machine.
- Place unit, component, API, integration, and security tests under `tests/`.
  Async Server Components should be covered through E2E tests because Vitest
  does not currently run them directly.

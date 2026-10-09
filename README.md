# Make My Marriage

Next.js modular-monolith application for the Make My Marriage project. The
current implementation includes the responsive dashboard preview and an
initial account-authentication foundation: local registration with email
verification, credentials sign-in, password recovery, Auth.js sessions, and a
protected workspace shell. Wedding onboarding creates the wedding tenant,
default role templates, and initial owner membership transactionally. The dashboard still
shows sample planning metrics; tenant-aware planning modules and broader
membership/permission management are not implemented yet.

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

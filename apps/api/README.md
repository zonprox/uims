<!-- generated-by: gsd-doc-writer -->
# @uims/api

Backend REST and WebSocket API service for the Unified IT Management System (UIMS), built with NestJS 11, Prisma 7 ORM, PostgreSQL 17, Redis 8, and Socket.io.

Part of the [UIMS](../../README.md) monorepo.

---

## Overview & Architecture

The API serves as the core orchestration and data layer for UIMS, managing IT hardware assets, software licenses, consumable inventory, IP/network infrastructure (IPAM), corporate employee directory (AD/LDAP sync), audit trails, and multi-tenant organization hierarchies.

- **Framework:** [NestJS](https://nestjs.com/) v11 on Express
- **Database & ORM:** PostgreSQL 17 with [Prisma ORM](https://www.prisma.io/) v7 and native connection pooling via `@prisma/adapter-pg`
- **Authentication & Security:** JWT (Access & Refresh tokens), cookie parsing, Helmet security headers, Throttler rate limiting, fail-closed validation, AES-256 license key encryption, and HMAC-signed tamper-evident audit logging
- **Real-Time Layer:** [Socket.io](https://socket.io/) gateway (`/notifications`) for live notifications, count badges, and system alerts with strict token verification
- **Asynchronous Workers & Scheduling:** `@nestjs/schedule` for daily midnight UTC automated scans (license expiry, warranty expiration, maintenance schedules, low consumable inventory)
- **Caching & Resilience:** Redis 8 (`ioredis`) for high-performance caching and counters with automatic in-memory fallback
- **Search Engine:** Integrated global search across assets, inventory, licenses, and users, with MeiliSearch support
- **Documentation:** Interactive OpenAPI / Swagger UI at `/api/v1/docs`

---

## Installation & Prerequisites

### Prerequisites

- **Node.js:** `^22.0.0` or higher
- **pnpm:** `^11.0.0` or higher
- **PostgreSQL:** v17 (exposed on port `5433` via Docker Compose or local `5432`)
- **Redis:** v8 (exposed on port `6381` via Docker Compose or local `6379`)

### Setup Steps

From the monorepo root:

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Start local backing services (PostgreSQL, Redis)
pnpm run docker:dev
# Or use the dev stack daemon:
./scripts/dev.sh start

# 4. Generate Prisma Client, run migrations, and seed initial dataset
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# 5. Start the API development server
pnpm run dev:api
```

Alternatively, work directly inside the `apps/api` directory:

```bash
cd apps/api

# 1. Configure environment file
cp .env.example .env

# 2. Generate Prisma Client and apply migrations
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed

# 3. Start development server with TypeScript watch & nodemon
pnpm dev
```

The API server will listen on `http://localhost:3000` (or `http://localhost:3002` if configured via `APP_PORT` / `PORT`).

---

## Usage

### Serving the Frontend & External Clients

The API communicates with the frontend SPA (`apps/web`) and external integrators via JSON REST endpoints and Socket.io WebSocket channels:

1. **Global Route Prefix:** All REST endpoints are mounted under `/api/v1`.
2. **API Documentation:** Interactive Swagger UI documentation is available at `/api/v1/docs`.
3. **Standardized Response Envelope:** Successful responses are transformed globally by `TransformInterceptor`:
   ```json
   {
     "success": true,
     "data": { ... },
     "timestamp": "2026-09-28T00:00:00.000Z"
   }
   ```
4. **Error Handling:** Standardized error envelopes and database exception translations are handled globally by `HttpExceptionFilter` and `PrismaExceptionFilter`.
5. **WebSocket Gateway:** The `NotificationsGateway` provides bidirectional real-time push events under the `/notifications` namespace. Authentication tokens must be supplied via handshake auth (`auth: { token }`) or `Authorization: Bearer <token>` headers; query parameter tokens are explicitly rejected.

---

## API Summary (Key Modules)

| Module | Route Prefix | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | User login, JWT access & refresh token issuance, token rotation, logout, and authenticated session state. |
| **Users** | `/api/v1/users` | System user CRUD, status management, profile management, and role associations. |
| **Roles & Permissions** | `/api/v1/roles` | Role-Based Access Control (RBAC), custom roles, and granular permission assignments. |
| **Directory** | `/api/v1/directory` | Corporate employee directory, Active Directory (AD) synchronization, organizational units (OUs), directory groups, and batch CSV import/export. |
| **Organization** | `/api/v1/organizations`<br>`/api/v1/departments`<br>`/api/v1/positions`<br>`/api/v1/locations` | Enterprise multi-tenant hierarchy, subsidiaries, departments, job positions, and spatial location trees (sites, buildings, floors, rooms, racks). |
| **Assets** | `/api/v1/assets` | Hardware lifecycle management (procurement, deployment, maintenance, retirement), asset categories, warranty tracking, barcode/QR tagging, and spatial assignment. |
| **Licenses** | `/api/v1/licenses` | Software license compliance tracking, seat allocations, expiration dates, and encrypted license keys at rest. |
| **Inventory** | `/api/v1/inventory`<br>`/api/v1/vendors` | Consumable inventory tracking, stock movements (check-in, check-out, adjustments), low-stock thresholds, and vendor/supplier management. |
| **Network (IPAM)** | `/api/v1/network` | IP Address Management (IPAM), subnets, VLANs, network switches, switch ports, patch panels, racks, MAC OUI vendor lookups, and CIDR subnet calculation. |
| **Audit** | `/api/v1/audit` | Tamper-evident, HMAC-signed immutable audit trail logging and compliance event queries. |
| **Reports** | `/api/v1/reports` | Analytical reporting, asset depreciation schedules, software compliance audits, and utilization metrics. |
| **Dashboard** | `/api/v1/dashboard` | Aggregated telemetry, health indicators, asset status distributions, and activity feeds. |
| **Notifications** | `/api/v1/notifications` | In-app notification center, read status tracking, scheduled alert background worker (`ScheduledAlertsWorker`), and live WebSocket pushes. |
| **Search** | `/api/v1/search` | Unified global search across assets, inventory, licenses, and users. |
| **Settings** | `/api/v1/settings` | System-wide and tenant configuration parameters and feature toggles. |
| **Health** | `/api/v1/health` | Service liveness, readiness, and PostgreSQL (`SELECT 1`) and Redis (`ping()`) latency checks (returns HTTP 503 if dependencies fail). |

---

## Configuration & Environment Variables

Environment variables are validated on startup using Zod in `src/config/app.config.ts`. Configure variables in `apps/api/.env` or in the monorepo root `.env`:

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public` | **Yes** |
| `JWT_SECRET` | Secret key for signing access JWTs (min 32 chars) | `uims-jwt-secret-change-in-production` | **Yes** |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens (min 32 chars) | `uims-jwt-refresh-secret-change-in-production` | **Yes** |
| `AUDIT_SIGNING_KEY` | Secret key for HMAC audit record verification | `uims-audit-signing-key-change-in-production` | Production |
| `LICENSE_ENCRYPTION_KEY` | AES-256 key for software license key encryption (min 32 chars) | `uims-license-encryption-key-32ch` | No |
| `JWT_EXPIRATION` | Access token lifespan | `15m` | No |
| `PORT` / `APP_PORT` | API server listen port | `3000` (or `3002` in dev stack) | No |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | No |
| `REDIS_URL` | Redis connection URL (required in production) | `redis://:uims_redis_2026@localhost:6381` | Production |
| `CORS_ORIGIN` | Comma-separated allowed origins for CORS | `http://localhost:5679,http://localhost:3000` | No |
| `ALLOWED_ORIGINS` | Fallback allowed origins for CORS | `http://localhost:5679` | No |
| `MEILISEARCH_HOST` | MeiliSearch instance endpoint | `http://localhost:7700` | No |
| `MEILISEARCH_API_KEY` | MeiliSearch master API key | `uims_meili_master_key_2026` | No |

---

## Database Management

Prisma CLI scripts handle schema migrations, client generation, and data seeding:

```bash
# Generate Prisma Client
pnpm --filter @uims/api prisma:generate

# Apply migrations in development
pnpm --filter @uims/api prisma:migrate

# Apply migrations in production
pnpm --filter @uims/api prisma:deploy

# Seed initial database records
pnpm --filter @uims/api prisma:seed

# Launch Prisma Studio web GUI
pnpm --filter @uims/api prisma:studio

# Import enterprise network data from Excel/spreadsheet
pnpm --filter @uims/api network:import
```

*Monorepo root shortcuts:*
- `pnpm run db:generate`
- `pnpm run db:migrate`
- `pnpm run db:migrate:prod`
- `pnpm run db:seed`
- `pnpm run db:studio`

---

## Testing

Testing is powered by [Vitest](https://vitest.dev/). The test suite includes 77+ test suites covering unit logic, integration flows, boundary checks, and adversarial security scenarios.

```bash
# Run all tests in the API package
pnpm --filter @uims/api test

# Run tests in watch mode
pnpm --filter @uims/api test:watch

# Alternatively, from within apps/api:
cd apps/api
pnpm test
pnpm test:watch
```

### Test Suite Structure

- **Unit & Service Tests (`src/**/*.spec.ts`):** Verify controllers, services, guards, interceptors, and background workers in isolation.
- **Adversarial & Boundary Tests (`src/**/*.adversarial.spec.ts`, `test/*.spec.ts`):** Challenge role boundaries, cryptographic security, rate limiting, and database query ceilings.
- **End-to-End Tests (`test/e2e/**/*.e2e-spec.ts`):** Validate multi-entity operations, network topology synchronization, spatial location hierarchies, and real-time WebSocket events.

---

## Development Scripts

The following scripts are defined in `apps/api/package.json`:

| Command | Description |
| :--- | :--- |
| `pnpm --filter @uims/api dev` | Start development server with TypeScript watch & nodemon hot reload |
| `pnpm --filter @uims/api build` | Compile TypeScript source code into `dist/` |
| `pnpm --filter @uims/api start` | Run compiled application with Node.js (`dist/main.js`) |
| `pnpm --filter @uims/api start:prod` | Run production application with Node.js (`dist/main.js`) |
| `pnpm --filter @uims/api typecheck` | Execute TypeScript compiler check without emitting output (`tsc --noEmit`) |
| `pnpm --filter @uims/api lint` | Run ESLint across `src/**/*.ts` |
| `pnpm --filter @uims/api test` | Execute test suite via Vitest (`vitest run`) |
| `pnpm --filter @uims/api test:watch` | Run Vitest in interactive watch mode |
| `pnpm --filter @uims/api prisma:generate` | Generate Prisma Client artifacts |
| `pnpm --filter @uims/api prisma:migrate` | Apply schema migrations in development (`prisma migrate dev`) |
| `pnpm --filter @uims/api prisma:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `pnpm --filter @uims/api prisma:seed` | Seed database records (`prisma db seed`) |
| `pnpm --filter @uims/api prisma:studio` | Launch Prisma Studio GUI browser |
| `pnpm --filter @uims/api network:import` | Import network inventory from Excel spreadsheet |
| `pnpm --filter @uims/api clean` | Remove `dist/` build directory |

---

## Contributing & Monorepo Directives

For monorepo architecture guidelines, code standards, and contribution workflows, refer to the [UIMS Engineering Directives](../../AGENTS.md) and [Development Guide](../../docs/DEVELOPMENT.md).

---

## License

This package is part of the UIMS proprietary platform and is `UNLICENSED` (Private).

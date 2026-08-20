<!-- generated-by: gsd-doc-writer -->
# @uims/api

Backend REST and WebSocket API service for the Unified IT Management System (UIMS), built with NestJS, Prisma ORM, PostgreSQL, Redis, and Socket.io.

Part of the [UIMS](../../README.md) monorepo.

---

## Overview & Architecture

The API serves as the core orchestration and data layer for UIMS, managing IT assets, software licenses, consumable inventory, IP/network infrastructure, audit trails, and multi-tenant organization hierarchies.

- **Framework:** [NestJS](https://nestjs.com/) v11 on Express
- **Database & ORM:** PostgreSQL with [Prisma ORM](https://www.prisma.io/) v7 and native connection pooling (`@prisma/adapter-pg`)
- **Authentication & Security:** JWT (Access & Refresh tokens), cookie parsing, Helmet security headers, Throttler rate limiting, and HMAC-signed tamper-evident audit logging
- **Real-Time Layer:** [Socket.io](https://socket.io/) gateway (`/notifications`) for live notifications and count badges
- **Asynchronous Processing:** Redis and [BullMQ](https://docs.bullmq.io/)
- **Documentation:** Interactive OpenAPI / Swagger UI at `/api/v1/docs`

---

## Quick Start & Installation

### Prerequisites

- Node.js 22.0.0 or higher
- pnpm 11.0.0 or higher
- PostgreSQL (v16+) and Redis (v7+) running locally or via Docker

### Setup Steps

From the monorepo root:

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Start local database and Redis services (optional, using Docker)
pnpm run docker:dev

# 4. Generate Prisma client, apply migrations, and seed data
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# 5. Start the API development server
pnpm run dev:api
```

Alternatively, work directly inside the `apps/api` directory:

```bash
cd apps/api
cp .env.example .env   # Or configure apps/api/.env
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

The API server will start at `http://localhost:3000` (or the configured `PORT`).

---

## Usage

### Serving the Frontend

The API communicates with the frontend application (`apps/web`) via standard JSON REST endpoints and WebSocket channels:

1. **Global Prefix:** All REST endpoints are rooted at `/api/v1`.
2. **API Documentation:** Interactive Swagger UI documentation is available at `/api/v1/docs`.
3. **Response Envelope:** Successful responses are standardized via `TransformInterceptor` into a consistent structure:
   ```json
   {
     "success": true,
     "data": { ... },
     "timestamp": "2026-08-20T08:00:00.000Z"
   }
   ```
4. **Error Handling:** Standardized exception envelopes and database error mappings are handled globally by `HttpExceptionFilter` and `PrismaExceptionFilter`.
5. **Real-Time Push:** The `NotificationsGateway` provides bidirectional communication under the `/notifications` Socket.io namespace.

---

## API Modules Summary

| Module | Route Prefix | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | User login, token refresh, logout, session state, and credential validation. |
| **Users** | `/api/v1/users` | User CRUD operations, status management, and profile associations. |
| **Roles** | `/api/v1/roles` | Role-based access control (RBAC) and granular permission assignments. |
| **Organization** | `/api/v1/organizations`<br>`/api/v1/departments`<br>`/api/v1/positions` | Organizational hierarchy, branches, departments, and job positions. |
| **Assets** | `/api/v1/assets` | Hardware lifecycle management, tracking, assignments, and status transitions. |
| **Licenses** | `/api/v1/licenses` | Software license compliance, seat allocations, expiration, and keys. |
| **Inventory** | `/api/v1/inventory` | Consumable inventory tracking, stock movements, check-in/out, and reorder levels. |
| **Network** | `/api/v1/network` | IP address management (IPAM), subnets, VLANs, network devices, and topology. |
| **Audit** | `/api/v1/audit` | Tamper-evident, HMAC-signed audit logging and compliance event queries. |
| **Reports** | `/api/v1/reports` | Analytical reporting, asset depreciation, compliance audits, and utilization metrics. |
| **Dashboard** | `/api/v1/dashboard` | Aggregated statistics, health indicators, asset summaries, and recent activity. |
| **Notifications** | `/api/v1/notifications` | Notification history, read states, and live WebSocket push events. |
| **Search** | `/api/v1/search` | Unified global search across assets, inventory, licenses, and users. |
| **Settings** | `/api/v1/settings` | System-wide and tenant configuration parameters. |
| **Health** | `/api/v1/health` | Service liveness, readiness, and database/Redis connection checks. |

---

## Configuration & Environment Variables

Configure environment variables in `apps/api/.env` or in the root `.env` file:

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://uims:secret@localhost:5432/uims_db?schema=public` | Yes |
| `JWT_SECRET` | Secret key for signing access JWTs | `your-jwt-secret` | Yes |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `your-refresh-secret` | No |
| `JWT_EXPIRATION` | Access token lifespan | `1d` | No |
| `PORT` | API server listen port | `3000` | No |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | No |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | No |
| `DB_POOL_MAX` | Maximum database connection pool size | `20` | No |
| `CORS_ORIGIN` | Comma-separated allowed origins for CORS | `http://localhost:5679,http://localhost:3000` | No |
| `ALLOWED_ORIGINS` | Fallback allowed origins for CORS | `http://localhost:5679` | No |
| `AUDIT_SIGNING_KEY` | Secret key for HMAC audit record verification | `uims-audit-tamper-evident-hmac-2026` | No |
| `MEILISEARCH_HOST` | MeiliSearch instance endpoint | `http://localhost:7700` | No |
| `MEILISEARCH_API_KEY` | MeiliSearch master/search API key | `meili_secret` | No |

---

## Database Management

Prisma CLI scripts are configured for migration, schema generation, introspection, and seeding:

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
```

*Monorepo root shortcuts: `pnpm run db:generate`, `pnpm run db:migrate`, `pnpm run db:migrate:prod`, `pnpm run db:seed`, `pnpm run db:studio`.*

---

## Testing

Testing is executed with [Vitest](https://vitest.dev/). Unit and integration tests cover controllers, services, guards, interceptors, and filters.

```bash
# Run all tests in the API package
pnpm --filter @uims/api test

# Run tests in watch mode
pnpm --filter @uims/api test:watch

# Alternatively, from within the apps/api directory:
cd apps/api
pnpm test
pnpm test:watch
```

---

## Development Scripts

From the repository root or within `apps/api`:

| Command | Description |
| :--- | :--- |
| `pnpm --filter @uims/api dev` | Start API in development mode with TypeScript watch & nodemon |
| `pnpm --filter @uims/api build` | Build TypeScript distribution into `dist/` |
| `pnpm --filter @uims/api start:prod` | Run compiled production build from `dist/main.js` |
| `pnpm --filter @uims/api typecheck` | Run TypeScript typecheck without emitting output |
| `pnpm --filter @uims/api lint` | Run ESLint across `src/**/*.ts` |
| `pnpm --filter @uims/api clean` | Remove `dist/` build artifacts |

---

## Contributing & Development Guide

For development guidelines, branching conventions, code style, and pull request procedures, see the [UIMS Development Guide](../../docs/DEVELOPMENT.md).

---

## License

This package is part of the UIMS proprietary platform and is `UNLICENSED` (Private).

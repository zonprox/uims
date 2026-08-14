# External Integrations

**Analysis Date:** 2026-08-14

## APIs & External Services
**Search & Indexing:**
- MeiliSearch (`getmeili/meilisearch:latest`) - Fast full-text search across assets, tickets, licenses, and directory users.
  - SDK/Client: Native HTTP `fetch` client implementation in `apps/api/src/modules/search/search.service.ts`.
  - Auth: `MEILISEARCH_API_KEY` (Header: `Authorization: Bearer <MEILISEARCH_API_KEY>`).
  - Endpoint: `MEILISEARCH_HOST` (Default: `http://localhost:7700` / `http://meilisearch:7700`).
  - Search Pipeline: Multi-index query endpoint (`POST /multi-search`) querying `assets`, `tickets`, `licenses`, and `users` indices simultaneously.
  - Index Syncing: Entity batch synchronization (`POST /indexes/{indexUid}/documents`) implemented in `syncAllToMeilisearch()`.
  - Resiliency / Fallback: Automatic health check via `GET /health` on initialization; automatically falls back to PostgreSQL `contains` multi-field search (`searchDatabaseFallback()`) if MeiliSearch is unreachable.

**Directory Services (Identity Providers):**
- Microsoft Active Directory / OpenLDAP / Azure AD - User and group synchronization support modeled in `apps/api/prisma/schema.prisma`.
  - Source tracking: `DirectorySource` enum supporting `LOCAL`, `LDAP`, `AZURE_AD`.
  - Service: `apps/api/src/modules/directory/directory.service.ts` managing `DirectoryUser`, `DirectoryGroup`, and `DirectoryMembership` entities, password resets, and 2FA status tracking.

**Email & Mailbox Services:**
- SMTP / Mail Server Gateway - Corporate mailbox lifecycle, aliases, forwarding rules, and auto-responders managed in `apps/api/src/modules/email/email.service.ts`.
  - Data model: `EmailAccount` storing quota limits, aliases (JSON array), and forwarding configuration.
  - Telemetry: Reported via `apps/api/src/modules/settings/settings.service.ts` tracking SMTP service state and TLS 1.3 connectivity.

## Data Storage
**Databases:**
- PostgreSQL 17 / 18 (`postgres:17-alpine`)
  - Connection: `DATABASE_URL` (Format: `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?schema=public&connection_limit=20&pool_timeout=30`).
  - Client: Prisma ORM 7.9.1 (`@prisma/client` with `@prisma/adapter-pg` driver adapter configured in `apps/api/src/database/prisma.service.ts`).
  - Schema Configuration: `apps/api/prisma/schema.prisma` and `apps/api/prisma.config.ts`.
  - Extensions Enabled: `uuid-ossp`, `pg_trgm`, `citext` (initialized via `docker/postgres/init.sql`).
  - Migrations & Seeds: Managed via Prisma CLI scripts in `apps/api/prisma/migrations/` and `apps/api/prisma/seed.ts`.

**File Storage:**
- SeaweedFS S3-Compatible Object Store (`chrislusf/seaweedfs:latest`)
  - Services: Master node (port `9333`), Volume node (port `8080`), and Filer with S3 Gateway (port `8333` / `8888`) defined in `docker-compose.yml`.
  - Connection: `S3_ENDPOINT` (e.g. `http://localhost:8333` or `http://seaweedfs-filer:8333`).
  - Auth: `S3_ACCESS_KEY` and `S3_SECRET_KEY`.
  - Bucket: `S3_BUCKET` (Default: `uims-files`), Region: `S3_REGION` (Default: `us-east-1`).
  - Usage: Secure encrypted database backup snapshots (`s3://uims-files/backups/`) and file attachments triggered by `apps/api/src/modules/settings/settings.service.ts`.

**Caching & Message Queues:**
- Redis 8 (`redis:8-alpine`)
  - Connection: `REDIS_URL` (Format: `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`).
  - Client: `ioredis` (v6.0.0) for in-memory caching and session state.
  - Queue Processor: BullMQ (v6.1.1) via `@nestjs/bullmq` for background job execution and asynchronous processing tasks.

## Authentication & Identity
**Auth Provider:**
- Custom JWT (JSON Web Token) with Passport.js strategy
  - Implementation:
    - Backend: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.guard.ts`, and `apps/api/src/modules/auth/strategies/jwt.strategy.ts` using `@nestjs/jwt` and `passport-jwt`.
    - Token Lifecycle: 15-minute access token (`JWT_ACCESS_EXPIRATION`), 7-day refresh token (`JWT_REFRESH_EXPIRATION`), signed with `JWT_SECRET` and `JWT_REFRESH_SECRET`.
    - Password Hashing: `bcrypt` salt rounds (10 rounds) in `apps/api/src/modules/auth/auth.service.ts`.
    - Frontend Interceptor: Axios request/response interceptors in `apps/web/src/services/api.ts` automatically attach `Authorization: Bearer <token>` and intercept 401 errors to seamlessly queue failed requests, call `POST /api/v1/auth/refresh`, and update Zustand `useAuthStore` in `apps/web/src/stores/auth.store.ts`.
    - Authorization & RBAC: Role-based permissions mapped in Prisma schema (`Role`, `Permission`, `RolePermission`).

## Monitoring & Observability
**Error Tracking:**
- Custom NestJS exception filters in `apps/api/src/common/filters/`:
  - `HttpExceptionFilter` for uniform API error responses.
  - `PrismaExceptionFilter` for converting database constraint violations into client-friendly error codes.
**Health Checks:**
- Public health endpoint at `GET /api/v1/health` (`apps/api/src/modules/health/health.controller.ts`).
- Reverse proxy health route at `/health` mapped to `/api/v1/health` in `docker/nginx/nginx.conf`.
- Container healthchecks configured in `docker-compose.yml` (`pg_isready` for Postgres, `redis-cli ping` for Redis, `curl http://localhost:7700/health` for MeiliSearch).
**Telemetry & Metrics:**
- System health telemetry aggregated in `apps/api/src/modules/settings/settings.service.ts` reporting live database latency, Redis hit rates, SMTP status, and backup storage capacity.
**Logs:**
- Structured logging via NestJS `Logger`, `pino`, and `pino-http`.
- Comprehensive enterprise audit logging in `AuditLog` table managed by `apps/api/src/modules/audit/audit.service.ts`, recording user identity, action, entity, severity, IP address, user agent, and JSON diff payloads with built-in CSV export.
**API Documentation:**
- Swagger / OpenAPI 3.0 UI rendered at `/api/v1/docs` configured in `apps/api/src/main.ts`.

## CI/CD & Deployment
**Hosting:**
- Multi-container Docker Compose deployment (`docker-compose.yml`, `docker-compose.dev.yml`).
- Production Docker images:
  - Backend API: `apps/api/Dockerfile` (Multi-stage `node:22-alpine` builder and runner, non-root `node` user, exposed port `3000`).
  - Frontend Web: `apps/web/Dockerfile` (Multi-stage `node:22-alpine` builder and `nginx:alpine` runner with HTTP/2, TLS 1.3, gzip compression, and security headers, exposed ports `80` and `443`).
**CI Pipeline:**
- Monorepo orchestration managed by Turborepo (`turbo.json`) and pnpm scripts:
  - Test suites: `pnpm test` (Vitest across backend, frontend, and shared packages).
  - End-to-end tests: `pnpm test:e2e` (Playwright browser automation).
  - Code quality: `pnpm lint` (ESLint) and `pnpm format:check` (Biome).
  - Build pipeline: `pnpm build` (Turborepo topological builds with cache outputs).

## Environment Configuration
**Required env vars:**
- `NODE_ENV`: Runtime mode (`development`, `production`, `test`).
- `PORT` / `APP_PORT`: Backend API port (Container: `3000`, Host default: `3002`).
- `DATABASE_URL`: PostgreSQL connection URI with connection pool parameters.
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`: Database credentials.
- `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Redis credentials and host configuration.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: Cryptographic secrets for access and refresh JWT signing.
- `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`: Token lifetimes (e.g. `15m`, `7d`).
- `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`: Full-text search host and master authentication key.
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`: S3 object storage connection parameters.
- `WEB_PORT`: Web frontend port (Host default: `5679`).
- `VITE_API_URL`: Frontend API proxy target (`/api/v1`).
**Secrets location:**
- Local development: `.env` file located at the repository root (git-ignored, populated from `.env.example`).
- Production: Injected via Docker Compose environment variables, container environment secrets, or cloud secret managers (e.g. AWS Secrets Manager, HashiCorp Vault).

## Webhooks & Callbacks
**Incoming:**
- None currently exposed as public webhooks. External communication utilizes REST endpoints (`/api/v1/*`) and WebSocket connections.
**Outgoing:**
- None currently dispatched to third-party webhooks. Asynchronous tasks and notifications are dispatched internally via BullMQ queues and Redis.

---
*Integration audit: 2026-08-14*

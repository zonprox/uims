# External Integrations

**Analysis Date:** 2026-08-15

## APIs & External Services

**Full-Text Search Engine:**
- MeiliSearch (`getmeili/meilisearch:latest`) - Fast typo-tolerant full-text search engine indexing assets, IT helpdesk tickets, software licenses, and directory users in `apps/api/src/modules/search/search.service.ts`.
  - SDK/Client: Direct HTTP `fetch` REST client with custom serialization (`apps/api/src/modules/search/search.service.ts`).
  - Auth: `MEILISEARCH_API_KEY` (Bearer token header `Authorization: Bearer <key>`).
  - Endpoints: `MEILISEARCH_HOST` (e.g. `http://localhost:7700` or `http://meilisearch:7700`), queries `/health` and `/indexes/{assets,tickets,licenses,users}/search`.
  - Fallback: Graceful automatic fallback to PostgreSQL database queries via Prisma when MeiliSearch is unavailable or uninitialized.

**Object & File Storage (S3-Compatible):**
- SeaweedFS S3 Gateway (`chrislusf/seaweedfs:latest`) - Distributed S3-compatible blob storage cluster (Master on port 9333, Volume on port 8080, Filer/S3 on port 8333/8888) used for database snapshot storage and binary asset attachments (`apps/api/src/modules/settings/settings.service.ts`, `docker-compose.yml`).
  - SDK/Client: S3 protocol compatible client.
  - Auth: `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
  - Config: `S3_ENDPOINT` (`http://localhost:8333` or `http://seaweedfs-filer:8333`), `S3_BUCKET` (`uims-files`), `S3_REGION` (`us-east-1`).

**Directory Services & Identity Synchronization:**
- Enterprise Directory Integration - Schema and service abstractions for Active Directory / LDAP synchronization and identity lifecycle management (`apps/api/src/modules/directory/directory.service.ts`, `apps/api/prisma/schema.prisma`).
  - Data Models: `DirectoryUser`, `DirectoryGroup`, `DirectoryMembership`, `EmailAccount`.
  - Source types supported in schema: `LOCAL`, `LDAP`, `AZURE_AD` (`DirectorySource` enum in `apps/api/prisma/schema.prisma`).

## Data Storage

**Databases:**
- PostgreSQL 17 (`postgres:17-alpine`)
  - Connection: `DATABASE_URL` (`postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?schema=public&connection_limit=20&pool_timeout=30`).
  - Client: Prisma ORM 7.9.1 (`@prisma/client`) with `@prisma/adapter-pg` driver adapter in `apps/api/src/database/prisma.service.ts`.
  - Extensions Enabled: `uuid-ossp`, `pg_trgm`, `citext` configured in `docker/postgres/init.sql`.

**File Storage:**
- SeaweedFS S3-compatible Object Storage (`S3_ENDPOINT`, `S3_BUCKET`) mapped to Docker named volumes `seaweedfs_master`, `seaweedfs_volume`, and `seaweedfs_filer`.

**Caching:**
- Redis 8 (`redis:8-alpine`) - In-memory key-value cache and pub/sub message broker configured with LRU memory eviction and Append-Only File (AOF) persistence (`docker-compose.yml`).
  - Connection: `REDIS_URL` (`redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`).
  - Client: `ioredis` ^6.0.0 and BullMQ ^6.1.1 (`@nestjs/bullmq`) in `apps/api/package.json`.

## Authentication & Identity

**Auth Provider:**
- Custom JWT & Role-Based Access Control (RBAC)
  - Implementation: Passport JWT Strategy (`passport-jwt`, `JwtStrategy` in `apps/api/src/modules/auth/strategies/jwt.strategy.ts`, `AuthService` in `apps/api/src/modules/auth/auth.service.ts`).
  - Password Hashing: `bcrypt` with 10 salt rounds (`apps/api/src/modules/auth/auth.service.ts`).
  - Token Lifecycle: Dual-token flow with short-lived JWT access tokens (`JWT_ACCESS_EXPIRATION`, default `15m`) and long-lived refresh tokens (`JWT_REFRESH_EXPIRATION`, default `7d`) signed with `JWT_SECRET` / `JWT_REFRESH_SECRET`.
  - Client Interception: Axios request interceptor attaches Bearer token, and response interceptor automatically queues 401 unauthorized requests and triggers `/api/v1/auth/refresh` before retrying failed calls (`apps/web/src/services/api.ts`).
  - Route Protection: Global `JwtAuthGuard` applied across API endpoints, exempting routes annotated with custom `@Public()` decorator (`apps/api/src/common/decorators/public.decorator.ts`, `apps/api/src/common/guards/jwt-auth.guard.ts`).

## Monitoring & Observability

**Error Tracking:**
- Custom Global Exception Filters in NestJS:
  - `HttpExceptionFilter` handles standard HTTP exception formatting (`apps/api/src/common/filters/http-exception.filter.ts`).
  - `PrismaExceptionFilter` maps database unique constraint violations and query errors to standard API response codes (`apps/api/src/common/filters/prisma-exception.filter.ts`).

**Logs:**
- Fast structured JSON logging via `pino` ^10.3.1 and `pino-http` ^11.0.0 with NestJS `Logger` (`apps/api/src/main.ts`).
- Comprehensive Audit Log Pipeline: Automatic HTTP mutation interception (`POST`, `PATCH`, `PUT`, `DELETE`) with sensitive field redaction (`password`, `tokens`, `secrets`) recorded to the PostgreSQL `AuditLog` table via `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`).
- Live Health Telemetry: Public health check endpoint at `/api/v1/health` providing database ping latency, Node.js process memory usage (Heap/RSS), uptime metrics, and availability status (`apps/api/src/modules/health/health.controller.ts`).

## CI/CD & Deployment

**Hosting:**
- Containerized Docker Compose multi-service deployment (`docker-compose.yml`, `docker-compose.dev.yml`).
- Nginx reverse proxy container (`docker/nginx/nginx.conf`) handling SSL termination, HTTP/2, security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`), gzip compression, static asset caching, and routing `/api/` traffic to the NestJS API container.

**CI Pipeline:**
- Monorepo pipeline managed via Turborepo (`turbo.json`) and pnpm scripts:
  - `pnpm lint` (`biome check .`, `eslint`)
  - `pnpm typecheck` (`tsc --noEmit`)
  - `pnpm test` (`vitest run`)
  - `pnpm test:e2e` (`playwright test`)
  - `pnpm build` (`turbo run build`)

## Environment Configuration

**Required env vars:**
- `NODE_ENV` - Application runtime environment (`development`, `production`, `test`).
- `PORT` / `APP_PORT` - NestJS API port (default container `3000`, host `3002`).
- `WEB_PORT` - Web frontend application port (default `5679`).
- `DATABASE_URL` - PostgreSQL connection string with schema and connection pooling parameters.
- `REDIS_URL` - Redis connection string with authentication.
- `JWT_SECRET` - Secret key used for signing JWT access tokens (minimum 32 characters).
- `JWT_REFRESH_SECRET` - Secret key used for signing JWT refresh tokens.
- `JWT_ACCESS_EXPIRATION` - JWT access token lifespan (e.g. `15m`).
- `JWT_REFRESH_EXPIRATION` - JWT refresh token lifespan (e.g. `7d`).
- `MEILISEARCH_HOST` - URL of the MeiliSearch cluster (e.g. `http://localhost:7700` or `http://meilisearch:7700`).
- `MEILISEARCH_API_KEY` - Master API key for MeiliSearch authorization.
- `S3_ENDPOINT` - Object storage endpoint URL (e.g. `http://localhost:8333` or `http://seaweedfs-filer:8333`).
- `S3_ACCESS_KEY` - S3 credentials access key.
- `S3_SECRET_KEY` - S3 credentials secret key.
- `S3_BUCKET` - S3 bucket name (default `uims-files`).
- `VITE_API_URL` - API base URL configured for frontend requests (`/api/v1` or `http://localhost:3000/api/v1`).

**Secrets location:**
- Monorepo root `.env` file (strictly excluded from git via `.gitignore`).
- Default development values and structure documented in `.env.example`.

## Webhooks & Callbacks

**Incoming:**
- None currently active. Pre-configured for future directory identity webhooks (Azure AD SCIM / Okta / Google Workspace push updates).

**Outgoing:**
- Automated Report Scheduler: Scheduled delivery service configured via `ReportSchedule` entity in `apps/api/src/modules/reports/reports.service.ts` for PDF and report distribution.
- Real-time Notifications: WebSocket gateway infrastructure powered by `@nestjs/websockets` and `@nestjs/platform-socket.io` for event notifications.

---

*Integration audit: 2026-08-15*

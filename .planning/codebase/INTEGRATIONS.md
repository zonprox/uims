# External Integrations

**Analysis Date:** 2026-09-11

## APIs & External Services

**Search Engine:**
- MeiliSearch — Full-text search across assets, licenses, directory, network
  - Client: Native `fetch()` HTTP calls (`apps/api/src/modules/search/search.service.ts`)
  - Host: `MEILI_HOST` env var (default `http://localhost:7700`)
  - Auth: `MEILI_API_KEY` env var
  - Fallback: Database `ILIKE` search when MeiliSearch is offline

**Cloudflare Tunnel:**
- `cloudflared` — Public HTTPS URL exposure for development
  - Managed by `scripts/dev.sh` daemon
  - Allows `.trycloudflare.com` origins dynamically in non-production CORS

## Data Storage

**Databases:**
- PostgreSQL 17 (Alpine)
  - Container: `uims-postgres` — Host port `5433`, internal `5432`
  - Connection: `DATABASE_URL` env var
  - Client: Prisma 7 ORM with `@prisma/adapter-pg` native driver (`apps/api/prisma/schema.prisma`)
  - Schema: 28 models — `AppUser`, `DirectoryUser`, `Role`, `Permission`, `RolePermission`, `Asset`, `AssetCategory`, `AssetHistory`, `InventoryCategory`, `InventoryItem`, `License`, `LicenseAssignment`, `DirectoryGroup`, `DirectoryMembership`, `VLAN`, `Subnet`, `IPAddress`, `NetworkCredential`, `AuditLog`, `RefreshToken`, `Notification`, `Setting`, `ReportSchedule`, `Location`, `Organization`, `Department`, `Position`, `Vendor`
  - Indexes: 91 explicit `@@index` declarations
  - Relations: 41 `@relation` directives
  - Seeding: `tsx prisma/seed.ts` via `apps/api/prisma/seed.ts` and `apps/api/prisma/seeders/`

**Caching:**
- Redis 8 (Alpine)
  - Container: `uims-redis` — Host port `6381`, internal `6379`
  - Connection: `REDIS_URL` env var (default `redis://localhost:6381`)
  - Client: `ioredis` ^6.0.0 via `RedisService` (`apps/api/src/common/redis/redis.service.ts`)
  - Resilience: Automatic in-memory `Map` fallback when Redis is unavailable
  - Usage: Alert throttling/deduplication, session caching

**File Storage:**
- SeaweedFS (S3-compatible)
  - Master: `uims-seaweedfs-master` — Port `9333`
  - Volume: `uims-seaweedfs-volume` — Port `8080`
  - Filer: `uims-seaweedfs-filer` — Ports `8333` / `8888`
  - Usage: Backup storage (`s3://uims-vault/backups/` referenced in `apps/api/src/modules/settings/settings.service.ts`)

**Message Queue:**
- BullMQ ^6.3.4 via `@nestjs/bullmq` ^11.0.5
  - Backed by Redis
  - Usage: Background job processing (notifications, scheduled alerts)

## Authentication & Identity

**Auth Provider:** Custom JWT-based authentication
  - Implementation: `apps/api/src/modules/auth/`
  - Strategy: Passport JWT (`passport-jwt` ^4.0.1) via `@nestjs/passport`
  - Tokens: Access + Refresh token pair via `@nestjs/jwt` ^11.0.2
  - Secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET` env vars (fail-fast validation)
  - Password hashing: `bcrypt` ^6.0.0 (salted)
  - Token storage: `RefreshToken` Prisma model
  - Cookie transport: `cookie-parser` middleware for auth tokens

**Authorization:**
  - Role-based: `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`)
  - Permission-based: `PermissionsGuard` (`apps/api/src/common/guards/permissions.guard.ts`)
  - Decorators: `@Roles()` (`apps/api/src/common/decorators/roles.decorator.ts`), `@RequirePermissions()` (`apps/api/src/common/decorators/require-permissions.decorator.ts`), `@Public()` (`apps/api/src/common/decorators/public.decorator.ts`)
  - Global guards: `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard` (registered as `APP_GUARD` in `apps/api/src/app.module.ts`)

**Directory Sources:**
  - `DirectorySource` enum: `LOCAL`, `LDAP`, `AZURE_AD`
  - Directory user management: `apps/api/src/modules/directory/`

## Monitoring & Observability

**Health Check:**
- Endpoint: `GET /api/v1/health` (`apps/api/src/modules/health/health.controller.ts`)
- Checks: PostgreSQL connectivity (`SELECT 1`), Redis status, memory usage, uptime
- Failure: Returns `503 ServiceUnavailableException` when database probe fails

**Logging:**
- Backend: NestJS `Logger` class (`private readonly logger = new Logger(ClassName.name)`)
- Structured logging via `pino` ^10.3.1 + `pino-http` ^11.0.0 (available but NestJS Logger is primary)
- Startup validation: `console.error` for env validation failures (`apps/api/src/config/app.config.ts`)

**Audit Trail:**
- `AuditLog` Prisma model — Records login attempts, setting changes, CRUD operations
- `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) — Global audit interceptor

**Error Tracking:**
- Frontend: `ErrorBoundary` component (`apps/web/src/components/ErrorBoundary.tsx`)
- Route-level: `RouteErrorBoundary` (`apps/web/src/components/RouteErrorBoundary.tsx`)
- API: `HttpExceptionFilter` + `PrismaExceptionFilter` (`apps/api/src/common/filters/`)

## Real-Time Communication

**WebSocket Gateway:**
- Namespace: `/notifications`
- Gateway: `NotificationsGateway` (`apps/api/src/modules/notifications/notifications.gateway.ts`)
- Transport: Socket.IO ^4.8.3 (server) / ^4.8.3 (client)
- Auth: JWT verification via `socket.handshake.auth.token`
- CORS: Mirrors REST CORS allowlist; `.trycloudflare.com` in non-production
- Client hook: `useRealtimeNotifications` (`apps/web/src/hooks/useRealtimeNotifications.ts`)

## API Documentation

**OpenAPI / Swagger:**
- Endpoint: `GET /api/v1/docs`
- Builder: `@nestjs/swagger` ^11.4.7 (`apps/api/src/main.ts`)
- Title: "UIMS API", Version: "1.0"

## Scheduled Tasks

**Cron Jobs:**
- `ScheduledAlertsWorker` — Daily at midnight (`@Cron('0 0 * * *')`)
  - File: `apps/api/src/modules/notifications/scheduled-alerts.worker.ts`
  - Purpose: Check expiring licenses, warranties; emit notifications
  - Throttling: Redis-backed cache keys to prevent duplicate alerts

## CI/CD & Deployment

**Hosting:**
- Docker Compose containerized deployment
- Nginx reverse proxy with TLS termination (`docker/nginx/`)

**CI Pipeline:**
- Verification commands: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`
- Dev stack: `./scripts/dev.sh` (start/stop/restart/status/logs/url)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Access token signing secret
- `JWT_REFRESH_SECRET` — Refresh token signing secret
- `REDIS_URL` — Redis connection string
- `AUDIT_SIGNING_KEY` — Audit log HMAC signing key
- `CORS_ORIGIN` / `ALLOWED_ORIGINS` — Comma-separated allowed origins
- `MEILI_HOST` — MeiliSearch host URL
- `MEILI_API_KEY` — MeiliSearch API key

**Secrets location:**
- `.env` at project root (not committed)
- `.env.example` — Template with parameterized placeholders
- `apps/api/.env` — API-specific env overrides

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-09-11*

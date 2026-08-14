# External Integrations

**Analysis Date:** 2026-08-14

## APIs & External Services

**Email / Directory / Ping Services:**
- Network Ping & ICMP Diagnostic:
  - Integration method: System network ping and HTTP reachability checks in `apps/api/src/modules/network/network.service.ts`
  - Auth: None (internal subnet probes)
- Directory Synchronization (LDAP / Active Directory / Azure AD):
  - Integration method: Schema support in `apps/api/prisma/schema.prisma` (`DirectorySource` enum: `LOCAL`, `LDAP`, `AZURE_AD`) and service endpoints in `apps/api/src/modules/directory/`
  - Auth: Handled via directory service configuration

## Data Storage

**Databases:**
- PostgreSQL 17 (Alpine) - Primary relational data store
  - Connection: `DATABASE_URL` environment variable (`postgresql://uims:uims_secret_2026@localhost:5432/uims_db?schema=public`)
  - Client: Prisma ORM v7.9.1 with `@prisma/adapter-pg` and `pg` pool
  - Schema & Migrations: `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`
  - Seed Script: `apps/api/prisma/seed.ts`

**Object & File Storage:**
- SeaweedFS (S3-Compatible Object Store) - IT asset images, invoices, attachments, and export reports
  - Components: SeaweedFS Master (port 9333), Volume (port 8080), Filer / S3 Gateway (port 8333)
  - Connection: `S3_ENDPOINT` (`http://localhost:8333`), `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` (`uims-files`)
  - Client: AWS S3 compatible HTTP client / SDK

**Search Engine:**
- Meilisearch - Full-text search engine for assets, directory users, tickets, and knowledge bases
  - Connection: `MEILISEARCH_HOST` (`http://localhost:7700`)
  - Auth: `MEILISEARCH_API_KEY` (`uims_meili_master_key_2026`)
  - Port: 7700 (health check at `/health`)

**Caching & Queues:**
- Redis 8 (Alpine) - Distributed cache, session management, rate limiting, and BullMQ queue broker
  - Connection: `REDIS_URL` (`redis://:uims_redis_2026@localhost:6379`)
  - Client: `ioredis` v6.0.0 & `@nestjs/bullmq` v11.0.5 / `bullmq` v6.1.1

## Authentication & Identity

**Auth Provider:**
- Custom JWT Authentication with Passport Strategy:
  - Implementation: `apps/api/src/modules/auth/auth.service.ts` & `apps/api/src/common/guards/jwt-auth.guard.ts`
  - Password Hashing: `bcrypt` with salt rounds via `apps/api/src/common/utils/password.util.ts`
  - Token Management: Signed Access Token (`JWT_ACCESS_EXPIRATION`, default 15m) and Refresh Token (`JWT_REFRESH_EXPIRATION`, default 7d)
  - Client Storage: Zustand auth store with localStorage persistence (`apps/web/src/stores/auth.store.ts`)
  - Header Injection: Axios request interceptor (`apps/web/src/services/api.ts`)

**Role-Based Access Control (RBAC):**
- Dynamic Roles & Permissions: `Role`, `Permission`, `RolePermission` tables in Prisma schema
- Guards & Decorators: `apps/api/src/common/guards/roles.guard.ts` and `apps/api/src/common/decorators/roles.decorator.ts`

## Monitoring & Observability

**Logging:**
- Structured JSON Logger: Pino 10.3.1 (`pino`, `pino-http`) in `apps/api`
  - Formatted request logging with correlation and latency tracking
- Stdout / Stderr streams routed to Docker log drivers

**Health Checks:**
- API Health Endpoint: `GET /api/v1/health` and `GET /api/v1/settings/health`
- Docker Healthchecks: `pg_isready` for PostgreSQL, `redis-cli ping` for Redis, `curl -f /health` for Meilisearch

## CI/CD & Deployment

**Hosting & Infrastructure:**
- Containerized Architecture: `docker-compose.yml` (production) and `docker-compose.dev.yml` (development overlays)
- Reverse Proxy & Gateway: Nginx (`docker/nginx/nginx.conf`) handling SSL, routing `/api/v1` to API service and `/` to Web SPA
- Monorepo Orchestration: Turborepo (`turbo.json`) and pnpm workspaces

## Environment Configuration

**Development:**
- Variables defined in root `.env` (templated from `.env.example`)
- API port: `3000`, Web dev port: `5679` (or Vite default `5173`)
- Database port: `5433` (mapped from 5432)
- Redis port: `6381` (mapped from 6379)
- Meilisearch port: `7700`, SeaweedFS port: `8333` / `9333`

**Production:**
- Managed via environment injection in `docker-compose.yml`
- Strict HTTPS enforcement via Nginx SSL certificates (`docker/nginx/ssl`)

## Webhooks & Callbacks

**Incoming:**
- System audit event stream and external IT alert ingest endpoints (`/api/v1/audit`, `/api/v1/tickets`)

**Outgoing:**
- Scheduled reporting dispatcher (`apps/api/src/modules/reports/`) for notification distribution

---

*Integration audit: 2026-08-14*
*Update when adding/removing external services*

---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# External Integrations

**Analysis Date:** 2026-10-14

## APIs & External Services

**Full-Text Search Engine (6-Domain Universal Omnisearch):**
- MeiliSearch (`getmeili/meilisearch:latest`) - Typo-tolerant full-text search across 6 operational domains: Hardware Assets, Directory Users, Software Licenses, Warehouse Inventory, Network IPAM/Switches/Subnets, and Access Control Users/Roles
  - Client / Protocol: REST API on port `7700` (`http://meilisearch:7700` / `MEILISEARCH_HOST`)
  - Integration Service: `apps/api/src/modules/search/search.service.ts`
  - Sync & Resilience: Cursor-paginated batch synchronization (`take: 100`) with automatic PostgreSQL multi-domain query fallback when MeiliSearch is unreachable
  - Authentication: `MEILISEARCH_API_KEY` via fail-fast environment configuration
  - Health Check: `http://localhost:7700/health`

**Object & File Storage:**
- SeaweedFS S3-Compatible Gateway - Distributed blob storage for signed asset handover/return documents, asset photos, license contracts, user avatars, and exported reports
  - Components: SeaweedFS Master (`9333`), Volume Server (`8080`), and S3 Filer (`8333` / `8888`)
  - Client / Protocol: S3-compatible REST API (`S3_ENDPOINT: http://seaweedfs-filer:8333`, `S3_BUCKET: uims-files`)
  - Authentication: `S3_ACCESS_KEY`, `S3_SECRET_KEY` (parameterized in `docker-compose.yml` and `docker-compose.dev.yml` without plaintext fallbacks)

**Document & Report Generation Engines:**
- Microsoft Word (`.docx`) Handover Builder (`apps/api/src/modules/assets/utils/handover-document.builder.ts`) - Generates structured corporate custody handover and return minutes using `docx` 9.10.0 alongside printable HTML sheets
- Streaming XLSX & PDF Report Engine (`apps/api/src/modules/reports/reports.service.ts`, `apps/api/src/modules/reports/utils/pdf-table-generator.ts`) - Exports operational datasets in Excel (`.xlsx`), PDF, and CSV formats

**Public Development Tunnel:**
- Cloudflare Quick Tunnel (`cloudflared`) - Dynamic HTTPS public egress for remote mobile QR scanning and external browser testing
  - Client / Binary: `cloudflared tunnel --url https://localhost:5679 --no-tls-verify` managed via `scripts/dev.sh`
  - Domain Pattern: Strictly anchored regex `CLOUDFLARE_DEV_ORIGIN_REGEX` (`^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$`) evaluated only when `NODE_ENV !== 'production'`
  - CORS Whitelisting: Centralized exclusively in `apps/api/src/config/cors.config.ts`

## Data Storage

**Relational Database:**
- PostgreSQL 17 Alpine (`postgres:17-alpine`)
  - Connection String: `DATABASE_URL` (`postgresql://uims:${DATABASE_PASSWORD}@localhost:5433/uims_db?schema=public`)
  - ORM Engine: Prisma 7.10.0 with `@prisma/adapter-pg` and `pg` connection pool (`apps/api/src/database/prisma.service.ts`)
  - Domain Schema: 28 relational models in `apps/api/prisma/schema.prisma` (including `Asset`, `AssetHandoverRecord`, `DirectoryUser`, `AuditLog`, `License`, `Vendor`, `NetworkRack`, `NetworkSwitch`, `SwitchPort`, `VLAN`, `Subnet`, `IPAddress`, etc.)
  - Migration Tracking: Tracked via `apps/api/prisma/migrations/migration_lock.toml` and SQL migration folders
  - Health Probe: `pg_isready -U uims -d uims_db` and live `SELECT 1` in `HealthController`

**Caching & Transient Storage:**
- Redis 8 Alpine (`redis:8-alpine`)
  - Connection String: `REDIS_URL` (`redis://:${REDIS_PASSWORD}@localhost:6381`)
  - Client Driver: `ioredis` 6.0.0 wrapped in `apps/api/src/common/redis/redis.service.ts`
  - Resilience: Conditional production validation in `apps/api/src/config/app.config.ts` (mandatory in production; structured warning with non-persistent in-memory fallback in local/test environments)
  - Purposes: Refresh token blacklisting, session rate limiting, scheduled alert idempotency, and metric caching

## Authentication & Identity

**Auth Provider:**
- Custom Stateless JWT Authentication with Refresh Token Rotation (`apps/api/src/modules/auth/`)
  - Password Security: `bcrypt` (12 rounds); cryptographically random initial password provisioning
  - Login Telemetry: Captures and persists `lastLoginAt` on `AppUser` upon successful authentication
  - Access Token: Short-lived HMAC-SHA256 JWT (`JWT_ACCESS_EXPIRATION`, default `15m`) signed with `JWT_SECRET`
  - Refresh Token: Long-lived token (`JWT_REFRESH_EXPIRATION`, default `7d`) persisted in `RefreshToken` table with immediate revocation on logout/rotation
  - WebSocket Transport Security: Explicitly rejects handshakes carrying query tokens (`socket.handshake.query.token`); requires `socket.handshake.auth.token` or `Authorization: Bearer <token>` header

**Directory Services & External Identity:**
- Active Directory / LDAP & Corporate Directory Management (`apps/api/src/modules/directory/directory.service.ts`)
  - At-Rest Credential Encryption: AES-256-GCM authenticated encryption (`enc:v1:<iv>:<authTag>:<ciphertext>`) for `emailInitialPassword` and `adInitialPassword` via `apps/api/src/common/crypto/directory-crypto.ts`
  - License Key Encryption: AES-256-GCM authenticated encryption for software `licenseKey` fields via `apps/api/src/common/crypto/license-crypto.ts`
  - Corporate Email Autocomplete: Domain suggestion support for Youngone corporate domains (`@youngone.co.kr`, `@youngone.com`, etc.)
  - Bulk CSV Import Pipeline: Pre-fetched Map lookup caches with chunked transactions (50-100 rows) and deferred group `memberCount` recalculation

## Monitoring & Observability

**Health Probes & Container Readiness:**
- Health Controller: `apps/api/src/modules/health/health.controller.ts` exposed at `/api/v1/health`
- Verifications: Live PostgreSQL connectivity/latency (`SELECT 1`) and Redis connectivity/latency (`redis.ping()`)
- Degraded & Fail-Closed Routing: Returns HTTP 503 (`ServiceUnavailableException`) when PostgreSQL is unreachable; reports `{ status: 'degraded' }` when Redis is disconnected in non-critical mode

**Structured Logging:**
- NestJS Structured Logger: `new Logger(ContextName.name)` across all controllers, services, gateways, and background workers
- Production Transport: `pino` 10.4.0 and `pino-http` 11.0.0 for structured JSON logs

**Tamper-Evident Audit Logging & Entity Activity Timeline:**
- Audit Service: `apps/api/src/modules/audit/audit.service.ts`
- Cryptographic Integrity: Each `AuditLog` record is signed with HMAC-SHA256 (`AUDIT_SIGNING_KEY`) chaining `previousHash -> hash`
- Cross-Domain Field Diffing: `calculateFieldDiff` / `computeFieldDiff` (`packages/shared-utils/src/diff.ts`) records structured `{ field, oldValue, newValue }` changes across Assets, Directory, Inventory, Licenses, Network, and Users, surfaced via `/api/v1/audit/entity/:entityType/:entityId`

## CI/CD & Deployment

**Reverse Proxy & Edge Termination:**
- Nginx (`docker/nginx/nginx.conf`):
  - Redirects HTTP (80) to HTTPS (443) with TLS 1.2 / 1.3 and strong cipher suites
  - Proxies `/api/` and `/socket.io/` (with WebSocket upgrade headers) to `http://api:3000`
  - Proxies `/health` to `http://api:3000/api/v1/health`
  - Serves static React SPA bundle with gzip compression, CSP/security headers, and `try_files $uri $uri/ /index.html`

**Local Development Daemon:**
- Universal Dev Stack CLI (`scripts/dev.sh` / `pnpm run stack:*`):
  - Detaches background processes (`setsid -f`) for API (port 3002), Vite HTTPS Web (port 5679), and Cloudflare quick tunnel

## Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL` & `DATABASE_PASSWORD` - PostgreSQL 17 connection credentials
- `REDIS_URL` & `REDIS_PASSWORD` - Redis 8 connection credentials (mandatory in production)
- `JWT_SECRET` & `JWT_REFRESH_SECRET` - Access and refresh token signing keys
- `AUDIT_SIGNING_KEY` - HMAC-SHA256 signing key for tamper-evident audit chain
- `LICENSE_ENCRYPTION_KEY` - Optional primary secret for AES-256-GCM encryption (falls back strictly to `AUDIT_SIGNING_KEY || JWT_SECRET`)
- `MEILISEARCH_API_KEY` - Master API key for MeiliSearch index administration
- `S3_ACCESS_KEY` & `S3_SECRET_KEY` - SeaweedFS S3 filer credentials

## Webhooks & Callbacks

**Incoming:**
- None (system acts as the authoritative enterprise IT operations source of truth)

**Outgoing:**
- WebSocket Broadcasts (`apps/api/src/modules/notifications/notifications.gateway.ts`):
  - Emits real-time deep-linked notifications (`entityType`, `entityId`, `actionUrl`) to authenticated user rooms
- Scheduled Alerts Worker (`apps/api/src/modules/notifications/scheduled-alerts.worker.ts`):
  - Cursor-paginated (`take: 100`) cron jobs checking warranty expirations, license renewals, and low inventory thresholds

---

*Integration audit: 2026-10-14*

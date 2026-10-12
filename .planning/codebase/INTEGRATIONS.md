---
last_mapped_commit: 47a62716158aff0e5b1b981ab498a7df3f1defc4
last_mapped_at: 2026-10-12
---
# External Integrations

**Analysis Date:** 2026-10-12

## APIs & External Services

**Full-Text Search Engine:**
- MeiliSearch (`getmeili/meilisearch:latest`) - Fast typo-tolerant full-text search across hardware assets, directory users, licenses, and inventory
  - Client / Protocol: REST API on port `7700` (`http://meilisearch:7700`)
  - Integration Service: `apps/api/src/modules/search/search.service.ts`
  - Authentication: `MEILISEARCH_API_KEY` via `MEILI_MASTER_KEY` environment variable
  - Health check: `http://localhost:7700/health`

**Object & File Storage:**
- SeaweedFS S3-Compatible Gateway - Distributed blob storage for asset photos, license contracts, user avatars, and exported reports
  - Components: SeaweedFS Master (`9333`), Volume Server (`8080`), and S3 Filer (`8333` / `8888`)
  - Client / Protocol: S3-compatible REST API (`@aws-sdk/client-s3` protocol compatible)
  - Connection Config: `S3_ENDPOINT: http://seaweedfs-filer:8333`, `S3_BUCKET: uims-files`
  - Authentication: `S3_ACCESS_KEY`, `S3_SECRET_KEY`

**Public Development Tunnel:**
- Cloudflare Quick Tunnel (`cloudflared`) - Dynamic secure HTTPS public egress for remote mobile testing and external webhooks
  - Client / Binary: `cloudflared tunnel --url https://localhost:5679 --no-tls-verify` managed via `scripts/dev.sh`
  - Domain Pattern: Matches `CLOUDFLARE_DEV_ORIGIN_REGEX` (`^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$`)
  - CORS Whitelisting: Dynamic evaluation in non-production mode via `apps/api/src/config/cors.config.ts`

## Data Storage

**Databases:**
- PostgreSQL 17 Alpine (`postgres:17-alpine`)
  - Connection String: `DATABASE_URL` (format: `postgresql://uims:${DATABASE_PASSWORD}@localhost:5433/uims_db?schema=public`)
  - ORM Engine: Prisma 7.10.0 with direct pg wire adapter (`@prisma/adapter-pg` + `pg` connection pool)
  - Connection Ceiling: `connection_limit=20`, `pool_timeout=30`, max container connections = 200
  - Health probe: `pg_isready -U uims -d uims_db`

**Caching & Transient Storage:**
- Redis 8 Alpine (`redis:8-alpine`)
  - Connection String: `REDIS_URL` (format: `redis://:${REDIS_PASSWORD}@localhost:6381`)
  - Client Driver: `ioredis` (6.0.0) wrapped in `apps/api/src/common/redis/redis.service.ts`
  - Memory & Eviction: `--maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes`
  - Purposes: Token blacklisting, session rate limiting, scheduled alert idempotency, high-speed metric caching
  - Health probe: `redis-cli -a ${REDIS_PASSWORD} ping`

## Authentication & Identity

**Auth Provider:**
- Custom JWT Stateless Authentication with Secure Refresh Token Rotation
  - Module: `apps/api/src/modules/auth/`
  - Password Security: `bcrypt` with 12 salted rounds; strictly randomized temporary passwords (`generateSecurePassword`)
  - Access Token: Short-lived HMAC-SHA256 JWT (`JWT_ACCESS_EXPIRATION`, default `15m`) signed with `JWT_SECRET`
  - Refresh Token: Long-lived cryptographically signed token (`JWT_REFRESH_EXPIRATION`, default `7d`) stored hashed in PostgreSQL (`RefreshToken` model)
  - Revocation & Blacklisting: Immediate invalidation on logout or token rotation; replay attack defense
  - WebSocket Transport: Strictly rejects tokens passed in URL query parameters (`socket.handshake.query.token`); requires `auth.token` or `Authorization: Bearer <token>` handshake headers

**Directory Services & External Identity:**
- Active Directory / LDAP & HR CSV Sync:
  - Service: `apps/api/src/modules/directory/directory.service.ts`
  - In-flight Credential Protection: AES-256-GCM authenticated encryption for directory accounts via `apps/api/src/common/crypto/directory-crypto.ts`
  - Bulk Import Pipeline: N+1-free pre-fetched Map lookups processing in chunked transactions (50-100 rows)

## Monitoring & Observability

**Health Probes & Container Readiness:**
- Health Controller: `apps/api/src/modules/health/health.controller.ts` exposed at `/api/v1/health`
- Verifications: Live PostgreSQL execution (`SELECT 1`) and Redis latency (`redis.ping()`)
- Fail-Closed Routing: If PostgreSQL or Redis is unreachable, returns HTTP 503 (`ServiceUnavailableException`) so orchestrators immediately halt degraded traffic routing

**Structured Logging:**
- NestJS Structured Logger: `new Logger(ContextName.name)` used across all controllers, services, and workers
- Production Transport: `pino` and `pino-http` formatting for high-speed non-blocking JSON emission
- Rule: Raw `console.log` / `console.error` strictly banned in production code

**Tamper-Evident Audit Logging:**
- Audit Service: `apps/api/src/modules/audit/audit.service.ts`
- Cryptographic Integrity: Each audit trail entry generates an HMAC-SHA256 signature using `AUDIT_SIGNING_KEY` over entity, action, userId, IP, and state diff
- Verification API: Tamper detection verification endpoint checks chronological hash chain continuity

## CI/CD & Deployment

**Reverse Proxy & Edge Termination:**
- Nginx 1.25+ (`docker/nginx/nginx.conf`):
  - Listens on Port 443 with TLS 1.2 / 1.3
  - Forwards `/api/v1/` and `/notifications/` (WebSocket upgrades) to NestJS API
  - Serves compiled React SPA assets with gzip compression, security headers, and client-side fallback (`try_files $uri /index.html`)

**Local Development Daemon:**
- Universal Dev Stack CLI (`scripts/dev.sh` / `pnpm run stack:*`):
  - Autonomous process management with detached process groups (`setsid -f`)
  - Automatic port release verification, container orchestration, and Cloudflare tunnel capture

## Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string with password parameterization
- `DATABASE_PASSWORD` - Database user authentication credential
- `REDIS_URL` - Redis connection URL with authentication password
- `REDIS_PASSWORD` - Redis cache authorization secret
- `JWT_SECRET` - HMAC key for access token issuance and signature verification
- `JWT_REFRESH_SECRET` - Cryptographic key for refresh token lifecycle
- `AUDIT_SIGNING_KEY` - 256-bit secret key for tamper-evident audit record signing
- `MEILISEARCH_API_KEY` - Master key for search index administration
- `S3_ACCESS_KEY` & `S3_SECRET_KEY` - SeaweedFS object storage credentials

**Secrets Location:**
- Local development: `.env` (gitignored, patterned from `.env.example`)
- Container production: Parameterized environment variables injected via Docker Compose or cloud secrets vault

## Webhooks & Callbacks

**Incoming:**
- Not detected (system operates as an authoritative enterprise core with outward sync)

**Outgoing:**
- WebSocket Broadcasts (`apps/api/src/modules/notifications/notifications.gateway.ts`):
  - Emits real-time alerts, stock threshold warnings, and asset assignment events to connected authenticated clients
- Scheduled Alerts Worker (`apps/api/src/modules/notifications/scheduled-alerts.worker.ts`):
  - Cron triggers evaluating warranty expirations, license renewal dates, and low stock thresholds

---

*Integration audit: 2026-10-12*

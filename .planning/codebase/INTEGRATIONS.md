# External Integrations

**Analysis Date:** 2026-09-28

## APIs & External Services
**Search:**
- MeiliSearch — Full-text search engine
  - SDK/Client: HTTP API / MeiliSearch Client
  - Auth: `MEILISEARCH_API_KEY`

## Data Storage
**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL`
  - Client: Prisma (`@prisma/client`), `pg`
- Redis
  - Connection: `REDIS_URL`
  - Client: `ioredis`
**File Storage:**
- SeaweedFS (S3-compatible)
  - Connection: `S3_ENDPOINT` (with `S3_ACCESS_KEY`, `S3_SECRET_KEY`)
**Caching:**
- Redis
  - Connection: `REDIS_URL`

## Authentication & Identity
**Auth Provider:**
- Custom
  - Implementation: JWT (JSON Web Tokens) with `@nestjs/jwt`, `passport-jwt` and bcrypt for password hashing.

## Monitoring & Observability
**Error Tracking:**
- None
**Logs:**
- Pino (`pino`, `pino-http`) for structured logging

## CI/CD & Deployment
**Hosting:**
- Docker based (with `docker-compose.yml` and `scripts/dev.sh`)
**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)

## Environment Configuration
**Required env vars:**
- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
**Secrets location:**
- Stored locally in `.env` (not committed).

## Webhooks & Callbacks
**Incoming:**
- None
**Outgoing:**
- None

---
*Integration audit: 2026-09-28*

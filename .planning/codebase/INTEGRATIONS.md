# External Integrations

**Analysis Date:** 2026-09-10

## APIs & External Services
**Search:**
- Meilisearch - Full-text search engine
  - SDK/Client: HTTP API
  - Auth: `MEILISEARCH_API_KEY`

## Data Storage
**Databases:**
- PostgreSQL (v17-alpine)
  - Connection: `DATABASE_URL` (composed via `POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.)
  - Client: Prisma (`@prisma/adapter-pg`, `pg` v8.23.0)
- Redis (v8-alpine)
  - Connection: `REDIS_URL`
  - Client: `ioredis` (v6.0.0), `bullmq` (v6.3.4)

**File Storage:**
- SeaweedFS (S3-compatible gateway)
  - Usage: Uploads and assets
  - Connection variables: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`

**Caching:**
- Redis (v8-alpine)
  - Usage: Data caching and queuing (bullmq)

## Authentication & Identity
**Auth Provider:**
- Custom JWT (JSON Web Tokens)
  - Implementation: Built internally using `@nestjs/jwt` and `passport-jwt`. Requires `JWT_SECRET` and `JWT_REFRESH_SECRET` for access and refresh tokens. Features Role and Permission guards.

## Monitoring & Observability
**Error Tracking:**
- None external (Self-hosted monitoring via standard stdout/logs)

**Logs:**
- Pino (`pino` v10.3.1, `pino-http` v11.0.0) configured in the API for structured logging. Docker Compose is used to manage and view logs.

## CI/CD & Deployment
**Hosting:**
- Docker Compose (`docker-compose.yml`)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`) - Pipeline executes formatting, type checks, linting, tests (Vitest), and builds (Turborepo) upon push/PR to `main`.

## Environment Configuration
**Required env vars:**
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MEILISEARCH_API_KEY`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

**Secrets location:**
- `.env` at project root (with `.env.example` as a template). CI pipelines inject test mock secrets.

## Webhooks & Callbacks
**Incoming:**
- None detected

**Outgoing:**
- None detected

---
*Integration audit: 2026-09-10*

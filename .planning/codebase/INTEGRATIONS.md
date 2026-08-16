# External Integrations

**Analysis Date:** 2026-08-16

## APIs & External Services

**Search:**
- MeiliSearch - High-performance full-text search for assets, licenses, and users
  - SDK/Client: Direct REST API via `fetch`
  - Auth: `MEILISEARCH_API_KEY`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL`
  - Client: Prisma ORM (`@prisma/client` with `@prisma/adapter-pg`)

**File Storage:**
- SeaweedFS (S3-compatible API)
  - Connection: `S3_ENDPOINT`, `S3_BUCKET`
  - Auth: `S3_ACCESS_KEY`, `S3_SECRET_KEY`

**Caching:**
- Redis
  - Connection: `REDIS_URL`
  - Client: `ioredis` (via BullMQ and NestJS caching)

## Authentication & Identity

**Auth Provider:**
- Custom
  - Implementation: JWT (JSON Web Tokens) using `@nestjs/passport` and `passport-jwt`. Custom `bcrypt` password hashing.

## Monitoring & Observability

**Error Tracking:**
- None explicitly configured

**Logs:**
- Pino logger (`pino`, `pino-http`) outputting JSON logs to stdout

## CI/CD & Deployment

**Hosting:**
- Docker / Docker Compose

**CI Pipeline:**
- None discovered in repository (relies on local/dev build scripts)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

**Secrets location:**
- Stored in `.env` files locally, likely managed by environment in production

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-08-16*

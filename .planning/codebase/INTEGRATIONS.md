# External Integrations

**Analysis Date:** 2026-08-15

## APIs & External Services

**Search:**
- MeiliSearch - Full-text search engine for syncing and querying database records.
  - SDK/Client: REST API via `fetch`
  - Auth: `MEILISEARCH_API_KEY`

**File Storage:**
- SeaweedFS - S3-compatible object storage for file uploads and database snapshot backups.
  - SDK/Client: S3 protocol
  - Auth: `S3_ACCESS_KEY`, `S3_SECRET_KEY`

## Data Storage

**Databases:**
- PostgreSQL (v17)
  - Connection: `DATABASE_URL`
  - Client: Prisma (`@prisma/client`)

**File Storage:**
- SeaweedFS (S3-compatible) deployed via Docker, used as main file vault.

**Caching:**
- Redis (v8)
  - Connection: `REDIS_URL`
  - Client: `ioredis`, used for standard caching and `BullMQ` job queues.

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `@nestjs/passport`, `passport-jwt`, and `bcrypt` for password hashing. Issues Access and Refresh tokens.

## Monitoring & Observability

**Error Tracking:**
- None found (relies on application logs).

**Logs:**
- Pino (`pino`, `pino-http`) used for structured JSON application logging in the API.

## CI/CD & Deployment

**Hosting:**
- Docker/Docker Compose (Self-hosted or VM environment)
- Uses Nginx to serve the compiled frontend (`@uims/web`).

**CI Pipeline:**
- None found (No `.github/workflows` or similar CI definitions present in root).

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` \u0026 `JWT_REFRESH_SECRET` - Tokens for auth signing
- `MEILISEARCH_HOST` \u0026 `MEILISEARCH_API_KEY` - Search engine config
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` - Storage config

**Secrets location:**
- Stored locally in `.env` files (not committed to source control, templated in `.env.example`). Passed to containers via docker-compose environment variables.

## Webhooks & Callbacks

**Incoming:**
- None found.

**Outgoing:**
- None found.

---

*Integration audit: 2026-08-15*

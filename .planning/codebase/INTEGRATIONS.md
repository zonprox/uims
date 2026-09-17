---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
# External Integrations

**Analysis Date:** 2026-09-17

## APIs & External Services

**Search:**

- Meilisearch - Powers the global full-text search across IT assets, software licenses, and directory users.
  - SDK/Client: Built-in `fetch` API (`apps/api/src/modules/search/search.service.ts`)
  - Auth: `MEILISEARCH_API_KEY` (or `MEILI_API_KEY`) environment variable passed as a Bearer token.

## Data Storage

**Databases:**

- PostgreSQL 17
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM (`@prisma/client` backed by `@prisma/adapter-pg` and `pg`)

**File Storage:**

- SeaweedFS (S3-Compatible Storage)
  - Status: Infrastructure is deployed via `docker-compose.yml` (`seaweedfs-master`, `seaweedfs-volume`, `seaweedfs-filer`).
  - Configuration: Environment variables (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`) are passed to the API container.
  - Note: Code-level integration (e.g. AWS SDK) does not yet appear to be fully implemented in the API source logic.

**Caching:**

- Redis 8
  - Connection: `REDIS_URL`
  - Client: `ioredis` (configured in backend, likely used for caching, throttling, or session states)

## Authentication & Identity

**Auth Provider:**

- Custom (Local Database Authentication)
  - Implementation: NestJS Passport (`@nestjs/passport`) using a JWT Strategy (`passport-jwt`).
  - Security: Passwords are hashed using `bcrypt` (`apps/api/package.json`).
  - Tokens: Issues both Access and Refresh JWTs using `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## Monitoring & Observability

**Error Tracking:**

- None explicitly configured (e.g., no Sentry, Datadog, or NewRelic integrations found).

**Logs:**

- Pino (`pino`, `pino-http`)
  - Approach: Structured JSON logging output to standard out, captured by the container runtime.

## CI/CD & Deployment

**Hosting:**

- Docker Compose
  - Infrastructure is orchestrated using `docker-compose.yml` and `docker-compose.dev.yml`.
  - Frontend is served via Nginx (configuration in `docker/nginx/nginx.conf`).

**CI Pipeline:**

- GitHub Actions
  - Defined in `.github/workflows/ci.yml`.
  - Runs on push and pull requests to `main`.
  - Executes dependency installation, Prisma client generation, Biome formatting checks, linting, TypeScript type-checking, Vitest tests, and Turborepo builds.

## Environment Configuration

**Required env vars:**

- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (Minimum 32 characters for access token signing)
- `JWT_REFRESH_SECRET` (Minimum 32 characters for refresh token signing)
- `AUDIT_SIGNING_KEY` (Minimum 32 characters for secure audit logs)
- `MEILI_API_KEY` / `MEILISEARCH_API_KEY` (Meilisearch authentication)

**Secrets location:**

- Local Development: `.env` file at the repository root (ignored in Git).
- Production: Passed as environment variables to the Docker containers.

## Webhooks & Callbacks

**Incoming:**

- None detected.

**Outgoing:**

- None detected. (Real-time events are pushed internally to frontend clients via WebSockets / Socket.io, rather than external webhooks).

---

*Integration audit: 2026-09-17*

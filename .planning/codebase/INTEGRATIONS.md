# External Integrations

**Analysis Date:** 2026-08-14

## APIs & External Services

**Search & Storage (Reserved/Planned):**
- MeiliSearch - Full-text search (Configuration variables present in `.env.example`, but no SDK implemented in code yet)
  - Auth: `MEILISEARCH_API_KEY`
- SeaweedFS (S3-compatible) - Object/File storage (Configuration variables present, but no AWS SDK implemented in code yet)
  - Auth: `S3_ACCESS_KEY`, `S3_SECRET_KEY`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` (e.g., `postgresql://...`)
  - Client: Prisma Client (`@prisma/client` and `@prisma/adapter-pg`)
- Redis
  - Connection: `REDIS_URL`
  - Client: `ioredis` (also used by `bullmq`)

**File Storage:**
- S3-compatible (SeaweedFS planned via env vars, currently local or unimplemented in code)

**Caching:**
- Redis via `@nestjs/bullmq` and manual `ioredis` interactions

## Authentication & Identity

**Auth Provider:**
- Custom
  - Implementation: JWT-based authentication using `@nestjs/jwt` and `passport-jwt`. Users are stored in the local PostgreSQL database, with passwords hashed via `bcrypt`. Supports access and refresh tokens.

## Monitoring & Observability

**Error Tracking:**
- None implemented explicitly in code yet (no Sentry, Datadog, etc.)

**Logs:**
- Structured logging using `pino` and `pino-http` integrated via the NestJS lifecycle.

## CI/CD & Deployment

**Hosting:**
- Containerized setups (Dockerfiles/Docker Compose exist for dev environment, production hosting target not strictly enforced by codebase).

**CI Pipeline:**
- None detected (No `.github/workflows` or similar CI definitions present).

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` & `JWT_REFRESH_SECRET` - Secrets for signing auth tokens
- `APP_PORT` & `WEB_PORT` - Ports for running local services

**Secrets location:**
- Local `.env` file (gitignored). A `.env.example` provides the schema template.

## Webhooks & Callbacks

**Incoming:**
- None detected in codebase.

**Outgoing:**
- None detected in codebase.

---

*Integration audit: 2026-08-14*

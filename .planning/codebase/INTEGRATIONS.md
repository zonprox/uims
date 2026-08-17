# External Integrations
**Analysis Date:** 2026-08-17

## APIs & External Services
- **SeaweedFS (S3-compatible Gateway):** Used for object storage. Configured in `docker-compose.yml` with Master, Volume, and Filer components. Communicates via S3 API (`S3_ENDPOINT: http://seaweedfs-filer:8333`).
- **MeiliSearch:** Used for fast text search. Integrated via `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`. Exposed on port 7700.

## Data Storage
- **Relational Database:** PostgreSQL 17. Integrated via Prisma ORM (`@prisma/client`). Connection defined via `DATABASE_URL` in `.env` and `docker-compose.yml`.
- **In-Memory Store:** Redis 8. Integrated via `ioredis` and used for caching and task queues (BullMQ). Connection defined via `REDIS_URL`.
- **File Storage:** SeaweedFS (local S3 alternative) for handling document/image uploads, bucket `uims-files`.

## Authentication & Identity
- **JWT (JSON Web Tokens):** Managed via `@nestjs/jwt` and `passport-jwt`. Configuration involves `JWT_SECRET`, `JWT_REFRESH_SECRET`, and expiration settings (`15m` access, `7d` refresh).
- **Password Hashing:** `bcrypt` used for securing user passwords prior to persistence.
- **Identity Provider:** No external SSO (e.g., OAuth, Auth0) detected. Identity is self-managed in the database.

## Monitoring & Observability
- **Logging:** Application logging is handled by `pino` and `pino-http` in the backend API.
- **Health Checks:** Native Docker Compose healthchecks configured for `postgres`, `redis`, and `meilisearch` (e.g., `pg_isready`, `redis-cli ping`, `curl -f http://localhost:7700/health`).

## CI/CD & Deployment
- **Containerization:** Docker Compose orchestrates the full stack (`api`, `web`, `postgres`, `redis`, `meilisearch`, `seaweedfs`).
- **Build System:** Turborepo handles task orchestration (`build`, `test`, `lint`) with remote/local caching.

## Environment Configuration
- Environment variables govern all external connections (see `.env.example`).
- Secrets and keys include: `DATABASE_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `MEILISEARCH_API_KEY`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.

## Webhooks & Callbacks
- **Background Tasks:** BullMQ (`@nestjs/bullmq`) utilized for background processing and potentially scheduled jobs (using Redis).
- **WebSockets:** Real-time bi-directional communication configured via `Socket.IO` (`@nestjs/websockets` on backend, `socket.io-client` on frontend).

---
*Integration audit: 2026-08-17*

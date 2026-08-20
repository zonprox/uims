# External Integrations
**Analysis Date:** 2026-08-20

## Databases
- **Type**: PostgreSQL
- **ORM**: Prisma (v7.9.1)
- **Connection Patterns**: Standard connection string via `DATABASE_URL` with query parameters configuring the connection pool (`connection_limit=20&pool_timeout=30`). Prisma schema located at `apps/api/prisma/schema.prisma` models entities like `User`, `Asset`, `IPAddress`, `License`, `AuditLog`, etc.

## Caching & Queues
- **Redis**: Used as the primary caching and message broker layer. Configured via `REDIS_URL`. Uses `ioredis` library.
- **BullMQ**: Utilized for background task processing via `@nestjs/bullmq` (v11) and `bullmq` (v6.1.1), backed by the Redis instance.

## Search
- **MeiliSearch**: Integrated for fast, relevant full-text search capabilities.
- **Configuration**: Connects via HTTP using `MEILISEARCH_HOST` (e.g., `http://meilisearch:7700` in dev) and authenticated with `MEILISEARCH_API_KEY`.

## Storage
- **File Storage**: SeaweedFS (S3-compatible storage).
- **Configuration**: Interacts with the storage layer using standard S3 APIs. Configured via `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET` (e.g., `uims-files`).

## Real-time
- **WebSocket Setup**: Powered by `socket.io` (v4.8.3).
- **Backend**: Uses `@nestjs/platform-socket.io` and `@nestjs/websockets` for emitting and listening to real-time events.
- **Frontend**: Connects using `socket.io-client`.

## Authentication
- **Strategy**: JWT-based authentication with access and refresh tokens.
- **Configuration**: Secrets defined via `JWT_SECRET` and `JWT_REFRESH_SECRET`. Expiration times are configurable (`JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`).
- **Implementation**: Utilizes `passport`, `passport-jwt`, and `@nestjs/jwt`. Passwords are hashed using `bcrypt` (v6.0.0).

## External Services
- Currently, the application primarily relies on self-hosted infrastructure components (PostgreSQL, Redis, MeiliSearch, SeaweedFS) orchestrated via Docker Compose.
- Note on Directory sources: `DirectorySource` enum in Prisma schema hints at potential integrations with LDAP and AZURE_AD, though the default is LOCAL.

## Integration Patterns
- **Environment Variables**: All services are configurable via environment variables, loaded from `.env` and managed across the monorepo by Turborepo.
- **Local Development**: `docker-compose.dev.yml` orchestrates all dependent services (`postgres`, `redis`, `meilisearch`, `seaweedfs-filer`) providing a self-contained local environment. Services communicate over the internal Docker network using host aliases.

---
*2026-08-20*

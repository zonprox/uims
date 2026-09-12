# Integrations & External Services
> Last Updated: 2026-09-12

## Database (PostgreSQL)
- **Engine**: PostgreSQL 17 (alpine image in Docker)
- **Connection Config**: `connection_limit=20`, `pool_timeout=30` via Prisma connection string.
- **Optimizations**: Configured in Docker Compose with `max_connections=200`, `shared_buffers=256MB`, `effective_cache_size=768MB`, `maintenance_work_mem=64MB`.
- **Health Checks**: `pg_isready` configured in Docker Compose.

## Cache & Queue (Redis + BullMQ)
- **Engine**: Redis 8 (alpine image)
- **Queue System**: BullMQ (`@nestjs/bullmq` integration in the API).
- **Configuration**: Uses LRU cache policy (`maxmemory-policy allkeys-lru`, `maxmemory 512mb`).
- **Health Checks**: `redis-cli ping` via Docker Compose.

## Search Engine (MeiliSearch)
- **Engine**: Meilisearch (latest)
- **Integration**: Integrated in API via `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`.
- **Usage**: Full-text search capabilities across the platform. Configured to run on port 7700.

## Object Storage (SeaweedFS)
- **Engine**: SeaweedFS (S3-compatible API usage)
- **Components**: Master, Volume, and Filer (acting as S3 gateway).
- **Integration**: Accessed via standard S3 clients/endpoints on port 8333.
- **Configuration**: Environment variables include `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.

## Authentication & Security
- **Strategy**: JWT-based authentication using Passport (`passport-jwt`).
- **Security Features**: Configurable access and refresh token expirations (`JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`), bcrypt for password hashing.
- **API Protection**: Helmet, compression, cookie-parser, and rate limiting (`@nestjs/throttler`) configured in the NestJS application.

## Email / Notifications
- **WebSocket Gateway**: Configured using Socket.io (`@nestjs/platform-socket.io` and `@nestjs/websockets` in API, `socket.io-client` in Web).
- **Architecture**: Real-time updates pushed to connected clients for application events and notifications.

## External API Clients
- **Frontend HTTP Client**: Axios (`axios` package in Web) for making REST API calls to the backend, along with TanStack Query for caching and state management.

## Dev Proxy & Tunnels
- **API Proxy**: Frontend Vite server configured to proxy `/api` and `/socket.io` to the backend service. Handles Docker networking transparency automatically.

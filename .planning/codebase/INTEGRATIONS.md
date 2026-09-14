# UIMS Integrations

Date: September 2026

## 1. PostgreSQL Integration
- **Connection**: Managed via Prisma's `adapter-pg` using a pg `Pool` with max connections set to `20` by default (from `DB_POOL_MAX`).
- **Orchestration**: Docker container `uims-postgres` running `postgres:17-alpine`.
- **Ports**: Host port `5433` maps to internal `5432`.
- **Tuning**: Tuned on startup with `max_connections=200`, `shared_buffers=256MB`, `effective_cache_size=768MB`, `maintenance_work_mem=64MB`, `checkpoint_completion_target=0.9`, `wal_buffers=16MB`, `default_statistics_target=100`, `random_page_cost=1.1`.

## 2. Redis Integration
- **Connection**: Integrated via `ioredis` in `RedisService`. Features a graceful degradation fallback to in-memory caching if Redis is unreachable.
- **Orchestration**: Docker container `uims-redis` running `redis:8-alpine`.
- **Ports**: Host port `6381` maps to internal `6379`.
- **Tuning**: Configured with `--maxmemory 512mb` and `--maxmemory-policy allkeys-lru`, plus `--appendonly yes` and `--requirepass`.

## 3. MeiliSearch Integration
- **Engine**: Full-text search indexer handling Users, Licenses, and Assets.
- **Orchestration**: Docker container `uims-meilisearch` running `getmeili/meilisearch:latest`.
- **Ports**: Mapped on port `7700`.
- **Integration**: Used via HTTP API (`/multi-search`, `/indexes/.../documents`) in the API's `SearchService`. Implements a graceful fallback to a complex Prisma database query (`searchDatabaseFallback`) if MeiliSearch goes offline.

## 4. SeaweedFS S3 Integration
- **Architecture**: Object storage split into three containers:
  - `uims-seaweedfs-master`: Master node on port `9333`
  - `uims-seaweedfs-volume`: Volume node on port `8080`
  - `uims-seaweedfs-filer`: Filer/S3 Gateway on ports `8888` and `8333`
- **Integration**: The API accesses it as an S3 compatible endpoint at `http://seaweedfs-filer:8333` using S3 credentials for file uploads (bucket `uims-files`).

## 5. WebSocket Gateway
- **Engine**: Socket.IO integrated with NestJS via `NotificationsGateway` at namespace `/notifications`.
- **Security**: 
  - Centralized CORS resolution managed by `resolveAllowedOrigins()` and `getWebSocketCorsOptions()` in `cors.config.ts`.
  - Authentication validates JWT from the socket handshake `auth.token` or `authorization` header, strictly rejecting tokens in the URL query.
- **Features**: Real-time notifications and unread counts targeted to users (`user:{id}`) and roles (`role:{role}`). Drains connections gracefully on server shutdown.

## 6. Cloudflare Tunnel
- **Access**: Facilitated via a script (`dev.sh`) to spin up a quick Cloudflare tunnel, exposing the local environment securely.
- **CORS Handling**: `cors.config.ts` specifically whitelists Cloudflare preview domains (`CLOUDFLARE_DEV_ORIGIN_REGEX = /^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/`) exclusively in non-production modes.

## 7. Vite Dev Proxy
- **Configuration**: Managed in `apps/web/vite.config.ts`.
- **Proxy Paths**: 
  - `/api` requests proxy to `http://localhost:3002` (or `uims-api-dev:3000` in Docker).
  - `/socket.io` handles WebSocket upgrades targeting the same backend.
- **Optimization**: Features advanced manual chunking separating vendors (`vendor-react`, `vendor-antd-core`, `vendor-antd-pro`, `vendor-query`, etc.) to improve dev load times and build size.

## 8. Docker Compose Orchestration
- **Topology**: Defines a complete network with `postgres`, `redis`, `meilisearch`, `seaweedfs-*`, `api`, and `web`.
- **Healthchecks**: Strict dependency sequencing with `condition: service_healthy`.
  - Postgres: `pg_isready`
  - Redis: `redis-cli ping`
  - MeiliSearch: `curl /health`
  - API: `wget /api/v1/health`
  - Web: `wget https://localhost/`
- **Networking**: Maps appropriate storage volumes for state persistence (`postgres_data`, `redis_data`, `meilisearch_data`, `seaweedfs_*`).

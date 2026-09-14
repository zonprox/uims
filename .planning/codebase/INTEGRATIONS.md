# External Service Integrations (UIMS)

## 1. Database (PostgreSQL 17)
- **Connection Config**: Standard `postgresql://` URI configured via Prisma.
- **Pooling**: `connection_limit=20` and `pool_timeout=30` baked into the URI.
- **Init Scripts**: Initialized via `/docker/postgres/init.sql`.
- **Health Checks**: 
  - Docker: `pg_isready -U uims -d uims_db`.
  - Application: `SettingsService.getHealthTelemetry()` executes a raw `SELECT 1` query with latency tracking.

## 2. Cache (Redis 8)
- **Connection Config**: Connected via `ioredis` (v6.0.0) at `redis://:${REDIS_PASSWORD}@redis:6379`.
- **Usage Patterns**:
  - Read-through caching for application settings (`SettingsService`).
  - Cache invalidation on setting updates via `redis.del('uims:cache:settings:all')`.
- **Health Checks**: Pinged via `redis-cli ping` inside Docker and monitored via `redis.isHealthy()` inside NestJS telemetry.

## 3. Search (MeiliSearch)
- **Connection**: HTTP REST connection to `http://meilisearch:7700`.
- **Index Configuration**: Three primary indices: `assets`, `licenses`, `users`.
- **Sync Strategy**: 
  - Executed via `SearchService.syncAllToMeilisearch()`.
  - Paginates through PostgreSQL using cursor-based pagination in chunks of 100.
- **Search Endpoints**: Uses MeiliSearch's `/multi-search` endpoint to query across all 3 indices simultaneously. If unavailable, falls back gracefully to Prisma OR queries.

## 4. Storage (SeaweedFS / S3 API)
- **Architecture**: Master (`9333`), Volume (`8080`), and Filer (`8888`, `8333`) components.
- **S3 Gateway**: The Filer acts as an S3 gateway on port `8333`.
- **Usage**:
  - Configured with `S3_ACCESS_KEY` and `S3_SECRET_KEY`.
  - Stores encrypted JSON database snapshot backups via `SettingsService.runBackup()` mapped to `s3://uims-vault/backups/`.

## 5. Email / Notifications
- **SMTP**: No explicit SMTP configurations detected in the immediate service layer.
- **WebSocket Push**: Notifications are handled in real-time via the WebSocket gateway (see below).

## 6. WebSocket Gateway (Socket.IO)
- **Location**: `NotificationsGateway` running on namespace `/notifications`.
- **Authentication Strategy**:
  - **Strict Enforcement**: Forbids token transport via URL query parameters for security.
  - Extracts Bearer token from handshake headers or auth payload.
  - Verifies JWT signatures and enforces non-empty role claims.
- **Room Topology**: Clients are joined to `user:{userId}` and `role:{role}` rooms.
- **Events**: Emits `notification:new`, `notification:count`, `notification:read`, `notification:cleared`.
- **Graceful Shutdown**: Broadcasts `server_shutdown` events before intentionally disconnecting all sockets on module destroy.

## 7. Cloudflare Tunnel
- **Purpose**: Exposes the local development environment securely to the public internet (`.trycloudflare.com` URLs).
- **Execution**: Run via `cloudflared tunnel --url "https://localhost:5679" --no-tls-verify` from `scripts/dev.sh`.
- **Log Scraping**: The script continuously tails the cloudflared logs to automatically extract and display the generated public URL.

## 8. Docker Services Topology
- **uims-postgres**: 5433 -> 5432
- **uims-redis**: 6381 -> 6379
- **uims-meilisearch**: 7700 -> 7700
- **uims-seaweedfs-master**: 9333 -> 9333
- **uims-seaweedfs-volume**: 8080 -> 8080
- **uims-seaweedfs-filer**: 8888 -> 8888 / 8333 -> 8333
- **uims-api**: 3002 -> 3000
- **uims-web**: 5679 -> 443 (Runs Nginx wrapping the compiled Vite output for production, or Vite directly in dev).

# External Integrations & Service Architecture

## 1. Database & Persistence Layer

- **PostgreSQL 17 Integration (via Prisma 7 Adapter-Pg)**:
  - **Engine & Driver**: PostgreSQL 17-alpine on port `5433` ([docker-compose.yml](file:///home/user/projects/uims/docker-compose.yml#L6-L25)), queried via `@prisma/client` `^7.10.0` and `@prisma/adapter-pg` `^7.10.0`.
  - **Connection Pooling**: Uses `pg` `^8.23.0` (`Pool`) configured in [apps/api/src/database/prisma.service.ts](file:///home/user/projects/uims/apps/api/src/database/prisma.service.ts#L20-L28) with `max: 20`, `idleTimeoutMillis: 30000`, and `connectionTimeoutMillis: 5000`.
  - **Lifecycle Management**: Initializes pool and triggers `this.$connect()` on `onModuleInit`, gracefully closes pool via `this.$disconnect()` and `this.pool.end()` on `onModuleDestroy`.
  - **Modern Configuration**: Prisma configuration is defined in [apps/api/prisma.config.ts](file:///home/user/projects/uims/apps/api/prisma.config.ts) using `@prisma/config` `defineConfig`.
- **Redis 8 Integration (via ioredis 6)**:
  - **Engine & Driver**: Redis 8-alpine on port `6381` ([docker-compose.yml](file:///home/user/projects/uims/docker-compose.yml#L26-L40)), accessed via `ioredis` `^6.0.0` in [apps/api/src/common/redis/redis.service.ts](file:///home/user/projects/uims/apps/api/src/common/redis/redis.service.ts#L21-L54).
  - **Resilient In-Memory Fallback**: `RedisService` configures `lazyConnect: true`, max 3 retries, and transparently routes `get`, `set`, `del`, and `incr` operations to an internal `Map<string, { value: string; expiresAt: number }>` if Redis is unavailable.
  - **Batch Cache Invalidation**: Employs `delPattern(pattern: string)` using `client.scanStream({ match: pattern, count: 50 })` to safely stream and purge matching keys without blocking the Redis event loop.

---

## 2. Search Engine Integration (MeiliSearch)

- **Service Configuration**: MeiliSearch latest running in container `uims-meilisearch` on port `7700` ([docker-compose.yml](file:///home/user/projects/uims/docker-compose.yml#L42-L59)), authenticated with master key `MEILISEARCH_API_KEY`.
- **REST Multi-Search Execution**: [apps/api/src/modules/search/search.service.ts](file:///home/user/projects/uims/apps/api/src/modules/search/search.service.ts#L114-L148) queries entity indexes (`assets`, `licenses`, `users`) via HTTP POST to `/multi-search` using native Node.js `fetch` with `AbortSignal.timeout(3000)`.
- **Index Bulk Synchronization**: `syncAllToMeilisearch()` ([search.service.ts:228-296](file:///home/user/projects/uims/apps/api/src/modules/search/search.service.ts#L228-L296)) extracts batches of up to 1,000 records from Prisma and indexes documents via POST `/indexes/{indexUid}/documents`.
- **Automatic Database Search Fallback**: `checkHealthAndInit()` pings `/health`. When MeiliSearch is unreachable, `searchDatabaseFallback()` seamlessly executes case-insensitive `contains` searches against PostgreSQL tables.

---

## 3. Object Storage Integration (SeaweedFS S3-Compatible)

- **Cluster Architecture**: Distributed SeaweedFS storage topology running three dedicated Docker services ([docker-compose.yml](file:///home/user/projects/uims/docker-compose.yml#L61-L96)):
  - `seaweedfs-master`: Cluster metadata topology and volume assignment manager on port `9333`.
  - `seaweedfs-volume`: Raw blob volume server storing chunked file data on port `8080`.
  - `seaweedfs-filer`: Distributed file abstraction layer exposing both HTTP filer API on port `8888` and Amazon S3-compatible gateway on port `8333`.
- **Application Environment**: Configured in API environment via `S3_ENDPOINT=http://seaweedfs-filer:8333`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET=uims-files` ([docker-compose.yml](file:///home/user/projects/uims/docker-compose.yml#L121-L124)).

---

## 4. Real-Time Communication (WebSocket & Socket.io)

- **Gateway Architecture**: [apps/api/src/modules/notifications/notifications.gateway.ts](file:///home/user/projects/uims/apps/api/src/modules/notifications/notifications.gateway.ts#L38-L62) binds to namespace `/notifications` using `@nestjs/websockets` `^11.2.3` and `socket.io` `^4.8.3` (client: `socket.io-client` `^4.8.3`).
- **Handshake Authentication**: In `afterInit()` and `handleConnection()`, the gateway inspects handshake headers and `auth.token`, verifies the JWT payload via `JwtService`, and extracts user identity (`userId`, `role`).
- **Room Isolation & Targeted Dispatch**:
  - Automatically joins sockets to `user:${userId}` and `role:${role}` rooms.
  - Broadcasts events including `notification:new`, `notification:count`, `notification:read`, and `notification:cleared`.
- **Development Reverse Proxy**: Configured in [apps/web/vite.config.ts](file:///home/user/projects/uims/apps/web/vite.config.ts#L116-L122) with `ws: true` for zero-configuration local WebSocket upgrading.

---

## 5. Background Jobs & Scheduled Workers (BullMQ & Schedule)

- **Job Scheduling & Queues**: Powered by `@nestjs/bullmq` `^11.0.5`, `bullmq` `^6.3.4`, and `@nestjs/schedule` `^6.1.3` ([apps/api/package.json](file:///home/user/projects/uims/apps/api/package.json#L23-L40)).
- **Proactive Alert Automation**: [apps/api/src/modules/notifications/scheduled-alerts.worker.ts](file:///home/user/projects/uims/apps/api/src/modules/notifications/scheduled-alerts.worker.ts#L31-L62) runs daily at midnight UTC via `@Cron('0 0 * * *')`.
- **Monitored Telemetry Domains**:
  - **Expiring Licenses**: Scans expiry thresholds across 30d, 15d, 7d, 1d, and expired tiers (`scanExpiringLicenses`).
  - **Asset Warranties**: Evaluates warranty dates at 30d, 15d, 7d intervals (`scanExpiringWarranties`).
  - **Overdue Maintenance**: Detects assets in `MAINTENANCE` status exceeding 14 days (`scanOverdueMaintenance`).
  - **Stock Depletion**: Identifies items where `quantity <= minThreshold` or out of stock (`scanLowStock`).
- **Redis Cache-Based Alert Throttling**: Uses `dispatchThrottledAlert()` to check and set Redis keys (e.g., `alert:license:expiring:${id}:${tier}`) with TTLs between 1 and 14 days to eliminate notification fatigue.

---

## 6. Spreadsheet Processing & Data Ingestion (ExcelJS)

- **Library & Dependencies**: `exceljs` `^4.4.0` ([apps/api/package.json](file:///home/user/projects/uims/apps/api/package.json#L45)).
- **IPAM Ingestion Engine**: [apps/api/prisma/scripts/import-network-excel.ts](file:///home/user/projects/uims/apps/api/prisma/scripts/import-network-excel.ts#L1-L60) ingests multi-sheet network planning workbooks (`VLAN 100`, `VLAN 998`, `VLAN 996`, `VLAN 129`-`136`).
- **Data Validation & Transformation**: Validates IPv4 addresses, subnet CIDRs, gateway assignments, MAC addresses, device types, and physical locations.
- **Credential Registration**: Discovered network device administration credentials (switches, APs, firewalls) are extracted and securely encrypted in `CredentialVaultService`.

---

## 7. Authentication, Access Control & Governance

- **Authentication Flow**: Built on `@nestjs/passport` `^11.0.5`, `passport-jwt` `^4.0.1`, `@nestjs/jwt` `^11.0.2`, and `bcrypt` `^6.0.0` ([apps/api/src/modules/auth/auth.service.ts](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.service.ts#L178-L250)).
- **Dual-Token Grants**:
  - **Access Token (15m)**: Contains `sub`, `email`, `role`, and assigned granular permission strings (`${subject}:${action}`).
  - **Refresh Token (7d)**: Signed with `JWT_REFRESH_SECRET`, hashed with SHA-256 (`crypto.createHash('sha256')`), and stored in the database `RefreshToken` table with client IP and device metadata.
- **Strict Directory Account Isolation**: Corporate directory records (`DirectoryUser`) are strictly segregated from authentication credentials. Directory accounts attempting login trigger an immediate rejection and security audit log entry (`LOGIN_REJECTED_DIRECTORY_RECORD`).
- **Cryptographic Audit Signing**: [apps/api/src/common/interceptors/audit.interceptor.ts](file:///home/user/projects/uims/apps/api/src/common/interceptors/audit.interceptor.ts#L72-L89) computes HMAC-SHA256 digests over `timestamp|userId|action|entity|status|ip|payload` using `AUDIT_SIGNING_KEY` to guarantee tamper evidence.

---

## 8. API Documentation & Observability

- **OpenAPI / Swagger**: `@nestjs/swagger` `^11.4.7` mounted at `/api/v1/docs` in [apps/api/src/main.ts](file:///home/user/projects/uims/apps/api/src/main.ts#L83-L91) with Bearer auth token authorization.
- **Structured JSON Logging**: `pino` `^10.3.1` and `pino-http` `^11.0.0` deliver low-overhead structured logs across HTTP requests and background workers.
- **Health Verification**: [apps/api/src/modules/health/health.controller.ts](file:///home/user/projects/uims/apps/api/src/modules/health/health.controller.ts) provides readiness and liveness checks for PostgreSQL, Redis, and memory limits.

---

## 9. Development Tunneling & Ingress (Cloudflare)

- **Quick Tunnel Execution**: Initiated by [scripts/dev.sh](file:///home/user/projects/uims/scripts/dev.sh#L343) running `cloudflared tunnel --url https://localhost:5679 --no-tls-verify`.
- **Dynamic CORS Authorization**: Both Express HTTP CORS ([apps/api/src/main.ts](file:///home/user/projects/uims/apps/api/src/main.ts#L57)) and Socket.io gateway CORS ([apps/api/src/modules/notifications/notifications.gateway.ts](file:///home/user/projects/uims/apps/api/src/modules/notifications/notifications.gateway.ts#L50)) dynamically authorize `*.trycloudflare.com` origins during development.

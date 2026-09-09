# Integrations & External Services
**Analysis Date:** 2026-09-09

## Database
- **Engine**: PostgreSQL 17 (`postgres:17-alpine`, container `uims-postgres`, default port `5433:5432`).
- **Prisma Driver Adapter**: `@prisma/adapter-pg` `^7.10.0` with `pg` `^8.23.0` native connection pooling.
- **Connection Pool Configuration (`apps/api/src/database/prisma.service.ts`)**:
  - `Pool` constructed from `pg` with `max: Number(process.env.DB_POOL_MAX || 20)`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
  - Instantiates `PrismaPg(pool)` adapter passed to `super({ adapter })`.
  - Lifecycle: `onModuleInit` invokes `await this.$connect()`; `onModuleDestroy` cleanly shuts down `await this.$disconnect()` and `await this.pool.end()`.
- **Configuration & Seed**:
  - `apps/api/prisma.config.ts`: Prisma 7 `defineConfig` pointing to `schema: './prisma/schema.prisma'` and `seed: 'tsx prisma/seed.ts'`.
  - Database Extensions: `docker/postgres/init.sql` enables `uuid-ossp`, `pg_trgm`, and `citext`.
- **Core Entities & Data Models**:
  - IAM & Security: `AppUser`, `Role`, `Permission`, `RolePermission`, `RefreshToken`, `AuditLog`.
  - Directory & Organization: `DirectoryUser`, `DirectoryGroup`, `DirectoryMembership`, `Organization`, `Department`, `Position`, `Location`.
  - Asset & Lifecycle: `Asset`, `AssetCategory`, `AssetAssignment`, `MaintenanceLog`, `Warranty`.
  - Software Licensing: `License`, `LicenseAssignment`, `LicenseKey`.
  - Consumable Inventory: `Consumable`, `StockTransaction`, `Supplier`.
  - Network & IPAM: `NetworkDevice`, `Vlan`, `Subnet`, `IPAssignment`.
  - Alerts: `Notification`.

## Cache & Queue
- **Redis Engine**: Redis 8 (`redis:8-alpine`, container `uims-redis`, port `6381:6379`, `--appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru`).
- **Client & Fallback (`apps/api/src/common/redis/redis.service.ts`)**:
  - Implemented via `ioredis` `^6.0.0` with lazy connect, 3-attempt reconnect cap (`retryStrategy`), and automatic fallback to an in-memory `Map<string, { value: string; expiresAt: number }>` if Redis is unavailable.
  - Methods: `get<T>()`, `set(key, val, ttlSeconds)`, `del()`, `delPattern()` (using Redis scan stream `scanStream`), `incr()`, `isHealthy()`.
- **Caching Usage Patterns**:
  - **Dashboard Metrics**: `apps/api/src/modules/dashboard/dashboard.service.ts` caches aggregated counts and status statistics with 60-second TTL.
  - **Role Permissions**: `apps/api/src/modules/roles/roles.service.ts` caches resolved subject:action permission matrices per role.
  - **User Sessions**: `apps/api/src/modules/users/users.service.ts` caches active user lookups.
  - **System Settings**: `apps/api/src/modules/settings/settings.service.ts` caches tenant/system configurations.
  - **Alert Deduplication**: `apps/api/src/modules/notifications/scheduled-alerts.worker.ts` tracks alert idempotency keys with 24-hour TTL (`alert:<category>:<id>:<state>`).
- **Queue Framework & Scheduled Jobs**:
  - Framework: `bullmq` `^6.3.4` and `@nestjs/bullmq` `^11.0.5` are installed as the asynchronous queue architecture.
  - Scheduled Background Worker: `ScheduledAlertsWorker` (`apps/api/src/modules/notifications/scheduled-alerts.worker.ts`) executing daily midnight scans via `@Cron('0 0 * * *')`.
- **Scheduled Queue & Scan Routines**:
  - `scanExpiringLicenses`: Scans for software licenses expiring within 30, 60, or 90 days. Emits notification warnings and throttles repeat alerts via Redis.
  - `scanExpiringWarranties`: Scans hardware assets whose warranty expires within 30 days.
  - `scanOverdueMaintenance`: Scans scheduled maintenance records past due date.
  - `scanLowStock`: Scans inventory items where `quantityAvailable <= reorderLevel`, generating replenishment tasks.

## Search
- **Search Engine**: Meilisearch (`getmeili/meilisearch:latest`, container `uims-meilisearch`, port `7700:7700`).
- **Service Integration (`apps/api/src/modules/search/search.service.ts`)**:
  - Direct HTTP client using native `fetch` with `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`.
  - Health check verification during startup: `checkHealthAndInit()` queries `GET /health` with a 2000ms abort signal.
- **Search Execution & Multi-Search**:
  - Endpoint `POST /multi-search` queries multiple indexes in a single roundtrip with pagination (`limit`).
  - Indexed Models:
    - `assets`: Index mapped from `Asset` (`id`, `name`, `assetTag`, `serialNumber`, `model`, `manufacturer`, `category`, `status`).
    - `licenses`: Index mapped from `License` (`id`, `name`, `vendor`, `type`, `totalSeats`, `status`).
    - `users`: Index mapped from `DirectoryUser` (`id`, `name`, `username`, `email`, `jobTitle`, `department`, `status`).
- **Synchronization Endpoint**:
  - `POST /api/v1/search/sync` triggers `syncAllToMeilisearch()`, synchronizing up to 1000 records per model to `/indexes/{indexUid}/documents`.
- **Resilient Fallback**:
  - When Meilisearch is offline or returns an error, `searchDatabaseFallback()` executes ILIKE/contains queries directly across PostgreSQL tables (`Asset`, `License`, `DirectoryUser`), formatting results into the standardized `SearchResultItem` schema.

## File Storage
- **Object Storage Service**: SeaweedFS (`chrislusf/seaweedfs:latest`) running in Docker Compose:
  - `uims-seaweedfs-master`: Master cluster coordinator on port `9333`.
  - `uims-seaweedfs-volume`: Volume server on port `8080` bound to master.
  - `uims-seaweedfs-filer`: Distributed filer and S3 gateway on ports `8888` (filer HTTP) and `8333` (`-s3 -s3.port=8333`).
- **Configuration & Integration Status**:
  - Environment variables: `S3_ENDPOINT` (default `http://seaweedfs-filer:8333`), `S3_ACCESS_KEY` (`uims_s3_access`), `S3_SECRET_KEY` (`uims_s3_secret`), `S3_BUCKET` (`uims-files`).
  - Data records store file URLs and paths as strings in PostgreSQL (`avatar`, `documentUrl`). Infrastructure is prepared for direct S3 client upload and download streaming.

## Email / Notifications
- **Email Service Integration**:
  - No external transactional email provider (e.g. SES, SendGrid, SMTP) is configured in `@uims/api`. System communications operate in-app.
- **Notification Channels**:
  - **Database Persistence**: Notifications stored in `Notification` table (`id`, `userId`, `title`, `message`, `type: INFO|WARNING|ALERT`, `link`, `isRead`, `createdAt`).
  - **Real-Time WebSocket Push**: Broadcasts live notifications directly to connected user browser sessions via Socket.IO.
  - **Role-Based Fanout**: Notifications can be dispatched to specific users or broadcast across entire roles (e.g., all `Admin` or `IT Staff` users).
  - **Proactive Cron Notifications**: Automated alerts from `ScheduledAlertsWorker` for impending expirations and stock shortages.

## WebSocket
- **Gateway**: `NotificationsGateway` (`apps/api/src/modules/notifications/notifications.gateway.ts`).
- **Namespace**: `/notifications`.
- **Transport & Proxy**: Socket.IO 4.8.3 with WebSocket transport. Proxied through Nginx (`/socket.io/` with `Upgrade $http_upgrade` and `Connection "upgrade"`) and Vite dev server (`ws: true`).
- **Authentication**:
  - Handshake middleware intercepts connection requests, extracting JWT bearer tokens from `auth.token`, `query.token`, or `headers.authorization`.
  - Verifies token cryptographically using `JwtService` and `JWT_SECRET`.
  - Rejects unauthenticated connections and populates socket data with `{ userId, role, email }`.
- **Room Subscriptions**:
  - `user:{userId}`: Dedicated room for targeted individual notifications.
  - `role:{role}`: Broadcast room for role-specific events.
- **Events Emitted**:
  - `connected`: Handshake success `{ status: 'ready', userId, role, timestamp }`.
  - `notification:new`: Dispatched when a notification is created.
  - `notification:count`: Real-time update of unread notification badge count.
  - `notification:read`: Emitted when an individual notification is marked read.
  - `notification:cleared`: Emitted when all notifications are dismissed.
- **Events Listened**:
  - `ping`: Healthcheck heartbeat from frontend, responding with `{ pong: 'pong', time: ISOString }`.

## External APIs
- **Active Directory / LDAP Services (`apps/api/src/modules/directory/directory.service.ts`)**:
  - Configured for corporate domain `uims.internal` and primary controller `DC01-PRIMARY.corp.uims.internal`.
  - Organizational Units (OUs): Corporate HQ, IT & Infrastructure, Engineering, Production & Manufacturing, Operations & Supply Chain, Commercial & Sales.
  - Security Groups: AD Security Groups managed with domain local scope (`ensureAndLinkAdGroup`).
  - Batch Import / Export:
    - `POST /api/v1/directory/import`: Ingests batch LDAP/AD export records, upserting `DirectoryUser` records and auto-linking security groups.
    - `GET /api/v1/directory/export`: Exports 18-column master directory roster with employment status, hardware computer bindings, and OU assignments.
  - Domain Sync Probe: `GET /api/v1/directory/sync` simulates and reports domain controller replication metrics (`replicatedObjects`, `latencyMs`, `activeIdentities`).
- **Adversarial Identity Isolation**:
  - Strict security boundary separating internal directory users (`DirectoryUser`) from application administrators (`AppUser`).
  - Attempts by directory accounts to authenticate at `/api/v1/auth/login` are explicitly blocked, raising `LOGIN_REJECTED_DIRECTORY_RECORD` in the tamper-evident audit log.
- **Network Infrastructure & IPAM (`apps/api/src/modules/network`)**:
  - Tracks network devices, VLANs, subnets, and IP assignments.
  - Network probe functions monitor device availability and response latency.

## Authentication Providers
- **Strategy**: JSON Web Token (JWT) using Passport (`passport-jwt` `^4.0.1` and `@nestjs/jwt` `^11.0.2` via `JwtStrategy`).
- **Token Specifications**:
  - **Access Token**: Short-lived (`JWT_ACCESS_EXPIRATION` default 15m), HMAC-SHA256 signed using `JWT_SECRET`. Contains claims: `sub` (user ID), `email`, `role`, `permissions` (subject:action array), `username`, and `type: 'access'`.
  - **Refresh Token**: Long-lived (`JWT_REFRESH_EXPIRATION` default 7d), signed using `JWT_REFRESH_SECRET`.
- **Token Refresh & Revocation Lifecycle**:
  - Refresh tokens are hashed using SHA-256 (`crypto.createHash('sha256').update(token).digest('hex')`) and persisted in the `RefreshToken` database table with device user-agent, IP address, and expiry timestamp.
  - `POST /api/v1/auth/refresh` validates the caller's active user status, dynamically re-resolves up-to-date permissions from database role assignments, and issues a new access token.
  - `POST /api/v1/auth/logout` revokes all active refresh tokens for the user session (`isRevoked: true`).
- **Password Security**: `bcrypt` (version 6.0.0) with salt rounds.
- **Rate Limiting & Abuse Defense**:
  - `@Throttle({ default: { limit: 5, ttl: 60000 } })` applied to `POST /api/v1/auth/login`.
  - `@Throttle({ default: { limit: 10, ttl: 60000 } })` applied to `POST /api/v1/auth/refresh`.
  - Client IP extracted reliably via `ClientIP` decorator handling `X-Forwarded-For` through reverse proxies.
- **Tamper-Evident Audit Trail**:
  - Every login success, login failure, and directory rejection is committed to the database with HMAC-SHA256 signature calculated from `AUDIT_SIGNING_KEY`.

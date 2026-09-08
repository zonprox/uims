# Integrations & External Services
**Analysis Date:** 2026-09-08

## Database (PostgreSQL + Prisma)
- **Engine**: PostgreSQL 17
- **ORM**: Prisma Client v7.9.1
- **Key Models**: `User`, `Role`, `Asset`, `License`, `InventoryItem`, `IPAddress`, `AuditLog`, `Notification`, `DirectoryGroup`.
- **Relations**: Comprehensive mapping of organizational hierarchy (Organization -> Department -> Position), networking (VLAN -> Subnet -> IPAddress), and asset assignment.

## Cache & Queue (Redis + BullMQ)
- **Engine**: Redis v8 via `ioredis` v6.
- **Caching/Throttling**: Integrated natively with NestJS (`RedisModule`, `@nestjs/throttler`).
- **Queues**: `bullmq` v6.1.2 and `@nestjs/bullmq` are installed for background job processing.

## Search (MeiliSearch)
- **Service**: MeiliSearch latest.
- **Integration**: `SearchModule` exposed via `SearchController`.
- **Endpoints**: `GET /api/v1/search` for querying, `POST /api/v1/search/sync` to trigger `syncAllToMeilisearch()` synchronization.

## File Storage (SeaweedFS)
- **Service**: SeaweedFS running Master, Volume, and Filer nodes.
- **Protocol**: S3-compatible API (port 8333).
- **Environment**: Backend expects `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET` for file uploads/retrievals.

## WebSocket (Socket.IO)
- **Gateway**: `NotificationsGateway` at namespace `/notifications`.
- **Authentication**: Validates JWT token from handshake (headers/query) to assign Socket ID to rooms based on `user:{userId}` and `role:{role}`.
- **Events Emitted**: `connected`, `notification:new`, `notification:count`, `notification:read`, `notification:cleared`.
- **Events Listened**: `ping` (replies with `pong`).

## API Endpoints Overview
REST endpoints are prefixed with `api/v1`. Controllers identified:
- `AssetsController`, `InventoryController`, `LicensesController` (Asset Management)
- `AuthController`, `UsersController`, `RolesController` (IAM)
- `NetworkController` (IPAM)
- `OrganizationController` (Org Chart / Directory)
- `NotificationsController`, `AuditController`, `ReportsController`, `DashboardController`, `SettingsController`, `HealthController`, `SearchController`.
- **Security**: Secured globally by `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard`. Intercepted by `AuditInterceptor`.

## Inter-Package Dependencies
- `@uims/api` and `@uims/web` strictly import types from `@uims/shared-types`, schemas from `@uims/shared-validators`, and helpers from `@uims/shared-utils`.

## External Service Configuration
- **Directory Services**: Prisma enums support `LDAP` and `AZURE_AD` as Directory Sources (`DirectorySource`).
- **CORS/Security**: Strict CORS dynamically allowing localhost or explicit `CORS_ORIGIN`. Helmet enforces strict HSTS.

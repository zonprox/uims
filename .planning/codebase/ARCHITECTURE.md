---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# Architecture

**Analysis Date:** 2026-10-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Client Layer (React 19.3 + Ant Design 6.6.6)                │
│   Single Public HTTPS Port (5679) / Cloudflare Tunnel / Local TLS Dev Server    │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│   Pages & Drawers     │    Zustand 5 Stores     │     TanStack React Query 5    │
│  `apps/web/src/pages` │  `apps/web/src/stores`  │    `apps/web/src/services`    │
└───────────┬───────────┴────────────┬────────────┴───────────────┬───────────────┘
            │                        │                            │
            │ HTTP (REST /api/v1)    │ Bearer JWT / Cookie        │ WebSocket (/socket.io)
            ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   Reverse Proxy & Edge Gateway (Nginx / Vite 8)                 │
│   Terminates TLS, validates CORS (`apps/api/src/config/cors.config.ts`), routes │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         API Layer (NestJS 11 Modular Monolith)                  │
│                     Global Prefix: `/api/v1/*` (Port 3002)                      │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│    Guards & Filters   │     Controllers         │     Validation & Diff Utils   │
│  `apps/api/src/common`│  `apps/api/src/modules` │ `@uims/shared-validators/utils`│
└───────────┬───────────┴────────────┬────────────┴───────────────┬───────────────┘
            │                        │                            │
            ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Domain Services & Workers Layer                         │
│  Assets, Audit, Auth, Dashboard, Directory, Inventory, Licenses, Network, etc.  │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Persistence & Infrastructure Layer                         │
│  Prisma 7.10 ORM (`@prisma/adapter-pg`) + Drivers (ioredis, pg, meili, s3)      │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│  PostgreSQL 17 (5433) │      Redis 8 (6381)     │    MeiliSearch (7700) / S3    │
│  28 Domain Models     │      `uims-redis`       │    `uims-meilisearch` /filer  │
└───────────────────────┴─────────────────────────┴───────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `AppModule` | Root NestJS application module orchestrating global configuration and 15 domain modules | `apps/api/src/app.module.ts` |
| `Bootstrap` | Entry point configuring Helmet security, centralized CORS, pipes, filters, Swagger, and shutdown hooks | `apps/api/src/main.ts` |
| `CorsConfig` | Centralized strict CORS resolution for REST API and WebSocket gateways with zero localhost leak in prod | `apps/api/src/config/cors.config.ts` |
| `PrismaService` | Database client connecting Prisma 7.10 to PostgreSQL 17 via `@prisma/adapter-pg` connection pool | `apps/api/src/database/prisma.service.ts` |
| `RedisService` | Redis 8 client for token revocation, rate limiting, and resilient degraded-mode telemetry | `apps/api/src/common/redis/redis.service.ts` |
| `AuthService` | Authentication, bcrypt (12 rounds) hashing, `lastLoginAt` tracking, and JWT refresh token rotation | `apps/api/src/modules/auth/auth.service.ts` |
| `AssetsService` | Hardware lifecycle, physical unit tracking, batch assignment, return workflows, and handover records | `apps/api/src/modules/assets/assets.service.ts` |
| `HandoverDocBuilder` | Generates corporate `.docx` (`docx` 9.10) and printable HTML custody handover/return documents | `apps/api/src/modules/assets/utils/handover-document.builder.ts` |
| `DirectoryService` | Organizational hierarchy, HR CSV batch imports, and AES-256-GCM encrypted initial AD/email credentials | `apps/api/src/modules/directory/directory.service.ts` |
| `InventoryService` | Warehouse stock levels, consumable restock thresholds, and audited inventory transactions | `apps/api/src/modules/inventory/inventory.service.ts` |
| `LicensesService` | Software compliance, batch seat allocations, renewals, and AES-256-GCM encrypted license keys | `apps/api/src/modules/licenses/licenses.service.ts` |
| `NetworkService` | IPAM, VLANs, subnet CIDR calculation, switch port provisioning, and 42U rack elevation management | `apps/api/src/modules/network/network.service.ts` |
| `ReportsService` | Operational data exports in streaming XLSX, custom PDF (`pdf-table-generator.ts`), and CSV formats | `apps/api/src/modules/reports/reports.service.ts` |
| `SearchService` | 6-domain universal omnisearch with cursor-paginated MeiliSearch sync and PostgreSQL fallback | `apps/api/src/modules/search/search.service.ts` |
| `NotificationsGateway` | Real-time WebSocket broadcaster with fail-closed JWT handshake validation and `OnModuleDestroy` draining | `apps/api/src/modules/notifications/notifications.gateway.ts` |
| `ScheduledAlertsWorker` | Cursor-paginated (`take: 100`) background cron worker checking warranties, renewals, and low stock | `apps/api/src/modules/notifications/scheduled-alerts.worker.ts` |
| `AuditService` | HMAC-SHA256 tamper-evident audit chain logger, entity history query engine, and field-diff recorder | `apps/api/src/modules/audit/audit.service.ts` |
| `ActivityTimeline` | Reusable frontend entity activity timeline and `FieldDiffViewer` embedded across domain detail drawers | `apps/web/src/components/ActivityTimeline.tsx` |
| `CommandPalette` | Global `Ctrl+K` / `Cmd+K` 6-domain omnisearch modal with deep-link drawer navigation | `apps/web/src/components/CommandPalette.tsx` |
| `RouteErrorBoundary` | Leaf-route error boundary isolating page-level crashes while keeping the main navigation shell alive | `apps/web/src/components/RouteErrorBoundary.tsx` |

## Pattern Overview

**Overall:** Modular Monolith API with a Decoupled React 19 Single-Page Application (SPA) and Shared Monorepo Packages (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`).

**Key Characteristics:**
- **Domain Module Encapsulation**: 15 backend modules (`assets`, `audit`, `auth`, `dashboard`, `directory`, `health`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `roles`, `search`, `settings`, `users`) isolate business rules behind controllers, services, and validated DTOs.
- **Cross-Domain Field-Level Audit Trail**: Mutations across core entities compute deterministic field diffs via `calculateFieldDiff` / `computeFieldDiff` (`packages/shared-utils/src/diff.ts`) with sensitive field redaction and persist HMAC-SHA256 chained `AuditLog` entries queryable per entity (`GET /api/v1/audit/entity/:entityType/:entityId`).
- **End-to-End Custody Handover Lifecycle**: Asset assignment and return operations generate `AssetHandoverRecord` rows, printable HTML custody sheets, and downloadable `.docx` Word documents, tracking pending vs. signed document attachment states.
- **Fail-Closed Security & Zero Default Role**: Missing permissions, unverified roles, or query-string WebSocket tokens are immediately rejected (`ForbiddenException` / `client.disconnect(true)`).
- **Bounded & Deterministic Queries**: Every `findMany()` enforces `take: Math.min(limit, 100)` (or `take: 100` cursor batches in workers) and deterministic `orderBy` with a secondary unique tie-breaker (`{ id: 'asc' | 'desc' }`).

## Layers

**Presentation Layer (Frontend SPA):**
- Purpose: Responsive enterprise IT operations interface in 100% concise Enterprise English
- Location: `apps/web/src/`
- Contains: React 19 pages, Ant Design 6.6.6 components, Zustand 5 stores, TanStack Query 5 hooks, QR decoder utilities
- Depends on: `@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`

**API Transport & Security Layer:**
- Purpose: Route REST and WebSocket traffic, enforce RBAC, validate DTOs, and wrap responses in standard envelopes
- Location: `apps/api/src/common/`, `apps/api/src/config/`, `apps/api/src/modules/*/*.controller.ts`
- Contains: Controllers, `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `HttpExceptionFilter`, `PrismaExceptionFilter`, `TransformInterceptor`, `AuditInterceptor`
- Depends on: `@uims/shared-validators`, `@uims/shared-types`

**Domain Logic Layer:**
- Purpose: Execute transactional business workflows, cryptographic envelope sealing, field diffing, document generation, and background alert evaluation
- Location: `apps/api/src/modules/*/*.service.ts`, `apps/api/src/common/crypto/`, `apps/api/src/common/utils/`
- Depends on: `PrismaService`, `RedisService`, `AuditService`, `@uims/shared-utils`

**Data Persistence & Infrastructure Layer:**
- Purpose: Relational storage (28 Prisma models), sub-millisecond Redis caching, MeiliSearch indexing, and SeaweedFS object storage
- Location: `apps/api/prisma/`, `docker/`

## Data Flow

### Primary Mutation & Audited Entity Diff Flow

1. **User Interaction**: User edits an entity or performs a batch assignment in the UI (e.g., `AssetsPage.tsx` / `BatchAssignModal.tsx`).
2. **Service Client**: Frontend calls `assetsService` (`apps/web/src/services/assets.service.ts`) via relative URL `/api/v1/assets/...`.
3. **Security & Validation**: `JwtAuthGuard` and `PermissionsGuard` verify RBAC claims; `ValidationPipe` validates the DTO.
4. **Transactional Domain Update & Diffing**: Domain service fetches prior state, applies the update in PostgreSQL via `PrismaService`, computes field-level changes using `computeFieldDiff(before, after)` from `@uims/shared-utils`, and records a signed audit entry via `AuditService.recordEntityDiff()`.
5. **Activity Timeline Refresh**: Opening any entity detail drawer (`AssetDetailDrawer`, `UserDetailDrawer`, `LicenseSeatsDrawer`, `SubnetDetailDrawer`, `InventoryDetailDrawer`) renders `<ActivityTimeline />` and `<FieldDiffViewer />` populated from `/api/v1/audit/entity/:entityType/:entityId`.

### Deep-Linked Real-Time Notification Flow

1. **Event Emission**: Domain service or `ScheduledAlertsWorker` creates a notification with `entityType`, `entityId`, and `actionUrl`.
2. **WebSocket Broadcast**: `NotificationsGateway` emits the notification to the authenticated user room over `/notifications`.
3. **Deep-Link Navigation**: Clicking a notification or `CommandPalette` omnisearch result routes to the target domain page with URL query parameters (e.g., `?openId=<id>`) to automatically open the corresponding detail drawer.

## Key Abstractions

**Standardized API Response Envelope:**
- Purpose: Uniform contract across all REST endpoints
- Location: `apps/api/src/common/interceptors/transform.interceptor.ts`, `packages/shared-types/src/dto/api-response.ts`
- Contract: `{ success: true, data: T, timestamp: string }`

**Authenticated AES-256-GCM Cryptographic Envelope:**
- Purpose: Encrypt sensitive secrets at rest (`License.licenseKey`, `DirectoryUser.emailInitialPassword`, `DirectoryUser.adInitialPassword`)
- Location: `apps/api/src/common/crypto/license-crypto.ts`, `apps/api/src/common/crypto/directory-crypto.ts`
- Contract: `enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>` using 96-bit random IVs and 128-bit auth tags

**Cross-Domain Field Diff Engine:**
- Purpose: Compute human-readable, redacted before/after diffs for entity audit timelines
- Location: `packages/shared-utils/src/diff.ts`, `apps/web/src/components/FieldDiffViewer.tsx`
- Contract: `computeFieldDiff(oldRecord, newRecord)` with automatic sensitive key masking (`password`, `secret`, `token`, `licenseKey`)

## Entry Points

- **API Server**: `apps/api/src/main.ts` (bootstraps NestJS 11 on port 3002, mounts `/api/v1` and `/api/v1/docs`)
- **Web SPA**: `apps/web/src/main.tsx` -> `apps/web/src/app/App.tsx` -> `apps/web/src/app/router.tsx` (serves HTTPS SPA on port 5679)
- **Database Seed Pipeline**: `apps/api/prisma/seed.ts` (executes deterministic domain seeders in `apps/api/prisma/seeders/`)
- **Dev Stack Daemon**: `scripts/dev.sh` (`start`, `stop`, `restart`, `status`, `logs`, `url`)

## Architectural Constraints & Invariants

- **Zero Circular Dependencies**: Verified 0 circular call/import chains across all 582 TypeScript files (`cycles_total: 0`). Zustand stores never import service clients.
- **Zero Fixed URLs**: Frontend uses relative `/api/v1` and dynamic `window.location.origin` WebSocket connections so the app works across localhost, LAN IPs, custom domains, and Cloudflare tunnels without rebuilding.
- **Route-Level Crash Isolation**: Every leaf route inside `apps/web/src/app/router.tsx` binds `ErrorBoundary: RouteErrorBoundary` so page errors never unmount `MainLayout`.
- **Standard 42U Rack Baseline**: Physical network racks standardize on `STANDARD_RACK_HEIGHT = 42` across schema, validators, DTOs, and `RackElevationView.tsx`.

---

*Architecture analysis: 2026-10-14*

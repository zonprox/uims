---
last_mapped_commit: 513c003639d98df385b56ab541797a216524064b
last_mapped_at: 2026-10-12
---
<!-- refreshed: 2026-10-12 -->

# Architecture

**Analysis Date:** 2026-10-12

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Client Layer (React 19 + Ant Design v6)                    │
│   Single Public HTTPS Port (5679) / Cloudflare Tunnel / Local TLS Dev Server    │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│    Pages & Views      │    Zustand Stores       │     TanStack React Query      │
│  `apps/web/src/pages` │  `apps/web/src/stores`  │    `apps/web/src/services`    │
└───────────┬───────────┴────────────┬────────────┴───────────────┬───────────────┘
            │                        │                            │
            │ HTTP (REST)            │ Bearer JWT / Cookie        │ WebSocket
            ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   Reverse Proxy & Edge Gateway (Nginx / Vite)                   │
│   Terminates TLS, validates CORS (`apps/api/src/config/cors.config.ts`), routes │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         API Layer (NestJS 11 Modular Monolith)                  │
│                     Global Prefix: `/api/v1/*` (Port 3002)                      │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│    Guards & Filters   │     Controllers         │     Validation & Pipes        │
│  `apps/api/src/common`│  `apps/api/src/modules` │   `@uims/shared-validators`   │
└───────────┬───────────┴────────────┬────────────┴───────────────┬───────────────┘
            │                        │                            │
            ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Domain Services & Workers Layer                         │
│   AssetsService, DirectoryService, InventoryService, NetworkService, Workers   │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Persistence & Infrastructure Layer                         │
│  Prisma 7 ORM (`@prisma/adapter-pg`) + Native Drivers (ioredis, pg, meili, s3)  │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│  PostgreSQL 17 (5433) │      Redis 8 (6381)     │    MeiliSearch (7700) / S3    │
│  `uims-postgres`      │      `uims-redis`       │    `uims-meilisearch` /filer  │
└───────────────────────┴─────────────────────────┴───────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `AppModule` | Root NestJS application module orchestrating global configuration and domain imports | `apps/api/src/app.module.ts` |
| `Bootstrap` | Entry point configuring Helmet security, CORS allowlisting, pipes, filters, Swagger, and shutdown hooks | `apps/api/src/main.ts` |
| `CorsConfig` | Centralized strict CORS resolution for REST API and WebSocket gateways with zero localhost leak | `apps/api/src/config/cors.config.ts` |
| `PrismaService` | Database client connecting Prisma 7 to PostgreSQL via `@prisma/adapter-pg` pool | `apps/api/src/database/prisma.service.ts` |
| `RedisService` | Enterprise Redis 8 client for token revocation, rate limiting, and ephemeral state | `apps/api/src/common/redis/redis.service.ts` |
| `AuthModule` | Authentication, password hashing (bcrypt 12 rounds), JWT access/refresh token rotation | `apps/api/src/modules/auth/auth.module.ts` |
| `AssetsService` | Hardware lifecycle, physical unit tracking, depreciation, and QR code assignments | `apps/api/src/modules/assets/assets.service.ts` |
| `DirectoryService` | Organizational hierarchies, department sync, AES-256-GCM encrypted passwords, CSV imports | `apps/api/src/modules/directory/directory.service.ts` |
| `InventoryService` | Stock levels, warehouse tracking, consumable restock thresholds, inventory transactions | `apps/api/src/modules/inventory/inventory.service.ts` |
| `LicensesService` | Software compliance, seat allocations, license renewals, and AES-256-GCM encrypted keys | `apps/api/src/modules/licenses/licenses.service.ts` |
| `NetworkService` | IPAM, VLANs, subnet allocation, switch port provisioning, and rack elevation mapping | `apps/api/src/modules/network/network.service.ts` |
| `NotificationsGateway` | Real-time WebSocket event broadcaster with fail-closed JWT handshake validation | `apps/api/src/modules/notifications/notifications.gateway.ts` |
| `ScheduledAlertsWorker` | Cursor-paginated background cron tasks checking warranties, renewals, and stock depletion | `apps/api/src/modules/notifications/scheduled-alerts.worker.ts` |
| `AuditService` | HMAC-SHA256 cryptographically signed, immutable audit trail logger and verifier | `apps/api/src/modules/audit/audit.service.ts` |
| `Web App` | React 19 root component configuring theme tokens, dynamic App context, and routing | `apps/web/src/app/App.tsx` |
| `ApiClient` | Centralized Axios HTTP client with JWT interceptors, token refresh queue, and envelope unwrapping | `apps/web/src/services/api.ts` |
| `PageContainer` | Standardized Ant Design v6 UI layout wrapper with responsive KPI stat cards and breadcrumbs | `apps/web/src/components/PageContainer.tsx` |

## Pattern Overview

**Overall:** Modular Monolith with Decoupled Frontend Single-Page Application (SPA) and Shared Domain Monorepo Packages.

**Key Characteristics:**
- **Boundary Isolation**: Domain modules (`assets`, `directory`, `inventory`, `network`, etc.) encapsulate business logic behind dedicated services and DTOs.
- **Fail-Closed Security**: Missing permissions, invalid tokens, or unverified roles immediately terminate with HTTP 401/403 or immediate WebSocket disconnection.
- **Strict Anti-Downgrade Invariant**: Foundational packages (TypeScript 7.x, NestJS 11.x, React 19.x, Vite 8.x, Ant Design 6.x, Prisma 7.x) cannot be downgraded under any circumstance.
- **Deterministic Data Access**: Every database query enforces deterministic ordering with unique secondary tie-breakers (`id`) and capped limits.

## Layers

**Presentation Layer (Frontend SPA):**
- Purpose: Deliver high-performance responsive IT operations interface with 100% Enterprise English
- Location: `apps/web/src/`
- Contains: React 19 pages, Ant Design v6 components, Zustand stores, TanStack Query hooks
- Depends on: `@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`
- Used by: End users, system administrators, and IT engineers

**API Transport & Security Layer:**
- Purpose: Route REST requests, validate incoming payloads, enforce RBAC permissions, and format responses
- Location: `apps/api/src/common/`, `apps/api/src/modules/*/` (controllers, guards, filters)
- Contains: NestJS controllers, `@Public()`, `@Roles()`, `@RequirePermissions()` decorators, `ValidationPipe`
- Depends on: `@uims/shared-validators`, `@uims/shared-types`
- Used by: Web client, automated scripts, health monitors

**Domain Logic Layer:**
- Purpose: Execute business logic, compute depreciations, allocate IP addresses, trigger real-time alerts
- Location: `apps/api/src/modules/*/` (services, workers)
- Contains: Domain services, scheduled workers, cryptography helpers
- Depends on: `PrismaService`, `RedisService`, domain DTOs
- Used by: Controllers, scheduled cron workers, background processors

**Data Persistence & Infrastructure Layer:**
- Purpose: Guarantee relational ACID integrity, provide sub-millisecond caching, and store blobs
- Location: `apps/api/prisma/`, `docker/`
- Contains: PostgreSQL 17 schema, Redis 8, MeiliSearch indexes, SeaweedFS S3 storage
- Depends on: Docker runtime, container networking
- Used by: `PrismaService`, `RedisService`, `SearchService`

## Data Flow

### Primary Request Path (CRUD / Query Flow)

1. **User Interaction**: User triggers action in UI component (`apps/web/src/pages/assets/AssetsPage.tsx`).
2. **Service Client**: TanStack Query mutation/query calls `assetsService.getAssets(params)` via `apps/web/src/services/assets.service.ts`.
3. **HTTP Transport**: `api.ts` Axios client attaches Bearer JWT header, sends GET `/api/v1/assets?page=1&limit=10`.
4. **Transport Gateway**: Nginx/Vite proxies request to NestJS backend on port `3002`.
5. **CORS & Security**: `apps/api/src/config/cors.config.ts` validates origin; Helmet inspects headers.
6. **Authentication & RBAC**: `JwtAuthGuard` verifies JWT signature; `PermissionsGuard` verifies `assets:read` permission.
7. **Validation Pipe**: `ValidationPipe` parses query parameters against `PaginationQueryDto` with sanitized bounds.
8. **Domain Execution**: `AssetsController.findAll()` invokes `AssetsService.findAll()`.
9. **Database Query**: `AssetsService` executes bounded query via `prisma.asset.findMany({ take: 10, skip: 0, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })`.
10. **Envelope Transform**: `TransformInterceptor` wraps result in standard envelope `{ success: true, data: { items, total }, timestamp: "..." }`.
11. **Client State Update**: Axios unwrap interceptor returns `data`, TanStack Query updates cache, React 19 renders updated table rows.

### Real-Time Alert & WebSocket Flow

1. **Domain Event Trigger**: Inventory item drops below minimum safety threshold during update in `InventoryService`.
2. **Gateway Broadcast**: `NotificationsGateway` emits `stock_alert` event to rooms corresponding to users with `inventory:manage` permission.
3. **Client Reception**: `apps/web/src/hooks/useRealtimeNotifications.ts` receives payload over authenticated WebSocket.
4. **Reactive Feedback**: Dynamic Ant Design feedback (`App.useApp().notification.warning(...)`) renders toast; unread notification badge counter updates.

**State Management:**
- Server State: Managed completely via TanStack Query 5 (`apps/web/src/app/query-client.ts`) with automatic garbage collection and background revalidation.
- Client State: Managed via Zustand 5 stores (`auth.store.ts`, `theme.store.ts`, `timezone.store.ts`, `notification-settings.store.ts`).
- Circular Import Defense: Stores maintain zero imports to `api.ts` or `auth.service.ts`; network clients resolve tokens independently.

## Key Abstractions

**Response Envelope Pattern:**
- Purpose: Ensure 100% consistent API response contracts across all backend endpoints
- Examples: `apps/api/src/common/interceptors/transform.interceptor.ts`, `@uims/shared-types`
- Pattern: `{ success: boolean, data: T, timestamp: string, statusCode?: number, message?: string }`

**Authenticated AES-256-GCM Cryptographic Envelope:**
- Purpose: Transparently encrypt sensitive credentials (license keys, directory passwords) at rest
- Examples: `apps/api/src/common/crypto/license-crypto.ts`, `apps/api/src/common/crypto/directory-crypto.ts`
- Pattern: Canonical envelope format `enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>` with SHA-256 derived keys

**Dynamic UI Feedback Bridge (`App.useApp()`):**
- Purpose: Provide React 19 concurrent-safe and theme-synchronized notifications, modals, and toasts
- Examples: `apps/web/src/components/PageContainer.tsx`, `apps/web/src/pages/inventory/InventoryPage.tsx`
- Pattern: Enforced via `AppFeedbackSafety.test.tsx` forbidding static `message.error()` or `notification.open()`

## Entry Points

**API Service:**
- Location: `apps/api/src/main.ts`
- Triggers: Node execution (`node dist/main.js` or `dev.sh start`)
- Responsibilities: Bootstraps NestJS IoC container, binds global filters/pipes/interceptors, binds port 3002

**Web UI Application:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser request to `https://localhost:5679` (Vite) or `https://<domain>` (Nginx)
- Responsibilities: Mounts React 19 DOM tree into `#root`, wraps providers, boots router

**Dev Stack Daemon CLI:**
- Location: `scripts/dev.sh`
- Triggers: CLI commands (`./scripts/dev.sh start|stop|restart|status|logs|url`)
- Responsibilities: Detaches persistent background daemons via `setsid -f`, spins up Docker containers, captures Cloudflare tunnel

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop; long-running tasks, heavy report generation, and bulk imports are processed in chunked transactions or cursor batches to prevent event loop blocking.
- **Global State:** Zero global mutable state; all service dependencies injected via NestJS dependency injection. Frontend client state is isolated inside Zustand store hooks.
- **Circular Imports:** Monorepo package dependencies flow strictly unidirectionally (`shared-*` -> `api`/`web`; never `api` -> `web` or vice-versa). State stores do not import API services.
- **Query Bounds:** Unbounded `findMany()` queries are strictly forbidden. All database queries must enforce an explicit ceiling (`take: Math.min(limit, 100)`) and deterministic `orderBy` with secondary unique tie-breaker.

## Anti-Patterns

### Deprecated Ant Design v4/v5 Style Props

**What happens:** Using `bodyStyle`, `headStyle`, or raw global CSS overrides on Ant Design components.
**Why it's wrong:** Deprecated in Ant Design v6; causes layout regressions, fails theme token inheritance, and breaks dark mode styling.
**Do this instead:** Use semantic token prop `styles={{ body: { ... }, header: { ... } }}` as demonstrated in `apps/web/src/components/PageContainer.tsx`.

### Static Ant Design Feedback Methods

**What happens:** Calling `import { message, notification, Modal } from 'antd'` and invoking `message.error(...)` directly.
**Why it's wrong:** Static calls bypass React 19 context, lose active theme/dark mode tokens, and cause concurrency hazards.
**Do this instead:** Consume dynamic context via `const { message, modal, notification } = App.useApp()` under `<App>`.

### In-Memory Table Scans and Aggregations

**What happens:** Fetching thousands of database rows into Node.js memory to compute `.reduce()` totals or evaluate `.filter()` thresholds.
**Why it's wrong:** Causes memory exhaustion, event loop lag, and network serialization overhead under high production load.
**Do this instead:** Push logic down to PostgreSQL using Prisma `_sum`, `_count`, `groupBy`, or `$queryRaw` SQL aggregates.

## Error Handling

**Strategy:** Centralized exception filter pipeline mapping domain and database errors to standardized client envelopes with zero swallowed exceptions.

**Patterns:**
- Typed Catch Mandate: Catch blocks must specify `catch (error: unknown)` and narrow safely before inspection.
- Zero Silent Catches: Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly banned across both frontend and backend.
- Exception Mapping: `PrismaExceptionFilter` translates database error codes (e.g. `P2002` duplicate -> 409 Conflict; `P2025` not found -> 404) into clear actionable messages.

## Cross-Cutting Concerns

**Logging:** Structured NestJS `Logger` in API emitting JSON via Pino; raw `console.log` is prohibited. Frontend surfaces actionable notifications via `App.useApp()`.
**Validation:** Dual-layer runtime validation powered by Zod (`@uims/shared-validators`) and class-validator on DTOs via `ValidationPipe`.
**Authentication:** Stateless JWT access tokens with secure refresh token rotation and database-backed revocation.

---

*Architecture analysis: 2026-10-12*

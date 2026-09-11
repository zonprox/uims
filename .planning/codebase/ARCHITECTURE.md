<!-- refreshed: 2026-09-11 -->
# Architecture

**Analysis Date:** 2026-09-11

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    Browser / Mobile Client                           │
│          https://localhost:5679 or *.trycloudflare.com               │
└────────┬───────────────────────────────────────┬─────────────────────┘
         │ HTTPS (REST)                          │ WSS (Socket.IO)
         ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│             Vite Dev Server / Nginx TLS Proxy (Port 5679)            │
│   Serves React SPA + Reverse proxies /api/* and /socket.io/*         │
│   `apps/web/vite.config.ts` / `docker/nginx/`                        │
└────────┬───────────────────────────────────────┬─────────────────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                NestJS API (Port 3002 → internal 3000)                │
│   `apps/api/src/main.ts` → AppModule                                 │
│                                                                       │
│   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│   │  Controllers │ │   Guards    │ │ Interceptors │ │   Filters    │ │
│   │  (Routing)   │ │ (Auth/RBAC) │ │ (Transform)  │ │ (Errors)     │ │
│   └──────┬───────┘ └─────────────┘ └──────────────┘ └──────────────┘ │
│          ▼                                                            │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │                    Service Layer                              │   │
│   │   Business logic, validation, domain operations               │   │
│   └──────┬───────────────────────────────────────────────────────┘   │
│          ▼                                                            │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │               PrismaService + RedisService                    │   │
│   │   `apps/api/src/database/prisma.service.ts`                   │   │
│   │   `apps/api/src/common/redis/redis.service.ts`                │   │
│   └──────┬──────────────────────────────┬────────────────────────┘   │
└──────────┼──────────────────────────────┼────────────────────────────┘
           ▼                              ▼
┌────────────────────┐      ┌──────────────────────┐
│  PostgreSQL 17     │      │  Redis 8             │
│  Port 5433         │      │  Port 6381           │
│  28 Prisma models  │      │  Cache + BullMQ      │
└────────────────────┘      └──────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `AppModule` | Root module — wires all domain modules, global guards, interceptors | `apps/api/src/app.module.ts` |
| `AuthModule` | JWT authentication, login, token refresh, audit logging | `apps/api/src/modules/auth/` |
| `RolesModule` | RBAC role and permission CRUD | `apps/api/src/modules/roles/` |
| `UsersModule` | App user management (system accounts) | `apps/api/src/modules/users/` |
| `DirectoryModule` | Employee directory management, CSV import, groups | `apps/api/src/modules/directory/` |
| `OrganizationModule` | Multi-tier hierarchy: organizations, departments, positions, locations | `apps/api/src/modules/organization/` |
| `AssetsModule` | Hardware asset tracking, categories, assignment, QR codes | `apps/api/src/modules/assets/` |
| `LicensesModule` | Software license lifecycle, assignments, expiry tracking | `apps/api/src/modules/licenses/` |
| `InventoryModule` | General inventory items, categories, vendors, stock tracking | `apps/api/src/modules/inventory/` |
| `NetworkModule` | VLANs, subnets, IP addresses, network credentials | `apps/api/src/modules/network/` |
| `AuditModule` | Audit log querying and export | `apps/api/src/modules/audit/` |
| `ReportsModule` | Report generation and scheduling | `apps/api/src/modules/reports/` |
| `DashboardModule` | Aggregated statistics and recent activity | `apps/api/src/modules/dashboard/` |
| `SearchModule` | Global search via MeiliSearch with DB fallback | `apps/api/src/modules/search/` |
| `NotificationsModule` | Real-time WebSocket notifications + scheduled alerts | `apps/api/src/modules/notifications/` |
| `SettingsModule` | System settings, backup management, system info | `apps/api/src/modules/settings/` |
| `HealthModule` | System health checks (DB + Redis probes) | `apps/api/src/modules/health/` |

## Pattern Overview

**Overall:** Modular Monolith with Layered Architecture

**Key Characteristics:**
- NestJS module system enforces domain boundaries — each domain is a self-contained module
- Controller → Service → Repository (Prisma) layered pattern
- Shared types/validators/utils extracted to `packages/*` workspace packages
- React SPA with page-based routing, Zustand stores, and service-layer API clients
- Global guards enforce authentication and authorization on all routes by default
- `@Public()` decorator opts specific routes out of auth

## Layers

**Presentation Layer (Frontend):**
- Purpose: User interface rendering, client-side routing, state management
- Location: `apps/web/src/`
- Contains: React pages, components, layouts, stores, hooks, services
- Depends on: API backend via Axios HTTP + Socket.IO WebSocket
- Pattern: Lazy-loaded route pages wrapped in `Suspense` with `ErrorBoundary`

**Controller Layer (API):**
- Purpose: HTTP routing, request validation, Swagger documentation
- Location: `apps/api/src/modules/*/controller.ts`
- Contains: Route handlers with decorators (`@Get`, `@Post`, `@Roles`, `@ApiOperation`)
- Depends on: Service layer only
- Used by: HTTP clients via `/api/v1/*` prefix

**Service Layer (API):**
- Purpose: Business logic, data orchestration, domain rules
- Location: `apps/api/src/modules/*/service.ts`
- Contains: Domain operations, Prisma queries, validation logic
- Depends on: PrismaService, RedisService, other module services
- Used by: Controllers, scheduled workers, WebSocket gateway

**Data Layer (API):**
- Purpose: Database access, caching
- Location: `apps/api/src/database/`, `apps/api/src/common/redis/`
- Contains: `PrismaService` (global), `RedisService` (global with fallback)
- Depends on: PostgreSQL, Redis
- Used by: All service classes

**Cross-Cutting Layer (API):**
- Purpose: Authentication, authorization, audit, error handling, response transformation
- Location: `apps/api/src/common/`
- Contains: Guards, interceptors, filters, decorators, DTOs
- Applied globally via `APP_GUARD` and `APP_INTERCEPTOR` in `AppModule`

## Data Flow

### Primary REST Request Path

1. Client sends HTTPS request → Vite proxy / Nginx → NestJS (`apps/api/src/main.ts`)
2. `ThrottlerGuard` checks rate limit (1000 req/60s) (`apps/api/src/app.module.ts`)
3. `JwtAuthGuard` verifies JWT token unless `@Public()` (`apps/api/src/common/guards/jwt-auth.guard.ts`)
4. `RolesGuard` validates user role against `@Roles()` (`apps/api/src/common/guards/roles.guard.ts`)
5. `PermissionsGuard` validates permissions against `@RequirePermissions()` (`apps/api/src/common/guards/permissions.guard.ts`)
6. Controller method invoked with validated DTO (`class-validator` + `class-transformer`)
7. Service performs business logic with Prisma queries
8. `TransformInterceptor` wraps response as `{ success: true, data: T, timestamp: string }` (`apps/api/src/common/interceptors/transform.interceptor.ts`)
9. `AuditInterceptor` logs operation to `AuditLog` model (`apps/api/src/common/interceptors/audit.interceptor.ts`)

### WebSocket Notification Flow

1. Client connects to `/notifications` namespace with `auth.token` (`apps/web/src/hooks/useRealtimeNotifications.ts`)
2. `NotificationsGateway.handleConnection` verifies JWT (`apps/api/src/modules/notifications/notifications.gateway.ts`)
3. Authenticated socket joins user-specific room
4. Server-side events (CRUD, alerts) trigger `NotificationsService.emit()` → broadcasts to user room
5. Client receives real-time notification via Socket.IO event

### Scheduled Alert Flow

1. `@Cron('0 0 * * *')` triggers `ScheduledAlertsWorker.handleScheduledAlerts()` (`apps/api/src/modules/notifications/scheduled-alerts.worker.ts`)
2. Queries expiring licenses/warranties from PostgreSQL
3. Checks Redis cache to prevent duplicate alerts
4. Creates `Notification` records and emits WebSocket events

**State Management (Frontend):**
- Server state: TanStack Query (`queryClient` in `apps/web/src/app/query-client.ts`) with automatic caching/invalidation
- Auth state: Zustand store (`apps/web/src/stores/auth.store.ts`) — user, tokens, permissions
- Theme state: Zustand store (`apps/web/src/stores/theme.store.ts`) — dark/light mode, presets
- Notification preferences: Zustand store (`apps/web/src/stores/notification-settings.store.ts`)
- Timezone: Zustand store (`apps/web/src/stores/timezone.store.ts`)

## Key Abstractions

**Response Envelope:**
- Purpose: Consistent API response format
- Implementation: `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts`)
- Pattern: `{ success: true, data: T, timestamp: string }`

**Pagination:**
- Purpose: Bounded database queries with consistent pagination
- Implementation: `PaginationDto` (`apps/api/src/common/dto/pagination.dto.ts`) — `page` (default 1), `limit` (default 10)

**Access Control Decorators:**
- `@Public()` — Marks route as unauthenticated (`apps/api/src/common/decorators/public.decorator.ts`)
- `@Roles('Admin', 'Super Admin')` — Role-based access (`apps/api/src/common/decorators/roles.decorator.ts`)
- `@RequirePermissions('asset:read')` — Permission-based access (`apps/api/src/common/decorators/require-permissions.decorator.ts`)
- `@ClientIP()` — Extract client IP from request headers (`apps/api/src/common/decorators/client-ip.decorator.ts`)

**PageContainer (Frontend):**
- Purpose: Consistent page layout with title, subtitle, breadcrumbs, stats, and actions
- Implementation: `PageContainer` component (`apps/web/src/components/PageContainer.tsx`)

## Entry Points

**API Server:**
- Location: `apps/api/src/main.ts`
- Bootstrap: Creates NestJS app, configures CORS, Helmet, Swagger, global pipes/filters
- Listens on: `APP_PORT` env (default 3002)

**Web SPA:**
- Location: `apps/web/src/main.tsx` → `apps/web/src/app/index.tsx`
- Bootstrap: Renders `<App>` with QueryClientProvider, ConfigProvider (Ant Design), RouterProvider
- Routing: `apps/web/src/app/router.tsx` — `createBrowserRouter` with lazy-loaded pages

**Prisma Seed:**
- Location: `apps/api/prisma/seed.ts`
- Seeders: `apps/api/prisma/seeders/` (organization seeder, etc.)

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop; no worker threads detected
- **Global state:** `PrismaService` and `RedisService` are global singleton modules (`@Global()`)
- **Circular imports:** No circular dependencies detected between stores and services
- **Module boundaries:** Each NestJS module encapsulates its own controller, service, DTOs, and specs
- **API prefix:** All REST routes under `/api/v1/*` via `app.setGlobalPrefix('api/v1')`
- **WebSocket namespace:** `/notifications` only

## Anti-Patterns

### Static Ant Design Feedback Calls

**What happens:** Importing `message` or `Modal` directly from `antd` and calling static methods
**Why it's wrong:** Static methods bypass `<App>` theme context, dark mode, and React 19 concurrent mode
**Do this instead:** Use `const { message, modal, notification } = App.useApp()` inside components rendered under `<App>`

### Unbounded Database Queries

**What happens:** Calling `findMany()` without `take` parameter
**Why it's wrong:** Loads entire tables into Node.js memory; causes OOM on large datasets
**Do this instead:** Always specify `take: Math.min(limit, 100)` with `orderBy` for deterministic pagination

## Error Handling

**Strategy:** Layered error handling with global filters

**Patterns:**
- `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`) — Catches and formats NestJS HTTP exceptions
- `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) — Translates Prisma errors (unique constraint, not found) to HTTP responses
- Frontend `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`) — Catches unhandled React errors with recovery UI
- Route-level `RouteErrorBoundary` (`apps/web/src/components/RouteErrorBoundary.tsx`) — Per-route error isolation
- `ErrorResultView` (`apps/web/src/components/ErrorResultView.tsx`) — Reusable error display component

## Cross-Cutting Concerns

**Logging:** NestJS `Logger` class — `private readonly logger = new Logger(ClassName.name)` in every service/controller
**Validation:** `class-validator` decorators on DTOs (API) + Zod schemas in `packages/shared-validators` (shared)
**Authentication:** JWT via Passport with global `JwtAuthGuard` + `@Public()` opt-out
**Authorization:** Role-based (`@Roles()`) + Permission-based (`@RequirePermissions()`) via global guards
**Rate Limiting:** `@nestjs/throttler` — 1000 requests per 60 seconds
**Security Headers:** `helmet` with HSTS preload
**Response Compression:** `compression` middleware
**Audit Trail:** `AuditInterceptor` — Global interceptor recording all mutations to `AuditLog`

---

*Architecture analysis: 2026-09-11*

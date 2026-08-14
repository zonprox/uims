<!-- refreshed: 2026-08-14 -->
# Architecture

**Analysis Date:** 2026-08-14

## System Overview

```
+---------------------------------------------------------------------------------------------------+
|                                          CLIENT TIER                                              |
|                                                                                                   |
|  React 19 SPA (`apps/web`)                                                                        |
|  ├── Core Engine: Vite 8 (`apps/web/vite.config.ts`), React Router v8 (`apps/web/src/app/router.tsx`)|
|  ├── UI Framework: Ant Design 6.6 (`apps/web/src/app/theme.ts`), @ant-design/pro-components       |
|  ├── Global State: Zustand 5 (`apps/web/src/stores/auth.store.ts`, `theme.store.ts`)              |
|  ├── Async Data: TanStack Query 5 (`apps/web/src/app/query-client.ts`)                            |
|  └── API Client: Axios Interceptor with Auto-Refresh Queue (`apps/web/src/services/api.ts`)       |
+---------------------------------------------------------------------------------------------------+
                                            │ HTTP/JSON (Port 5679 -> 3002)
                                            ▼
+---------------------------------------------------------------------------------------------------+
|                                      API & APPLICATION TIER                                       |
|                                                                                                   |
|  NestJS 11 Application (`apps/api`)                                                               |
|  ├── Entrypoint & Middleware: `apps/api/src/main.ts` (Helmet, Compression, CookieParser, CORS)   |
|  ├── Global Interceptors: `TransformInterceptor` (`apps/api/src/common/interceptors/transform...`)|
|  ├── Global Filters: `HttpExceptionFilter`, `PrismaExceptionFilter` (`apps/api/src/common/filters`)|
|  ├── Auth & Guard: `JwtAuthGuard`, `RolesGuard` (`apps/api/src/common/guards/`)                  |
|  └── Feature Modules:                                                                             |
|      ├── `AuthModule` (`apps/api/src/modules/auth/`)       ├── `AssetsModule` (`.../assets/`)     |
|      ├── `UsersModule` (`apps/api/src/modules/users/`)     ├── `LicensesModule` (`.../licenses/`)|
|      ├── `InventoryModule` (`.../inventory/`)              ├── `DirectoryModule` (`.../directory/`)|
|      ├── `EmailModule` (`.../email/`)                      ├── `NetworkModule` (`.../network/`)   |
|      ├── `TicketsModule` (`.../tickets/`)                  ├── `AuditModule` (`.../audit/`)       |
|      ├── `ReportsModule` (`.../reports/`)                  ├── `SettingsModule` (`.../settings/`) |
|      ├── `DashboardModule` (`.../dashboard/`)              ├── `SearchModule` (`.../search/`)     |
|      └── `HealthModule` (`.../health/`)                                                           |
+---------------------------------------------------------------------------------------------------+
                                 │                      │                     │
                  Prisma 7 (Adapter-pg)             REST Client           Redis Protocol
                                 │                      │                     │
                                 ▼                      ▼                     ▼
+------------------------------------+  +-------------------+  +------------------------------------+
|          PERSISTENCE TIER          |  |    SEARCH TIER    |  |        CACHE & QUEUE TIER          |
|                                    |  |                   |  |                                    |
|  PostgreSQL 17/18 (`uims_db`)      |  |  Meilisearch 1.12 |  |  Redis 8.8                         |
|  ├── Schema: `apps/api/prisma/`   |  |  (Multi-index     |  |  ├── Throttling / Rate Limiting    |
|  └── Service: `PrismaService`      |  |   global search)  |  |  └── BullMQ job queues             |
+------------------------------------+  +-------------------+  +------------------------------------+
                                                        │
                                                        ▼
                                        +------------------------------------+
                                        |          STORAGE TIER              |
                                        |                                    |
                                        |  SeaweedFS (S3-compatible gateway) |
                                        |  ├── Master (9333), Volume (8080)  |
                                        |  └── Filer / S3 (8888, 8333)       |
                                        +------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| API Entrypoint | Bootstraps NestJS, configures global pipes, filters, interceptors, CORS, Helmet, and Swagger | `apps/api/src/main.ts` |
| Root Module | Aggregates global configuration, throttling, database, and domain modules | `apps/api/src/app.module.ts` |
| Prisma Service | Manages database lifecycle, connection pooling via `@prisma/adapter-pg` | `apps/api/src/database/prisma.service.ts` |
| Auth Module | Authentication, JWT signing, password verification via bcrypt, profile lookup | `apps/api/src/modules/auth/auth.service.ts` |
| Asset Service | Hardware fleet lifecycle, relational category/location mapping, asset specs | `apps/api/src/modules/assets/assets.service.ts` |
| License Service | Software license seat tracking, unassigned/assigned seat allocation, expiry calculation | `apps/api/src/modules/licenses/licenses.service.ts` |
| Directory Service | Active Directory / LDAP synchronization, account status lifecycle | `apps/api/src/modules/directory/directory.service.ts` |
| Network Service | IPAM (IP Address Management), CIDR subnets, VLAN allocations, ping statuses | `apps/api/src/modules/network/network.service.ts` |
| Ticket Service | Helpdesk incident workflow, SLA deadlines, ticket comments stream | `apps/api/src/modules/tickets/tickets.service.ts` |
| Audit Service | SOC2 / ISO 27001 audit logging, differential payload capture, CSV exports | `apps/api/src/modules/audit/audit.service.ts` |
| Dashboard Service | Aggregate KPI rollups, health check telemetry, urgent action items | `apps/api/src/modules/dashboard/dashboard.service.ts` |
| Search Service | Unified fuzzy search across assets, tickets, licenses, and directory with DB fallback | `apps/api/src/modules/search/search.service.ts` |
| Settings Service | System configuration persistence, encrypted AES backup creation to S3 storage | `apps/api/src/modules/settings/settings.service.ts` |
| Frontend Shell | Layout skeleton, responsive Sider navigation, command palette, theme switcher | `apps/web/src/layouts/MainLayout.tsx` |
| Auth Guard (Web) | Protects private routes and manages unauthenticated redirect | `apps/web/src/layouts/AuthLayout.tsx` |
| API Interceptor | Manages Bearer tokens, token refresh queues, and handles 401 recovery | `apps/web/src/services/api.ts` |
| Auth Store | Persisted Zustand store containing active JWT access token and user identity | `apps/web/src/stores/auth.store.ts` |
| Theme Store | Persisted Zustand store containing theme mode (`dark` vs `light`) | `apps/web/src/stores/theme.store.ts` |
| Command Palette | Global search modal (`Cmd+K` / `Ctrl+K`) with live search and routing shortcuts | `apps/web/src/components/CommandPalette.tsx` |
| Shared Types | Centralized DTO definitions, database entities, and enums | `packages/shared-types/src/index.ts` |
| Shared Validators | Centralized Zod schema validators for API and UI forms | `packages/shared-validators/src/index.ts` |
| Shared Utils | Common string formatting, enum labels, date math, and validation utilities | `packages/shared-utils/src/index.ts` |

## Pattern Overview

**Overall:** Monorepo with Clean Layered NestJS Backend and Component-Driven React 19 Frontend.

**Key Characteristics:**
- **Shared Kernel Architecture:** `@uims/shared-types`, `@uims/shared-validators`, and `@uims/shared-utils` provide a single source of truth across both API and Web workspaces without code duplication.
- **Controller-Service-Repository Pattern:** Controllers handle HTTP routing and parameter validation, services encapsulate domain and business logic, and `PrismaService` handles persistence operations.
- **Fail-Safe Service Fallback:** In `SearchService`, Meilisearch is used for fast multi-index fuzzy search, but if unavailable or uninitialized, queries seamlessly fall back to PostgreSQL `ILIKE` operations.
- **Reactive Queueing on Auth Expiry:** The frontend Axios interceptor (`apps/web/src/services/api.ts`) queues concurrent in-flight requests during token refresh cycles, preventing race conditions or multiple refresh requests.
- **Strict Response Enveloping:** All API responses pass through `TransformInterceptor` to produce standard `{ success: true, data: T, timestamp: string }` structures, matched by `HttpExceptionFilter` on failure.

## Layers

**Client Presentation Layer:**
- Purpose: Delivers modern, responsive enterprise UI with Ant Design 6.6 and dark/light theme switching.
- Location: `apps/web/src/pages/`, `apps/web/src/layouts/`, `apps/web/src/components/`
- Contains: React components, Ant Design wrappers (`PageContainer`), navigation routers, modals, drawers.
- Depends on: `apps/web/src/services/`, `apps/web/src/stores/`, `@uims/shared-types`
- Used by: End users and administrators in the browser.

**Client State & Service Layer:**
- Purpose: Manages client-side identity, caching, and HTTP communication with API backend.
- Location: `apps/web/src/services/`, `apps/web/src/stores/`, `apps/web/src/hooks/`
- Contains: Axios HTTP services, Zustand stores (`auth.store.ts`, `theme.store.ts`), React hooks.
- Depends on: `@uims/shared-types`, `axios`, `zustand`
- Used by: Client presentation components.

**API Routing & Validation Layer:**
- Purpose: Exposes versioned REST endpoints (`/api/v1/*`), enforces rate-limiting, runs input validation, and checks route authentication.
- Location: `apps/api/src/main.ts`, `apps/api/src/modules/*/*.controller.ts`, `apps/api/src/common/guards/`, `apps/api/src/common/pipes/`
- Contains: NestJS Controllers, Swagger decorators, Zod validation pipes, Passport JWT guards, Roles guards.
- Depends on: `@uims/shared-types`, `@uims/shared-validators`, `@nestjs/passport`, `@nestjs/throttler`
- Used by: Frontend HTTP requests.

**Domain Service Layer:**
- Purpose: Implements business workflows, calculations, data formatting, and cross-entity transactions.
- Location: `apps/api/src/modules/*/*.service.ts`
- Contains: Injectable NestJS Services (`AssetsService`, `TicketsService`, `DashboardService`, etc.).
- Depends on: `apps/api/src/database/prisma.service.ts`, `@uims/shared-types`, `@uims/shared-utils`
- Used by: API Controllers.

**Database & Persistence Layer:**
- Purpose: Manages relational data persistence, schema migrations, and transactional integrity.
- Location: `apps/api/src/database/prisma.service.ts`, `apps/api/prisma/schema.prisma`
- Contains: Prisma client instance with `@prisma/adapter-pg`, migrations, seeders.
- Depends on: PostgreSQL database (`uims_db`).
- Used by: Domain Service Layer.

**Shared Package Layer:**
- Purpose: Distributes TypeScript interfaces, Zod validation schemas, and utility functions across the monorepo.
- Location: `packages/shared-types/`, `packages/shared-validators/`, `packages/shared-utils/`, `packages/eslint-config/`
- Contains: Pure TypeScript code compiled with `tsdown`.
- Depends on: `zod`, `dayjs`
- Used by: Both `apps/api` and `apps/web`.

## Data Flow

### Primary Request Path
1. **User Action:** User submits a form or navigates to a view (e.g., Asset list in `apps/web/src/pages/assets/AssetsPage.tsx:77`).
2. **Client Service Invocation:** `assetsService.getAssets(params)` is called in `apps/web/src/services/assets.service.ts:38`.
3. **HTTP Dispatch with Auth Interceptor:** Axios instance in `apps/web/src/services/api.ts:28` attaches the active JWT `Bearer` token from `useAuthStore.getState().token`.
4. **Network Proxy:** In local development, Vite proxies `/api` to the backend target (`apps/web/vite.config.ts:58`); in production, Nginx routes `/api` to `uims-api:3000` (`docker/nginx/nginx.conf`).
5. **API Guard & Middleware:** Request enters `apps/api/src/main.ts` through Helmet and CORS, hits `JwtAuthGuard` (`apps/api/src/modules/auth/auth.guard.ts:5`), and parses query parameters through `ValidationPipe`.
6. **Controller Dispatch:** `AssetsController.findAll()` receives query in `apps/api/src/modules/assets/assets.controller.ts:25`.
7. **Business & Persistence Processing:** `AssetsService.findAll()` in `apps/api/src/modules/assets/assets.service.ts:91` builds Prisma where conditions and executes `this.prisma.asset.findMany(...)`.
8. **Entity Transformation:** Raw Prisma entities are sanitized and formatted with `formatAsset()` in `apps/api/src/modules/assets/assets.service.ts:222`.
9. **Global Interceptor Packaging:** `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts:17`) wraps output in `{ success: true, data: [...], timestamp: ... }`.
10. **Client State Update:** The React page receives the response data payload and updates state / renders Ant Design components.

### Secondary Flow: Token Refresh Recovery Flow
1. API returns `401 Unauthorized` for an expired JWT token.
2. Axios response interceptor (`apps/web/src/services/api.ts:109`) captures error.
3. If not already refreshing, `api.post('/auth/refresh')` is dispatched; concurrent requests are placed in `failedQueue` (`apps/web/src/services/api.ts:46`).
4. Upon receiving the new token, Zustand `auth.store.ts` updates localStorage with the fresh access token.
5. All queued requests are re-executed with the new `Bearer` token.
6. If refresh fails, `handleAuthRedirect()` purges local state and navigates to `/login`.

### Secondary Flow: Global Search with Fallback
1. User presses `Cmd+K` / `Ctrl+K` and types a query in `CommandPalette.tsx:148`.
2. Frontend queries `GET /api/v1/search?q=...` (`apps/api/src/modules/search/search.controller.ts:18`).
3. `SearchService.search()` checks `isMeiliAvailable` (`apps/api/src/modules/search/search.service.ts:60`).
4. If Meilisearch is healthy, a multi-search query is executed against `assets`, `tickets`, `licenses`, and `users` indexes.
5. If Meilisearch is offline or fails, `searchDatabaseFallback()` executes parallel case-insensitive `findMany` queries across Prisma tables (`apps/api/src/modules/search/search.service.ts:152`).
6. Combined and ranked search results are returned to the client modal.

**State Management:**
- **Server State:** Handled via TanStack Query (`apps/web/src/app/query-client.ts`) and localized component state via `useState` / `useCallback`.
- **Client State:** Zustand stores with `persist` middleware storing state into `localStorage`:
  - `uims-auth-storage`: User object, active JWT token (`apps/web/src/stores/auth.store.ts:33`).
  - `uims-theme-mode`: Theme choice `'dark' | 'light'` (`apps/web/src/stores/theme.store.ts:18`).

## Key Abstractions

**`PrismaService`:**
- Purpose: Extends `PrismaClient` and registers with NestJS lifecycle hooks `onModuleInit` and `onModuleDestroy` for clean database connection teardown. Uses `@prisma/adapter-pg` for PostgreSQL connection pooling.
- Example: `apps/api/src/database/prisma.service.ts`

**`TransformInterceptor` & `ApiResponse<T>`:**
- Purpose: Normalizes all outbound HTTP controller responses into a uniform structure containing `success`, `data`, and ISO 8601 `timestamp`.
- Examples: `apps/api/src/common/interceptors/transform.interceptor.ts`, `packages/shared-types/src/dto/api-response.ts`

**`PageContainer`:**
- Purpose: Standardized layout container for all UI pages providing title, subtitle, breadcrumb navigation, actionable toolbar slot, and responsive KPI statistic cards.
- Example: `apps/web/src/components/PageContainer.tsx`

**`CommandPalette`:**
- Purpose: Global application launcher modal providing live fuzzy search across all entities and rapid navigation shortcuts.
- Example: `apps/web/src/components/CommandPalette.tsx`

**`ZodValidationPipe`:**
- Purpose: Custom NestJS pipe allowing endpoints to validate request bodies directly against `@uims/shared-validators` Zod schemas.
- Example: `apps/api/src/common/pipes/zod-validation.pipe.ts`

## Entry Points

**Backend API Application:**
- Location: `apps/api/src/main.ts`
- Triggers: Invoked by Node.js runtime (`node dist/main`) or `pnpm dev:api`. Starts HTTP listener on port `3000` (mapped to `3002` externally) with global prefix `api/v1`.

**Frontend Web Application:**
- Location: `apps/web/src/main.tsx`
- Triggers: Loaded by browser from `apps/web/index.html`. Initializes React DOM root, mounts `App` component with Ant Design `ConfigProvider` and `RouterProvider`.

**Database Seeder:**
- Location: `apps/api/prisma/seed.ts`
- Triggers: Invoked via `pnpm db:seed` or `prisma db seed`. Seeds default roles, users, assets, licenses, tickets, and network records.

## Architectural Constraints

- **Single-Threaded Node.js Runtime:** All heavy I/O is asynchronous with Promises/async-await. Heavy background tasks must be delegated to BullMQ queues (`@nestjs/bullmq`).
- **Stateless API:** API containers maintain no in-memory session state; all authentication state resides in signed JWTs and database/Redis.
- **Relational Integrity:** All entity relations (User -> Asset, Ticket -> Comments, License -> Assignments) use foreign key constraints managed by Prisma in PostgreSQL.
- **Monorepo Package Isolation:** Shared code must reside in `packages/*` and must not depend on `apps/*`. Workspace dependencies use `workspace:*` references.

## Anti-Patterns

### Anti-Pattern 1: Direct SQL or Raw Querying in Controllers
**What happens:** Writing Prisma queries or direct database logic inside NestJS controllers.
**Why it's wrong:** Violates separation of concerns, breaks modular testability, and prevents response formatting reuse.
**Do this instead:** Keep controllers thin (routing, parameter mapping) and place all persistence logic in injectable Services.

### Anti-Pattern 2: Hardcoding Absolute URLs in Frontend Services
**What happens:** Making Axios calls directly to `http://localhost:3002/api/v1/assets`.
**Why it's wrong:** Breaks in Docker container networking, production deployments behind reverse proxies, and HTTPS environments.
**Do this instead:** Use the centralized `api` Axios client with relative path `/api/v1` (`apps/web/src/services/api.ts`), letting Vite or Nginx proxy the requests.

### Anti-Pattern 3: Duplicating Type Definitions Across Apps
**What happens:** Manually declaring duplicate interfaces in `apps/api` and `apps/web`.
**Why it's wrong:** Causes schema divergence, typing bugs, and maintenance overhead.
**Do this instead:** Export all DTOs and entities in `packages/shared-types` and import them via `@uims/shared-types`.

### Anti-Pattern 4: Unprotected Global Search Without Database Fallback
**What happens:** Directly invoking Meilisearch without health verification or try/catch fallback.
**Why it's wrong:** Causes search outages whenever Meilisearch is restarting or offline.
**Do this instead:** Follow the pattern in `SearchService` (`apps/api/src/modules/search/search.service.ts`) which verifies Meilisearch connectivity and falls back to PostgreSQL `findMany` queries.

## Error Handling

**Strategy:** Centralized Exception Filter Pipeline
1. **HTTP Exceptions:** Caught by `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`), transformed into uniform JSON with `success: false`, `statusCode`, `message`, and `timestamp`.
2. **Database Exceptions:** Known Prisma database errors (such as `P2002` unique constraint violations) are intercepted by `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) and translated to `409 Conflict` or appropriate HTTP status codes.
3. **Frontend Error Boundary:** React components are wrapped in `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`) to catch unhandled rendering exceptions without crashing the full application shell.

## Cross-Cutting Concerns

**Logging:**
- Backend uses NestJS built-in `Logger` and `pino` / `pino-http` for structured JSON request logging.
- System and user mutations are recorded to the immutable `AuditLog` database table via `AuditService.logEvent()` (`apps/api/src/modules/audit/audit.service.ts:51`).

**Validation:**
- Runtime input validation is handled by NestJS `ValidationPipe` with `{ whitelist: true, transform: true }` on class DTOs.
- Zod schema validation is provided via `@uims/shared-validators` and `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`).

**Authentication & Authorization:**
- Authentication is handled via Passport JWT strategy (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`).
- Route authorization is enforced via `@UseGuards(JwtAuthGuard)` and `@UseGuards(RolesGuard)` with the `@Roles(...)` metadata decorator (`apps/api/src/common/decorators/roles.decorator.ts`).
- Rate limiting is applied globally and on auth endpoints (`@Throttle({ default: { limit: 5, ttl: 60000 } })`) via `@nestjs/throttler`.

---
*Architecture analysis: 2026-08-14*

<!-- refreshed: 2026-08-15 -->
# Architecture

**Analysis Date:** 2026-08-15

## System Overview

```text
+----------------------------------------------------------------------------------------------------+
|                                           CLIENT LAYER                                             |
|                                                                                                    |
|   React 19 SPA + Ant Design v6 + TanStack Query v5 + Zustand v5                                    |
|   Location: apps/web/src/                                                                          |
|   Entry: apps/web/src/main.tsx -> apps/web/src/app/App.tsx -> apps/web/src/app/router.tsx          |
+-------------------------------------------------+--------------------------------------------------+
                                                  | HTTPS / REST (Port 5679 /api/v1)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                   REVERSE PROXY & GATEWAY LAYER                                    |
|                                                                                                    |
|   Nginx 1.27 (TLS 1.2/1.3 Termination, HTTP/2 Multiplexing, SPA Serving, API Reverse Proxy)       |
|   Location: docker/nginx/nginx.conf                                                                |
+-------------------------------------------------+--------------------------------------------------+
                                                  | HTTP Forward (Internal Port 3000 / Host Port 3002)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                       BACKEND APPLICATION LAYER                                    |
|                                                                                                    |
|   NestJS 11 Modular Monolith (Dependency Injection, Global Guards, Interceptors, Filters)          |
|   Location: apps/api/src/                                                                          |
|   Entry: apps/api/src/main.ts -> apps/api/src/app.module.ts                                        |
|                                                                                                    |
|   +--------------------------------------------------------------------------------------------+   |
|   | Global Pipeline:                                                                           |   |
|   | - ThrottlerGuard (Rate Limiting)                  apps/api/src/app.module.ts               |   |
|   | - JwtAuthGuard (Global JWT Security)               apps/api/src/common/guards/jwt-auth.guard.ts|   |
|   | - RolesGuard (RBAC Authorization)                 apps/api/src/common/guards/roles.guard.ts   |   |
|   | - AuditInterceptor (Automatic Mutation Logging)   apps/api/src/common/interceptors/audit...   |   |
|   | - TransformInterceptor (Envelope Wrapping)         apps/api/src/common/interceptors/transform..|   |
|   | - HttpExceptionFilter & PrismaExceptionFilter     apps/api/src/common/filters/                |   |
|   +--------------------------------------------------------------------------------------------+   |
|                                                                                                    |
|   +--------------------------------------- FEATURE MODULES ------------------------------------+   |
|   | AuthModule          | UsersModule        | AssetsModule       | LicensesModule             |   |
|   | InventoryModule     | DirectoryModule    | NetworkModule      | TicketsModule              |   |
|   | AuditModule         | ReportsModule      | SettingsModule     | DashboardModule            |   |
|   | HealthModule        | SearchModule       | NotificationsModule| PrismaModule               |   |
|   +--------------------------------------------------------------------------------------------+   |
+------------------------+-------------------------------+--------------------------+----------------+
                         |                               |                          |
                         v                               v                          v
+--------------------------------+ +-----------------------------+ +---------------------------------+
|        PRIMARY DATABASE        | |         CACHE LAYER         | |         SEARCH ENGINE           |
|                                | |                             | |                                 |
| PostgreSQL 17 via Prisma Pg    | | Redis 8 (Alpine)            | | MeiliSearch 1.12                |
| Location: apps/api/prisma/     | | Port: 6381 (Internal: 6379) | | Port: 7700                      |
| schema.prisma                  | | Throttling & Session Cache  | | Multi-index Full Text Search    |
+--------------------------------+ +-----------------------------+ +---------------------------------+
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root App Component | Mounts React Query, Ant Design `ConfigProvider` with custom enterprise theme token builders, and React Router | `apps/web/src/app/App.tsx` |
| Client Router | Declares browser routes, lazy code-splitting chunks, auth guard layout wrapping, and fallback loaders | `apps/web/src/app/router.tsx` |
| Main Layout Shell | Renders responsive collapsible navigation sidebar, mobile drawer, command palette, live telemetry polling, and user actions | `apps/web/src/layouts/MainLayout.tsx` |
| API Axios Client | Axios HTTP client with automatic Bearer token injection and seamless 401 refresh queue handling | `apps/web/src/services/api.ts` |
| Auth Store | Manages user session state and token persistence in localStorage via Zustand | `apps/web/src/stores/auth.store.ts` |
| Theme Store | Manages theme mode (dark/light), compact UI mode, border radius, and primary color palettes via Zustand | `apps/web/src/stores/theme.store.ts` |
| API Bootstrap | Initializes NestJS runtime, Swagger OpenAPI documentation at `/api/v1/docs`, Helmet, CORS, and compression | `apps/api/src/main.ts` |
| App Module Root | Defines dependency injection graph, global guards (`ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`), and interceptors | `apps/api/src/app.module.ts` |
| Prisma Database Layer | Manages PostgreSQL database connection pool via `@prisma/adapter-pg` driver adapter | `apps/api/src/database/prisma.service.ts` |
| Auth Service & Controller | Handles user credential validation (bcrypt), JWT issuance, and token refresh | `apps/api/src/modules/auth/auth.service.ts` |
| Asset Service | Manages IT hardware asset lifecycle, auto-generates asset tags (`AST-XXXX`), links locations/categories, tracks asset history | `apps/api/src/modules/assets/assets.service.ts` |
| Search Service | Unified search aggregator querying MeiliSearch indices (`assets`, `tickets`, `licenses`, `users`) with PostgreSQL ILIKE fallback | `apps/api/src/modules/search/search.service.ts` |
| Health Controller | Exposes `/api/v1/health` with system uptime, process memory RSS/heap, and live database latency telemetry | `apps/api/src/modules/health/health.controller.ts` |
| Dashboard Service | Aggregates real-time KPIs, sub-system health statuses, recent audit activities, and operational action items | `apps/api/src/modules/dashboard/dashboard.service.ts` |
| Audit Interceptor | Intercepts all mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`), redacts credentials, and writes structured audit logs | `apps/api/src/common/interceptors/audit.interceptor.ts` |
| Transform Interceptor | Enforces standard API response structure `{ success: true, data: T, timestamp: string }` across all endpoints | `apps/api/src/common/interceptors/transform.interceptor.ts` |
| Exception Filters | Catches and standardizes both NestJS HTTP exceptions and Prisma database errors (`P2002`, `P2025`, `P2003`) | `apps/api/src/common/filters/http-exception.filter.ts` |
| Shared DTOs & Entities | Defines domain contracts, entities, DTOs, and enums shared across web and api workspaces | `packages/shared-types/src/index.ts` |
| Shared Validators | Exports runtime Zod validation schemas for unified client and server validation | `packages/shared-validators/src/index.ts` |
| Shared Utilities | Pure helper functions for enum label mapping, date formatting, currency display, and string transformations | `packages/shared-utils/src/index.ts` |

## Pattern Overview

**Overall:** Modular Monolith with Clean Layered Architecture and Workspace Package Sharing

**Key Characteristics:**
- **Monorepo Architecture**: Managed via Turborepo (`turbo.json`) and pnpm workspaces (`pnpm-workspace.yaml`), sharing TypeScript contracts, validation schemas, and utilities between backend and frontend without build overhead.
- **Modular Domain Segregation**: Backend business logic is organized into 15 isolated NestJS modules (`apps/api/src/modules/*`), each owning its domain service, controller, and DTO definitions.
- **Decoupled Data Access**: Controllers never execute raw queries; all database operations go through Prisma Client encapsulated within injectable domain services (`apps/api/src/database/prisma.service.ts`).
- **Resilient Search Fallback**: `SearchService` operates against MeiliSearch for fast multi-index fuzzy search, but seamlessly degrades to PostgreSQL `findMany` with `mode: 'insensitive'` queries when MeiliSearch is unreachable.
- **Fail-Safe Automatic Audit Trail**: Global `AuditInterceptor` captures all state-changing HTTP requests, redacting sensitive tokens and passwords before persisting them to the `AuditLog` table.
- **Strict Response Invariant**: All successful responses conform to `{ success: true, data: T, timestamp: string }` via `TransformInterceptor`, and all errors conform to `{ success: false, statusCode: number, message: string, timestamp: string }` via `HttpExceptionFilter` and `PrismaExceptionFilter`.

## Layers

**Client Layer (Presentation & UI):**
- Purpose: Delivers modern, reactive enterprise SPA user interfaces with rich data tables, drawers, modals, charts, and command palette navigation.
- Location: `apps/web/src/`
- Contains: React components, Ant Design UI compositions, custom hooks, Zustand stores, and Axios services.
- Depends on: `packages/shared-types`, `packages/shared-validators`, `packages/shared-utils`.
- Used by: End users, IT administrators, helpdesk operators, and system auditors via web browser.

**Reverse Proxy / Infrastructure Layer:**
- Purpose: Terminates SSL/TLS certificates, serves static web assets, forwards API traffic to backend containers, and sets security headers.
- Location: `docker/nginx/` and `docker-compose.yml`
- Contains: Nginx configuration (`docker/nginx/nginx.conf`), PostgreSQL initialization SQL (`docker/postgres/init.sql`).
- Depends on: Docker runtime environment.
- Used by: Web browsers connecting to HTTPS port `5679`.

**API Controller Layer (HTTP Interface):**
- Purpose: Accepts incoming HTTP requests, performs parameter validation, enforces authentication and RBAC guards, and delegates to services.
- Location: `apps/api/src/modules/*/*.controller.ts`
- Contains: NestJS `@Controller()` classes with Swagger OpenAPI annotations (`@ApiTags`, `@ApiOperation`).
- Depends on: Domain services, `@uims/shared-types`, NestJS core decorators.
- Used by: HTTP clients via Axios, Swagger UI at `/api/v1/docs`.

**Domain Service Layer (Business Logic):**
- Purpose: Encapsulates business rules, database transactions, telemetry calculations, third-party integrations, and data transformations.
- Location: `apps/api/src/modules/*/*.service.ts`
- Contains: NestJS `@Injectable()` classes.
- Depends on: `PrismaService`, `ConfigService`, `@uims/shared-types`, `@uims/shared-utils`.
- Used by: API Controllers and global interceptors.

**Persistence & Data Layer:**
- Purpose: Manages relational data schema, migrations, connection pooling, and database queries.
- Location: `apps/api/prisma/` and `apps/api/src/database/`
- Contains: `schema.prisma`, SQL migration scripts, database seeders (`apps/api/prisma/seeders/*`), and `PrismaService`.
- Depends on: PostgreSQL 17 instance via `@prisma/adapter-pg`.
- Used by: Domain services in `apps/api/src/modules/`.

**Shared Workspace Packages:**
- Purpose: Ensures single source of truth for TypeScript types, enums, runtime validation rules, and helper utilities.
- Location: `packages/` (`packages/shared-types`, `packages/shared-validators`, `packages/shared-utils`, `packages/eslint-config`).
- Contains: Pure TypeScript interfaces, DTO definitions, Zod schemas, formatting functions.
- Depends on: Zod (for validators). Zero runtime dependencies for shared types and utils.
- Used by: Both `apps/api` and `apps/web`.

## Data Flow

### Primary Request Path
1. **User Action / HTTP Request**: Browser initiates a request (e.g. `POST /api/v1/assets`) via `api.ts` (`apps/web/src/services/api.ts`).
2. **Reverse Proxy Routing**: Nginx receives HTTPS traffic on port 5679, terminates SSL, and forwards `/api/` traffic to the NestJS API container on port 3000 (`docker/nginx/nginx.conf`).
3. **Global Rate Limiting**: `ThrottlerGuard` checks Redis/memory counters to prevent abuse (`apps/api/src/app.module.ts`).
4. **Authentication & Authorization**: `JwtAuthGuard` validates the Bearer token in the `Authorization` header (`apps/api/src/modules/auth/auth.guard.ts`), and `RolesGuard` checks the `@Roles()` decorator metadata against user role claims (`apps/api/src/common/guards/roles.guard.ts`).
5. **Input Validation**: `ValidationPipe` parses and sanitizes request DTOs against class validators and shared types (`apps/api/src/main.ts`).
6. **Controller Dispatch**: Route handler in `AssetsController` receives validated parameters and calls `AssetsService.create()` (`apps/api/src/modules/assets/assets.controller.ts`).
7. **Business Logic & Transaction**: `AssetsService` resolves category/location foreign keys and executes atomic creation and history recording within `prisma.$transaction()` (`apps/api/src/modules/assets/assets.service.ts`).
8. **Audit Interception**: `AuditInterceptor` captures the request method and body, scrubs sensitive fields, and asynchronously logs the action to `AuditLog` (`apps/api/src/common/interceptors/audit.interceptor.ts`).
9. **Response Transformation**: `TransformInterceptor` wraps the returned entity into `{ success: true, data: ..., timestamp: ... }` (`apps/api/src/common/interceptors/transform.interceptor.ts`).
10. **Client State Update**: React Query invalidates cached queries and updates UI tables and stat bars (`apps/web/src/pages/assets/hooks/useAssetManagement.ts`).

### State Management
- **Server Cache & Async Queries**: Managed via TanStack React Query (`apps/web/src/app/query-client.ts`) with automatic cache invalidation and query deduplication.
- **Client Session State**: Managed via Zustand store `useAuthStore` (`apps/web/src/stores/auth.store.ts`), persisted to `localStorage` under `uims-auth-storage`.
- **UI & Theme Preferences**: Managed via Zustand store `useThemeStore` (`apps/web/src/stores/theme.store.ts`), persisted to `localStorage` under `uims-theme-settings`.
- **Form & Page State**: Managed using Ant Design `Form.useForm()` instances coupled with domain hooks (e.g. `useAssetManagement`).

## Key Abstractions

**Prisma Service Database Adapter:**
- Purpose: Wraps PrismaClient with the official `@prisma/adapter-pg` driver adapter for PostgreSQL 17 connection management and lifecycle hooks (`OnModuleInit`, `OnModuleDestroy`).
- Examples: `apps/api/src/database/prisma.service.ts`.

**Unified Response Envelope (`Response<T>`):**
- Purpose: Enforces consistent JSON envelope across all endpoints for predictable client consumption.
- Examples: `apps/api/src/common/interceptors/transform.interceptor.ts`, `packages/shared-types/src/dto/api-response.ts`.

**Custom Param Decorators:**
- Purpose: Injects authenticated user context and public route metadata into controller handlers.
- Examples: `@CurrentUser()` (`apps/api/src/common/decorators/current-user.decorator.ts`), `@Public()` (`apps/api/src/common/decorators/public.decorator.ts`), `@Roles()` (`apps/api/src/common/decorators/roles.decorator.ts`).

**Search Service Fallback Strategy:**
- Purpose: Abstracts multi-index search across disparate entities (`Asset`, `Ticket`, `License`, `DirectoryUser`) with automatic health checking and fallback from MeiliSearch to PostgreSQL.
- Examples: `apps/api/src/modules/search/search.service.ts`.

**Page Container Component (`<PageContainer>`):**
- Purpose: Standardizes enterprise page structure with unified header, breadcrumb navigation, stat summary badges, and action buttons.
- Examples: `apps/web/src/components/PageContainer.tsx`.

## Entry Points

**Backend API Entry Point:**
- Location: `apps/api/src/main.ts`
- Triggers: Node.js startup via `pnpm dev:api` or Docker container boot (`node dist/main.js`). Initializes NestJS application, sets global middleware, pipes, filters, Swagger docs, and listens on port 3000.

**Frontend Web Entry Point:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser loading `index.html`. Initializes React 19 root, mounts font styles and `App` root component.

**Database Seeder Entry Point:**
- Location: `apps/api/prisma/seed.ts`
- Triggers: Invoked via `pnpm db:seed`. Clears existing data and executes modular seeders for roles, taxonomy, assets, licenses, inventory, directory, network, tickets, audit logs, and settings.

**Reverse Proxy Entry Point:**
- Location: `docker/nginx/nginx.conf`
- Triggers: Docker container startup for `uims-web`. Listens on port 443 (mapped to 5679) with SSL termination, serving the SPA and proxying `/api/` requests to `uims-api:3000`.

## Architectural Constraints
- **Threading Model**: Single-threaded Node.js event loop with asynchronous I/O (libuv). Heavy computational tasks or report generation should be queued or delegated to worker threads.
- **Global State**: Backend runs stateless across requests. Session state is stored in JWT tokens; transient counters (rate limits) reside in Redis. Frontend global state is managed via Zustand stores with `localStorage` persistence.
- **Language Policy**: 100% English across all UI text, API responses, code comments, and database schemas.
- **API Prefix Invariant**: All REST endpoints are prefixed with `/api/v1`.

## Anti-Patterns

### Direct Prisma Invocations in Controllers
**What happens:** Calling `prisma.asset.findMany()` directly inside controller route methods.
**Why it's wrong:** Couples transport layer to database queries, prevents reusability, bypasses transaction logic, and hinders unit testing.
**Do this instead:** Always delegate database operations to an injectable domain service (`AssetsService`).

### Static Ant Design Feedback Methods
**What happens:** Using static `message.success()` or `Modal.confirm()` directly from the top-level `antd` package import.
**Why it's wrong:** Bypasses Ant Design v6 dynamic theme context, fails in dark mode styling, and triggers console runtime warnings.
**Do this instead:** Always retrieve dynamic feedback instances via `const { message, modal, notification } = App.useApp();`.

### Deprecated Ant Design Style Properties
**What happens:** Using `bodyStyle` on Card/Drawer or `valueStyle` on Statistic components.
**Why it's wrong:** Deprecated in Ant Design v6 and removed in future major releases.
**Do this instead:** Use `styles={{ body: { ... } }}` and `styles={{ content: { ... } }}`.

### Unhandled MeiliSearch Outages
**What happens:** Throwing unhandled exceptions when MeiliSearch search endpoint fails or is offline.
**Why it's wrong:** Breaks the global command palette and search functionality for all users.
**Do this instead:** Implement fallback to PostgreSQL `searchDatabaseFallback` using `mode: 'insensitive'` ILIKE queries as done in `apps/api/src/modules/search/search.service.ts`.

## Error Handling
**Strategy:** Multi-tier standardized exception catching and transformation.
- **Application Exceptions**: Services throw standard NestJS HTTP exceptions (`NotFoundException`, `UnauthorizedException`, `BadRequestException`).
- **HTTP Exception Filter**: `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`) catches all `HttpException` instances and transforms them into `{ success: false, statusCode, message, errors?, timestamp }`.
- **Database Error Filter**: `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) intercepts Prisma client errors (`P2002` duplicate unique key -> 409 Conflict, `P2025` record not found -> 404 Not Found, `P2003` foreign key violation -> 400 Bad Request) and outputs descriptive user-safe error messages.
- **Frontend Error Boundary**: React `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`) wraps the router `<Outlet />` to catch rendering exceptions gracefully without crashing the whole application.
- **Network & 401 Interception**: Axios response interceptor (`apps/web/src/services/api.ts`) catches 401 errors and attempts token refresh before redirecting to `/login`.

## Cross-Cutting Concerns
**Logging:**
- NestJS built-in `Logger` is used for application lifecycle, bootstrap, and search fallback diagnostics (`apps/api/src/main.ts`, `apps/api/src/modules/search/search.service.ts`).
- `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) records all mutating HTTP operations into the `AuditLog` database table with user identity, client IP, action, entity name, and sanitized JSON diff payloads.

**Validation:**
- Runtime input validation is performed using class-validator and Zod schemas (`packages/shared-validators/src/*`).
- Global `ValidationPipe` with `whitelist: true, transform: true` is enabled in NestJS bootstrap.
- Custom `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`) validates request bodies against shared Zod schemas.

**Authentication & Authorization:**
- Authentication is token-based using JSON Web Tokens (JWT) signed with `JWT_SECRET`.
- Global `JwtAuthGuard` verifies JWTs for all routes by default, except routes marked with `@Public()`.
- Role-based Access Control (RBAC) is enforced by `RolesGuard` matching user role claims against values set in `@Roles('Admin', 'Super Admin')`.
- Password hashing is enforced via bcrypt with salt rounds (`apps/api/src/common/utils/password.util.ts`).

---

*Architecture analysis: 2026-08-15*

# Architecture

**Analysis Date:** 2026-08-14

## Pattern Overview

**Overall:** Modular Monolith Architecture with Monorepo Package Splitting (Turborepo + pnpm)

**Key Characteristics:**
- **Layered Monolithic Backend:** Built with NestJS (`apps/api`) organized around domain modules (Assets, Licenses, Directory, Network, Tickets, Audit, Email, Inventory, Reports, Settings, Auth).
- **Single Page Application (SPA):** Built with React 19, React Router v8, Ant Design 6, and TanStack Query (`apps/web`).
- **Shared Contracts:** Centralized type definitions (`packages/shared-types`), Zod validation schemas (`packages/shared-validators`), and shared formatting helpers (`packages/shared-utils`).
- **Contract-First & Interceptor Pipeline:** Standardized REST JSON envelope (`{ success: true, data: ..., timestamp: ... }`) enforced globally across all endpoints.

## Layers

**1. Presentation Layer (`apps/web`):**
- Purpose: Render enterprise administrative interface, manage user interaction, client state, and data tables.
- Contains:
  - Application router & theme providers: `apps/web/src/app/router.tsx`, `apps/web/src/app/theme.ts`, `apps/web/src/app/App.tsx`
  - Layout wrappers: `apps/web/src/layouts/MainLayout.tsx`, `apps/web/src/layouts/AuthLayout.tsx`
  - Reusable components: `apps/web/src/components/PageContainer.tsx`, `apps/web/src/components/CommandPalette.tsx`, `apps/web/src/components/NotificationDrawer.tsx`
  - Domain pages: `apps/web/src/pages/dashboard/DashboardPage.tsx`, `apps/web/src/pages/assets/AssetsPage.tsx`, `apps/web/src/pages/licenses/LicensesPage.tsx`, etc.
  - Client state & API adapters: `apps/web/src/stores/auth.store.ts`, `apps/web/src/services/api.ts`, `apps/web/src/services/*.service.ts`

**2. API Gateway & Controller Layer (`apps/api/src/modules/*/*.controller.ts`):**
- Purpose: Expose versioned REST endpoints (`/api/v1/*`), OpenAPI documentation, request validation, and route authentication guards.
- Key controllers:
  - `apps/api/src/modules/auth/auth.controller.ts`
  - `apps/api/src/modules/assets/assets.controller.ts`
  - `apps/api/src/modules/licenses/licenses.controller.ts`
  - `apps/api/src/modules/directory/directory.controller.ts`
  - `apps/api/src/modules/network/network.controller.ts`
  - `apps/api/src/modules/tickets/tickets.controller.ts`
  - `apps/api/src/modules/audit/audit.controller.ts`
  - `apps/api/src/modules/settings/settings.controller.ts`

**3. Business Logic / Service Layer (`apps/api/src/modules/*/*.service.ts`):**
- Purpose: Encapsulate domain rules, relational lookups, transformations, KPI aggregations, and entity lifecycle operations.
- Key services:
  - `apps/api/src/modules/assets/assets.service.ts`
  - `apps/api/src/modules/auth/auth.service.ts`
  - `apps/api/src/modules/users/users.service.ts`
  - `apps/api/src/modules/tickets/tickets.service.ts`
  - `apps/api/src/modules/network/network.service.ts`
  - `apps/api/src/modules/audit/audit.service.ts`
  - `apps/api/src/modules/dashboard/dashboard.service.ts`

**4. Data Access Layer (`apps/api/src/database/` & `apps/api/prisma/`):**
- Purpose: Manage database connections, query building, migrations, and model schemas with Prisma ORM.
- Contains:
  - `apps/api/src/database/prisma.service.ts` - Lifecycle hooks (`$connect`, `$disconnect`)
  - `apps/api/src/database/prisma.module.ts` - Global database provider export
  - `apps/api/prisma/schema.prisma` - Database schema definitions

**5. Shared Contract Layer (`packages/*`):**
- Purpose: Guarantee type safety and validation rules across both client and server boundaries.
- Contains:
  - `packages/shared-types/src/` - DTO interfaces, enum definitions, entity types
  - `packages/shared-validators/src/` - Zod schema validators
  - `packages/shared-utils/src/` - Shared formatting (dates, currency, byte sizes)

## Data Flow

**Standard REST Request / Response Lifecycle:**

1. **Client Interaction:** User interacts with UI (e.g. creating an Asset on `apps/web/src/pages/assets/AssetsPage.tsx`).
2. **Service Call:** Page invokes typed service `assetsService.create(data)` via Axios instance in `apps/web/src/services/api.ts`.
3. **Request Interceptor:** Injects `Bearer <JWT>` from `useAuthStore` into authorization header.
4. **Nginx Proxy:** Nginx routes `/api/v1/*` to backend service port `3000`.
5. **Global Guards & Middleware:**
   - Helmet & CORS applied in `apps/api/src/main.ts`.
   - `JwtAuthGuard` (`apps/api/src/common/guards/jwt-auth.guard.ts`) verifies token validity.
   - `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`) checks required permissions.
6. **Validation Pipe:** `ValidationPipe` or `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`) validates request payload.
7. **Controller Handler:** `AssetsController.create()` handles routing and passes payload to `AssetsService`.
8. **Service Execution:** `AssetsService.create()` runs domain validation, resolves category/location references, and queries PostgreSQL via `PrismaService`.
9. **Transform Interceptor:** `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts`) standardizes response into `{ success: true, data: ..., timestamp: ... }`.
10. **Audit Interceptor:** `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) asynchronously logs mutation events to the `AuditLog` table.
11. **Client Cache Invalidation:** TanStack Query cache receives response and updates table state reactively.

**State Management:**
- Server State: Managed by TanStack Query (`@tanstack/react-query`) with automatic background refetching and caching.
- Client State: Managed by Zustand (`apps/web/src/stores/auth.store.ts`, `apps/web/src/stores/theme.store.ts`) with `localStorage` persistence.
- Database State: ACID-compliant PostgreSQL 17 managed via Prisma ORM.

## Key Abstractions

**NestJS Injectable Services:**
- Purpose: Encapsulate domain logic and external I/O behind dependency injection.
- Examples: `AssetsService` (`apps/api/src/modules/assets/assets.service.ts`), `TicketsService` (`apps/api/src/modules/tickets/tickets.service.ts`), `PrismaService` (`apps/api/src/database/prisma.service.ts`).

**Global Interceptors & Filters:**
- Purpose: Cross-cutting normalization of responses and error handling.
- Examples: `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts`), `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`), `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`).

**PageContainer & Ant Design Layout Hierarchy:**
- Purpose: Unified enterprise layout shell with breadcrumbs, statistics, search filters, and actionable table toolbars.
- Examples: `PageContainer` (`apps/web/src/components/PageContainer.tsx`), `MainLayout` (`apps/web/src/layouts/MainLayout.tsx`).

## Entry Points

**API Entry Point:**
- Location: `apps/api/src/main.ts`
- Triggers: Node process start (`node dist/main` or `pnpm --filter @uims/api dev`)
- Responsibilities: Initialize NestJS application, bind global pipes, filters, interceptors, setup Swagger OpenAPI docs at `/api/v1/docs`, and listen on port 3000.

**Web Entry Point:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser document load
- Responsibilities: Mount React 19 root, initialize Ant Design `ConfigProvider`, `App` context, `QueryClientProvider`, and React Router provider.

**Database Seed Entry Point:**
- Location: `apps/api/prisma/seed.ts`
- Triggers: `pnpm db:seed`
- Responsibilities: Populate default roles, admin users, asset categories, subnets, sample tickets, and system settings.

## Error Handling

**Strategy:** Centralized exception filter pipeline transforming all HTTP and database errors into a predictable JSON schema.

**Patterns:**
- `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`) catches standard NestJS `HttpException` instances, extracts validation errors, and formats response: `{ success: false, statusCode, message, errors, timestamp, path }`.
- `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) intercepts Prisma Client Known Request Errors (e.g. `P2002` unique constraint violation, `P2025` record not found) and maps them to clean 400/404/409 HTTP status codes.
- Frontend Axios response interceptor (`apps/web/src/services/api.ts`) automatically intercepts 401 Unauthorized errors to purge auth state and redirect to `/login`.

## Cross-Cutting Concerns

**Logging:**
- Pino structured logger with `pino-http` request middleware.

**Validation:**
- Shared Zod validation schemas (`packages/shared-validators`) + NestJS `ValidationPipe` with `{ whitelist: true, transform: true }`.

**Security:**
- Helmet HTTP security headers, CORS origin controls, HTTP-only cookie support, bcrypt password hashing, JWT bearer verification, and RBAC guards.

**Auditing:**
- Automatic mutation audit logging via `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) capturing actor, entity, action, and payload diffs.

---

*Architecture analysis: 2026-08-14*
*Update when major patterns change*

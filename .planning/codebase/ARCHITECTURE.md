---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
<!-- refreshed: 2026-09-17 -->

# Architecture

**Analysis Date:** 2026-09-17

## System Overview

```text
       +-------------------+
       |                   |
       |  Web Application  | (React, Vite, Zustand, React Query)
       |   `apps/web/`     |
       |                   |
       +---------+---------+
                 |
                 | REST API (JSON)
                 v
       +-------------------+
       |                   |
       |  API Application  | (NestJS)
       |   `apps/api/`     |
       |                   |
       +----+---------+----+
            |         |
            v         v
     +--------+  +---------+
     |        |  |         |
     | Redis  |  | Postgres| (Prisma ORM)
     |        |  |         |
     +--------+  +---------+
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Web App | User interface, state management, client-side routing | `apps/web/src/main.tsx` |
| API App | Business logic, request validation, authentication, db access | `apps/api/src/main.ts` |
| Prisma Schema | Database schema definition, ORM models | `apps/api/prisma/schema.prisma` |
| Shared Types | Shared TypeScript interfaces and DTOs | `packages/shared-types/` |
| Shared Validators | Shared validation schemas (e.g., Zod) | `packages/shared-validators/` |
| Shared Utils | Shared utility functions (e.g., date formatting) | `packages/shared-utils/` |

## Pattern Overview

**Overall:** Monorepo with a Layered API Architecture and Component-Based UI

**Key Characteristics:**

- **Monorepo:** Uses Turborepo and pnpm workspaces to manage multiple applications and shared packages.
- **Modular API:** The backend uses NestJS modules (`@Module`) to encapsulate feature-specific controllers, services, and providers.
- **Service Repository:** Controllers delegate business logic to Services, which use Prisma as the data access layer.
- **Client-Side Data Fetching:** The frontend uses React Query for remote state management and data fetching, separating it from local state (Zustand).

## Layers

**API - Controllers Layer:**

- Purpose: Handle incoming HTTP requests, route them to appropriate services, and return responses. Enforce authentication and authorization (Guards).
- Location: `apps/api/src/modules/**/*.controller.ts`
- Contains: NestJS `@Controller` classes.
- Depends on: Services, DTOs.
- Used by: External clients (Web App).

**API - Services Layer:**

- Purpose: Contain core business logic.
- Location: `apps/api/src/modules/**/*.service.ts`
- Contains: NestJS `@Injectable` classes.
- Depends on: PrismaService, other services (e.g., RedisService).
- Used by: Controllers.

**API - Data Access Layer:**

- Purpose: Interface with the database.
- Location: `apps/api/src/database/prisma.service.ts`
- Contains: PrismaClient instance.
- Depends on: PostgreSQL.
- Used by: Services.

**Web - UI Components:**

- Purpose: Render user interface.
- Location: `apps/web/src/pages/` and `apps/web/src/components/`
- Contains: React components.
- Depends on: Stores, Services (API calls).

## Data Flow

### Primary Request Path (e.g., Fetching Users)

1. **User Interaction:** User navigates to a page (`apps/web/src/pages/access/AccessControlPage.tsx`).
2. **Data Fetching:** React component uses React Query to call a service function (`apps/web/src/services/users.service.ts`).
3. **API Request:** Service uses the configured Axios client (`apps/web/src/services/api.ts`) to send an HTTP GET request to `/api/v1/users`.
4. **API Routing:** NestJS receives the request at the entry point (`apps/api/src/main.ts`), applies global middleware and guards (e.g., `JwtAuthGuard` in `apps/api/src/app.module.ts`).
5. **Controller:** The request is routed to `UsersController.findAll` (`apps/api/src/modules/users/users.controller.ts`).
6. **Service Logic:** The controller calls `UsersService.findAll` (`apps/api/src/modules/users/users.service.ts`), which applies business rules.
7. **Database Query:** The service uses `PrismaService` (`apps/api/src/database/prisma.service.ts`) to execute a query against PostgreSQL.
8. **Response:** Data is returned up the chain to the client, where React Query caches it and updates the UI.

**State Management:**

- **Remote State:** Managed by `@tanstack/react-query` in the frontend (caching, deduplication, background updates).
- **Local/Global State:** Managed by `zustand` (`apps/web/src/stores/`, e.g., `auth.store.ts`, `theme.store.ts`).

## Key Abstractions

**NestJS Modules:**

- Purpose: Group related components (Controllers, Services) into cohesive blocks.
- Examples: `apps/api/src/modules/users/users.module.ts`
- Pattern: Modular architecture.

**DTOs (Data Transfer Objects):**

- Purpose: Define the shape of data sent over the network, used for validation.
- Examples: `apps/api/src/modules/users/dto/create-user.dto.ts`
- Pattern: Validation and type safety.

## Entry Points

**Backend API:**

- Location: `apps/api/src/main.ts`
- Triggers: Node.js start script (`pnpm run dev`).
- Responsibilities: Bootstraps the NestJS application, configures global pipes, filters, interceptors, CORS, and Swagger.

**Frontend Web:**

- Location: `apps/web/src/main.tsx`
- Triggers: Browser loading `index.html`.
- Responsibilities: Bootstraps the React application, sets up providers (Router, QueryClient, Theme, Config).

## Architectural Constraints

- **Database:** Prisma ORM is strictly used for all PostgreSQL interactions. No raw SQL unless absolutely necessary via Prisma's `$queryRaw`.
- **Global state:** NestJS services are singletons by default. Frontend global state is restricted to Zustand stores; avoid React Context for frequently changing data.
- **Imports:** Apps can import from `packages/*` using workspace dependencies (`@uims/*`). Packages should not import from apps.

## Anti-Patterns

### Direct Database Access from Controllers

**What happens:** Controllers use `PrismaService` directly instead of calling a Service method.
**Why it's wrong:** Bypasses business logic, making code hard to test and reuse.
**Do this instead:** Always inject and call the relevant Service from the Controller (e.g., use `UsersService` in `apps/api/src/modules/users/users.controller.ts`).

## Error Handling

**Strategy:**

- **Backend:** Exceptions are thrown using NestJS standard `HttpException` classes (e.g., `NotFoundException`).
- **Global Filters:** `HttpExceptionFilter` and `PrismaExceptionFilter` (`apps/api/src/common/filters/`) catch unhandled exceptions and format them into standard JSON error responses.
- **Frontend:** API errors are caught by React Query and Axios interceptors (`apps/web/src/services/api.ts`). React Error Boundaries (`apps/web/src/components/RouteErrorBoundary.tsx`) catch rendering errors.

## Cross-Cutting Concerns

**Logging:** Uses NestJS built-in `Logger` class for application logging (`apps/api/src/main.ts`).
**Validation:** NestJS `ValidationPipe` with `class-validator` for DTOs in the backend. Zod schemas (`@uims/shared-validators`) can be used for shared validation logic.
**Authentication:** JWT-based authentication. Implemented via `JwtAuthGuard` applied globally or per-route, verifying tokens against Redis or database records (`apps/api/src/common/guards/jwt-auth.guard.ts`).
**Authorization:** Role-based access control (RBAC) and permissions handled by `RolesGuard` and `PermissionsGuard` (`apps/api/src/common/guards/`).
**Auditing:** Handled automatically for mutating requests via `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`).

---

*Architecture analysis: 2026-09-17*

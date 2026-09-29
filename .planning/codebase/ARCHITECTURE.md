<!-- refreshed: 2026-09-28 -->
# Architecture

**Analysis Date:** 2026-09-28

## System Overview
```text
  [Web Browser / Client]
           │
           ▼ (HTTPS / REST)
 ┌──────────────────────┐
 │      apps/web/       │ (React SPA / Vite)
 │  (Zustand, Query)    │
 └─────────┬────────────┘
           │
           ▼ (HTTP Requests)
 ┌──────────────────────┐
 │      apps/api/       │ (NestJS Monolith)
 │   (Controllers)      │
 ├──────────────────────┤
 │     (Services)       │
 ├──────────────────────┤
 │  (Prisma ORM Layer)  │
 └─────────┬──────┬─────┘
           │      │
           ▼      ▼
    [PostgreSQL] [Redis]
```

## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| Web Frontend | User interface, routing, client-side state, and data fetching | `apps/web/src/main.tsx` |
| API Backend | Core business logic, authorization, request validation, and API endpoints | `apps/api/src/main.ts` |
| Prisma Layer | Database schema definition, ORM modeling, and migrations | `apps/api/prisma/schema.prisma` |
| State Stores | Global client-side state management (auth, theme, timezone) | `apps/web/src/stores/*.store.ts` |
| Shared Validators | Zod-based validation schemas shared across the stack | `packages/shared-validators/src/index.ts` |
| API Modules | Encapsulation of specific domain boundaries (Controllers, Services) | `apps/api/src/modules/` |

## Pattern Overview
**Overall:** Multi-tier Client-Server with a Module-Driven Monolith
**Key Characteristics:**
- **Monorepo Strategy:** pnpm workspaces and Turborepo for sharing types and validation logic.
- **Dependency Injection:** extensively utilized in the API via NestJS to manage service lifecycles.
- **Declarative UI:** React components managing view logic, decoupled from global state (Zustand) and server state (React Query).
- **Domain Modules:** The API is structured into distinct, self-contained domain modules (`users`, `roles`, `settings`, etc.).

## Layers

**Presentation Layer (Web):**
- Purpose: Renders the user interface and captures user interactions.
- Location: `apps/web/src/pages/`, `apps/web/src/components/`
- Contains: React components and views.
- Depends on: State Stores (`apps/web/src/stores/`), API Services (`apps/web/src/services/`).
- Used by: End users directly.

**API Controllers Layer:**
- Purpose: Exposes HTTP endpoints, routes requests, and validates incoming payloads.
- Location: `apps/api/src/modules/**/*.controller.ts`
- Contains: NestJS Controllers, DTOs (Data Transfer Objects).
- Depends on: Business Services, `@nestjs/swagger` decorators, `class-validator` DTOs.
- Used by: Web Frontend, External API consumers.

**Business Logic Layer:**
- Purpose: Executes core application logic and orchestrates data operations.
- Location: `apps/api/src/modules/**/*.service.ts`
- Contains: NestJS Injectable Services.
- Depends on: Data Access Layer (`PrismaService`), Cache Layer (`RedisService`).
- Used by: API Controllers.

**Data Access Layer:**
- Purpose: Abstracts direct database operations and provides a typed query builder.
- Location: `apps/api/src/database/prisma.service.ts`
- Contains: Prisma integration.
- Depends on: `schema.prisma`, Prisma Client.
- Used by: Business Logic Layer.

## Data Flow
### Primary Request Path
1. **User Interaction** (`apps/web/src/pages/users/UsersPage.tsx`) triggers a data fetch or mutation via React Query.
2. **API Call** (`apps/web/src/services/api.ts`) constructs and sends the HTTP request to the backend.
3. **Route Handling** (`apps/api/src/modules/users/users.controller.ts`) intercepts the request, validates the DTO via `ValidationPipe`, and calls the service.
4. **Business Logic** (`apps/api/src/modules/users/users.service.ts`) applies domain rules and interacts with the database.
5. **Database Query** (`apps/api/src/database/prisma.service.ts`) executes the operation against PostgreSQL and returns results up the chain.

**State Management:**
- **Server State (Web):** Managed and cached by React Query (`apps/web/src/app/query-client.ts`), configured to auto-retry and retain cache.
- **Client State (Web):** Managed by Zustand stores (`apps/web/src/stores/`), specifically for synchronous UI data like Theme, Auth tokens, and Layout settings.
- **Session/Caching (API):** Managed using Redis (`apps/api/src/common/redis/redis.service.ts`).

## Key Abstractions
**Domain Modules (API):**
- Purpose: Grouping related functionality (Controllers, Services, DTOs) into cohesive units.
- Examples: `apps/api/src/modules/users/users.module.ts`, `apps/api/src/modules/roles/roles.module.ts`
- Pattern: NestJS Modular Architecture.

**Shared Validation (Monorepo):**
- Purpose: Enforce data constraints universally on frontend forms and API boundaries (where applicable) without duplication.
- Examples: `packages/shared-validators/src/user.validator.ts`
- Pattern: Zod schemas.

**Global Exception Filters:**
- Purpose: Intercept unhandled exceptions across the API to return formatted HTTP responses.
- Examples: `apps/api/src/common/filters/http-exception.filter.ts`, `apps/api/src/common/filters/prisma-exception.filter.ts`
- Pattern: NestJS Exception Filters.

## Entry Points
**API Server Bootstrap:**
- Location: `apps/api/src/main.ts`
- Triggers: Execution of `pnpm run start:dev` or node binary execution.
- Responsibilities: Initializes the NestJS application context, applies global middleware (Helmet, CORS, Cookie Parser), registers global pipes and filters, and starts listening on the designated port.

**Web Application Bootstrap:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser loading `index.html`.
- Responsibilities: Mounts the React component tree into the DOM, initializes providers (React Query, Error Boundaries, Router).

## Architectural Constraints
- **Threading:** Node.js single-threaded event loop for both API and Vite server. CPU-intensive tasks should be offloaded.
- **Global state:** Discouraged except for explicit Zustand stores on the frontend and Redis for distributed caching on the backend. No module-level mutable singletons in the API.
- **Circular imports:** Prevented systematically via ESLint (`@uims/eslint-config`) and NestJS's strict module dependency resolution.

## Anti-Patterns
### Direct Database Access from Controllers
**What happens:** Writing Prisma queries directly within a Controller method (`users.controller.ts`).
**Why it's wrong:** It couples routing logic with data access, making the controller hard to test and bypassing business logic reuse.
**Do this instead:** Inject a Service into the Controller and delegate data access to it (e.g., `users.service.ts`).

### Uncontrolled Component State for Remote Data
**What happens:** Using `useState` and `useEffect` to fetch and store API responses in a component.
**Why it's wrong:** Leads to race conditions, poor cache management, duplicate requests, and complex loading state handling.
**Do this instead:** Use React Query hooks (`useQuery`, `useMutation`) for all remote data operations.

## Error Handling
**Strategy:** Centralized and predictable error structures across client and server.
**Patterns:**
- **API (Backend):** Utilizes `PrismaExceptionFilter` to convert database constraints into HTTP 400/409/404 errors, and `HttpExceptionFilter` for standardizing JSON error response structures.
- **Web (Frontend):** Employs React Error Boundaries (`apps/web/src/components/RouteErrorBoundary.tsx`, `apps/web/src/components/ErrorResultView.tsx`) to catch rendering errors and prevent white-screens of death, while React Query handles API request errors gracefully.

## Cross-Cutting Concerns
**Logging:**
- Approach: NestJS native `Logger` utilized within services and the bootstrap process (`apps/api/src/main.ts`). The `audit.interceptor.ts` tracks request footprints.
**Validation:**
- Approach: Two-pronged. `class-validator` and `class-transformer` are used on the backend via NestJS `ValidationPipe` for incoming DTOs. `Zod` is heavily used within the `shared-validators` workspace package for client-side forms and general schema validation.
**Authentication:**
- Approach: JWT-based authentication. The backend validates tokens using `jwt-auth.guard.ts` and authorizes via `roles.guard.ts` or `permissions.guard.ts`. The frontend maintains session state in `apps/web/src/stores/auth.store.ts` and passes the Bearer token via Axios interceptors (`apps/web/src/services/api.ts`).

---
*Architecture analysis: 2026-09-28*

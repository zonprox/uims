# Architecture Map
**Analysis Date:** 2026-08-15

## System Overview

```ascii
+--------------------+        +---------------------+       +----------------------+
|                    |        |                     |       |                      |
|  Web App (React)   +------->+  API (NestJS)       +------>+  PostgreSQL          |
|  (apps/web)        |        |  (apps/api)         |       |  (Relational Data)   |
|                    |        |                     |       |                      |
+--------------------+        +----------+----------+       +----------------------+
                                         |
                                         v
                              +----------+----------+
                              |                     |
                              |  Redis (BullMQ)     |
                              |  (Cache & Jobs)     |
                              +---------------------+
```

## Component Responsibilities

| Component | Responsibility | Technologies |
|-----------|----------------|--------------|
| **Web** | Client-side UI, routing, and state management. | React 19, React Router 8, Zustand, React Query, Ant Design |
| **API** | Core business logic, data access, auth, async jobs. | NestJS 11, Prisma 7, PostgreSQL, Redis, BullMQ |
| **Shared Packages** | Domain types, validation schemas, and utilities. | Zod, TypeScript |

## Pattern Overview

The repository is a monorepo managed via `pnpm` workspaces and `turbo`. 
- The **frontend** follows a feature-grouped directory structure under `pages/`, storing page-specific logic, with global building blocks in `components/`, `stores/`, etc.
- The **backend** follows a Modular Monolith architecture using NestJS modules (e.g., `UsersModule`, `AuthModule`) encompassing controllers, services, and DTOs within each feature module.

## Layers

### Web Layers (`apps/web/src/`)
- **Pages** (`pages/`): Route-level components grouped by feature (e.g., `dashboard`, `auth`). Contains page-specific UI.
- **Components** (`components/`): Reusable UI building blocks (e.g., `PageContainer`, `CommandPalette`).
- **Stores** (`stores/`): Global state management using Zustand (e.g., `auth.store.ts`).
- **Services/API Clients** (`services/`): API fetching logic, wrapped in React Query hooks.

### API Layers (`apps/api/src/`)
- **Controllers**: Handle HTTP requests/responses, route definitions, and request validation (using decorators).
- **Services**: Contain the core business logic and orchestrate data access.
- **Data Access**: Prisma ORM used for PostgreSQL interactions, usually injected directly into services.
- **Modules**: encapsulate the domain logic into cohesive units (`modules/`).

## Data Flow

**Primary Request Path:**
1. **User Action**: User interacts with a UI component in `apps/web`.
2. **React Query**: Trigger a mutation or query via custom hooks.
3. **HTTP Client**: Axios makes the REST API request.
4. **API Router**: NestJS routes the request to the appropriate controller method.
5. **API Controller**: Validates the payload (via DTOs and global pipes) and calls the corresponding service method.
6. **API Service**: Executes business logic and uses Prisma Client to query the database.
7. **Database**: PostgreSQL executes the query and returns results.
8. **Response**: Data flows back up through the service, controller, and HTTP response to React Query, which updates the UI cache.

## Key Abstractions

- **Shared Types (`packages/shared-types`)**: Contains domain interfaces and enums used by both web and API.
- **Shared Validators (`packages/shared-validators`)**: Contains Zod schemas for runtime validation, ensuring API and Web agree on data shapes.
- **NestJS Decorators & Guards (`apps/api/src/common/`)**: Custom decorators and guards for standardizing auth and roles.

## Entry Points

- **Web**: [`apps/web/src/main.tsx`](file:///home/user/projects/uims/apps/web/src/main.tsx) (React DOM bootstrap), [`apps/web/src/app/App.tsx`](file:///home/user/projects/uims/apps/web/src/app/App.tsx) (Root app layout/providers), [`apps/web/src/app/router.tsx`](file:///home/user/projects/uims/apps/web/src/app/router.tsx) (Route definitions).
- **API**: [`apps/api/src/main.ts`](file:///home/user/projects/uims/apps/api/src/main.ts) (NestJS bootstrap), [`apps/api/src/app.module.ts`](file:///home/user/projects/uims/apps/api/src/app.module.ts) (Root module registry).

## Architectural Constraints

1. **Monorepo Boundaries**: Applications (`apps/`) can import from packages (`packages/`), but packages cannot import from apps, and apps cannot import from each other directly.
2. **Direct DB Access**: Web must never access the database directly; it must always route through the API.
3. **Type Sharing**: All shared DTOs and domain models should reside in `packages/shared-types` or `packages/shared-validators`.

## Anti-Patterns

- **Local State for Remote Data**: Using `useState` or `Zustand` to store API response data instead of relying on `React Query`'s cache.
- **Fat Controllers**: Placing business logic in NestJS controllers instead of services.
- **Direct Prisma Client Usage in Web**: Web should strictly rely on API routes.

## Error Handling

- **API**: Uses NestJS global exception filters (`apps/api/src/common/filters`) to catch errors and map them to standard HTTP responses.
- **Web**: Employs React Error Boundaries (`apps/web/src/components/ErrorBoundary.tsx`) for uncaught UI exceptions, and handles API errors via React Query error callbacks.

## Cross-Cutting Concerns

- **Authentication**: JWT-based auth via Passport in the API, and JWT storage (likely local storage or cookies) managed via `auth.store.ts` in the Web app.
- **Logging**: Pino logger utilized in the API for structured logging.
- **Validation**: Combination of `class-validator` (API specific) and `zod` (shared/Web) depending on the boundary.

---
<!-- refreshed: 2026-08-15 -->
*Codebase architecture analysis: 2026-08-15*

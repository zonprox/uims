<!-- refreshed: 2026-08-15 -->
# Architecture

**Analysis Date:** 2026-08-15

## System Overview

```text
[Web Frontend - React/Vite] 
       | (REST API / Axios)
       v
[Backend API - NestJS]
       | (Prisma ORM)
       v
[PostgreSQL Database]
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Web App | SPA frontend rendering the Asset Operations Center UI | `apps/web/src/app/App.tsx` |
| API App | Core backend services, REST endpoints, and business logic | `apps/api/src/app.module.ts` |
| Database Schema | PostgreSQL schema definition via Prisma for all entities | `apps/api/prisma/schema.prisma` |
| Shared Validators | Common validation schemas shared between frontend and backend | `packages/shared-validators/src/index.ts` |
| State Management | Global state for theme, auth on frontend | `apps/web/src/stores/auth.store.ts` |

## Pattern Overview

**Overall:** Client-Server Monorepo (React SPA + NestJS REST API)

**Key Characteristics:**
- Strict workspace boundaries (`apps/web`, `apps/api`, `packages/*`).
- Module-based Backend: NestJS module per domain (Assets, Inventory, Users, etc.).
- Service-oriented Frontend: API calls wrapped in service modules mapping to backend endpoints.

## Layers

**Frontend Presentation:**
- Purpose: UI components, layouts, and page orchestration using Ant Design.
- Location: `apps/web/src/pages/`, `apps/web/src/components/`, `apps/web/src/layouts/`
- Contains: React components, hooks.
- Depends on: Services, Stores, Shared Validators.
- Used by: Browser clients.

**Frontend Services:**
- Purpose: Axios API wrappers communicating with the backend.
- Location: `apps/web/src/services/`
- Contains: API wrapper functions.
- Depends on: Axios (`apps/web/src/services/api.ts`).
- Used by: Frontend Presentation.

**Backend API Controllers:**
- Purpose: HTTP request handling and validation routing.
- Location: `apps/api/src/modules/*/`
- Contains: NestJS `@Controller` classes.
- Depends on: Backend Services, DTOs.
- Used by: Frontend Services.

**Backend Services:**
- Purpose: Business logic execution and data access orchestration.
- Location: `apps/api/src/modules/*/`
- Contains: NestJS `@Injectable` classes.
- Depends on: PrismaService.
- Used by: Backend API Controllers.

**Data Access:**
- Purpose: Database interactions via Prisma ORM.
- Location: `apps/api/prisma/schema.prisma`
- Contains: Prisma schemas.
- Depends on: PostgreSQL.
- Used by: Backend Services.

## Data Flow

### Primary Request Path

1. User interaction in UI Component (`apps/web/src/pages/users/UsersPage.tsx`)
2. API Service call (`apps/web/src/services/users.service.ts`)
3. NestJS Controller handles request (`apps/api/src/modules/users/users.controller.ts`)
4. NestJS Service processes logic (`apps/api/src/modules/users/users.service.ts`)
5. Prisma performs DB query (`apps/api/prisma/schema.prisma`)
6. Result returns through the stack back to the UI.

**State Management:**
- Global UI State (auth, theme) via Zustand (`apps/web/src/stores/`).
- Remote State handled by React Query (`apps/web/src/app/query-client.ts`) for data fetching and caching.

## Key Abstractions

**NestJS Modules:**
- Purpose: Encapsulate domain logic, services, and controllers.
- Examples: `apps/api/src/modules/users/users.module.ts`, `apps/api/src/modules/assets/assets.module.ts`

**API Services (Frontend):**
- Purpose: Abstract Axios HTTP calls into typed domain functions.
- Examples: `apps/web/src/services/assets.service.ts`, `apps/web/src/services/users.service.ts`

## Entry Points

**Frontend Application:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser load, initializes React DOM, QueryClient, and Router.

**Backend Application:**
- Location: `apps/api/src/app.module.ts`
- Triggers: Node.js startup, binds HTTP server and global interceptors/guards.

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop for backend. Browser standard threading for frontend.
- **Global state:** Handled globally by Zustand stores; limited to non-transient UI preferences (e.g., Theme, Auth context).
- **Circular imports:** Must be avoided across NestJS modules.

## Anti-Patterns

### Unencapsulated DB Access
**What happens:** Controllers accessing Prisma DB client directly.
**Why it's wrong:** Bypasses business logic, audit logs, and makes testing difficult.
**Do this instead:** Always route data access through the domain's corresponding Service layer (e.g. `apps/api/src/modules/users/users.service.ts`).

## Error Handling

**Strategy:** Global Exception Filters (NestJS) on the backend mapped to standardized Error responses. Frontend uses React Error Boundaries (`apps/web/src/components/ErrorBoundary.tsx`) for UI crashes and interceptors in Axios (`apps/web/src/services/api.ts`) for consistent API error parsing.

## Cross-Cutting Concerns

**Logging:** Backend uses an `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) to log data mutations automatically into the `AuditLog` table.
**Validation:** Shared DTOs and Zod schemas (`packages/shared-validators/src/`) to enforce constraints consistently on client inputs and API boundaries.
**Authentication:** JWT-based stateless auth (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`). Guarded routes (`apps/api/src/common/guards/jwt-auth.guard.ts`) mapped to RBAC (`apps/api/src/common/guards/roles.guard.ts`).

---

*Architecture analysis: 2026-08-15*

<!-- refreshed: 2026-08-16 -->
# Architecture

**Analysis Date:** 2026-08-16

## System Overview

```text
[Monorepo Root: /home/user/projects/uims]
 ├── apps/
 │   ├── web/ (React, Vite, Ant Design, React Query, Zustand)
 │   └── api/ (NestJS, Prisma, PostgreSQL)
 └── packages/
     ├── shared-types/      (TypeScript Interfaces/Enums)
     ├── shared-validators/ (Zod Schemas)
     └── shared-utils/      (Shared utility functions like dayjs)
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `apps/web` | Frontend SPA providing the UI | `apps/web/src/main.tsx` |
| `apps/api` | Backend REST API serving business logic | `apps/api/src/main.ts` |
| `packages/shared-types` | Shared type definitions across web and api | `packages/shared-types/src/index.ts` |
| `packages/shared-validators` | Zod schemas for input validation | `packages/shared-validators/src/index.ts` |

## Pattern Overview

**Overall:** Client-Server Monorepo (Turborepo)
- **Frontend:** SPA with React, component-driven, client-side routing, global/server state separation.
- **Backend:** Modular, Dependency Injection (DI) based REST API (NestJS).

**Key Characteristics:**
- Strict typing across the stack using shared packages.
- Zod used for cross-stack validation schemas.
- Ant Design v6+ used strictly on frontend, driven by AntApp context (`App.useApp()`).
- Database access abstracted via Prisma ORM.

## Layers

**Frontend (Web):**
- Purpose: Render UI and handle client-side business logic.
- Location: `apps/web/src/`
- Contains: React components, pages, stores (Zustand), services (React Query clients).
- Depends on: `shared-types`, `shared-validators`, `@tanstack/react-query`, `antd`, `@ant-design/pro-components`.
- Used by: End users (via browser).

**Backend (API):**
- Purpose: Handle requests, apply business rules, persist data.
- Location: `apps/api/src/`
- Contains: NestJS Modules (Controllers, Services), Prisma client, Guards, Interceptors.
- Depends on: `shared-types`, `shared-validators`, `@nestjs/*`, `prisma`.
- Used by: Web frontend (`apps/web`).

## Data Flow

### Primary Request Path

1. User Interaction (Frontend Component) (`apps/web/src/pages/[module]/*.tsx`)
2. Server State Query/Mutation (`apps/web/src/app/query-client.ts` via React Query)
3. API Gateway / Routing (`apps/api/src/main.ts`)
4. Global Middleware & Guards (Throttler, JwtAuthGuard, RolesGuard) (`apps/api/src/common/guards/`)
5. Controller Logic (`apps/api/src/modules/[module]/[module].controller.ts`)
6. Business Logic (`apps/api/src/modules/[module]/[module].service.ts`)
7. Database Access (`apps/api/src/database/prisma.module.ts`)

**State Management:**
- **Web Server State:** `@tanstack/react-query` (cached, background synchronized).
- **Web Client State:** Zustand (`apps/web/src/stores/`).
- **API State:** Stateless, session managed via JWTs.

## Key Abstractions

**Shared Validators:**
- Purpose: Ensure identical validation logic on both client forms and API endpoints.
- Examples: `packages/shared-validators/src/auth.validator.ts`

**NestJS Modules:**
- Purpose: Encapsulate domain logic (Controllers + Services).
- Examples: `apps/api/src/modules/audit/audit.module.ts`

**Ant Design App Context:**
- Purpose: Provide dynamic theme context and global feedback mechanisms (message, modal, notification).
- Examples: `apps/web/src/app/App.tsx`

## Entry Points

**Web Entry Point:**
- Location: `apps/web/src/main.tsx` & `apps/web/src/app/App.tsx`
- Triggers: Browser loading the application bundle.

**API Entry Point:**
- Location: `apps/api/src/main.ts`
- Triggers: Node.js process startup, listening on configured PORT.

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop for both API and Web build processes.
- **Global state:** 
  - API: strictly no global mutable state, everything must be stateless or handled via DI.
  - Web: Zustand used for minimal UI state (e.g. theme preferences).
- **Circular imports:** Turborepo prevents cyclic package dependencies. NestJS DI requires forward references (`forwardRef`) if circular imports exist, though they should be avoided.

## Anti-Patterns

### Inline Ant Design Feedback
**What happens:** Using `message.success()` or `Modal.confirm()` directly from `antd` imports.
**Why it's wrong:** Breaks dynamic theming context and creates UI inconsistencies.
**Do this instead:** Always consume via `const { message, modal, notification } = App.useApp();` as per `ant-design-guide.md`.

### Mixing Client and Server State
**What happens:** Storing API responses in Zustand stores.
**Why it's wrong:** Re-invents caching, caching invalidation, and background fetching.
**Do this instead:** Use React Query (`useQuery`, `useMutation`) for all external data.

## Error Handling

**Strategy:** 
- **API:** Global Exception Filters (`HttpExceptionFilter`, `PrismaExceptionFilter` in `apps/api/src/common/filters/`) capture and format all errors into standard HTTP JSON responses.
- **Web:** Error Boundaries (`apps/web/src/components/ErrorBoundary.tsx`) for UI crashes, React Query error handling for API failures.

## Cross-Cutting Concerns

**Logging:** NestJS built-in `Logger` during bootstrap. Likely extended by custom interceptors (e.g., `AuditInterceptor` in `apps/api/src/common/interceptors/audit.interceptor.ts`).
**Validation:** Zod schemas via `shared-validators` used in NestJS ValidationPipe and frontend form resolvers.
**Authentication:** JWT-based. Protected by `JwtAuthGuard` applied globally in `app.module.ts`. Authorization handled by `RolesGuard`.

---

*Architecture analysis: 2026-08-16*

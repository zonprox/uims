<!-- refreshed: 2026-09-10 -->
# Architecture

**Analysis Date:** 2026-09-10

## System Overview
```text
                       +-------------------------------------------------+
                       |                  CLIENT LAYER                   |
                       |  React / Vite / Ant Design / Zustand / Tanstack |
                       +------------------------+------------------------+
                                                |
                                                | HTTPS / WSS
                                                v
                       +------------------------+------------------------+
                       |              REVERSE PROXY LAYER                |
                       |                      Nginx                      |
                       +------------------------+------------------------+
                                                |
                                                | HTTP (Reverse Proxy)
                                                v
                       +------------------------+------------------------+
                       |                   API LAYER                     |
                       |                 NestJS (Node)                   |
                       |  - Auth & Guards (JWT, Role, Permission)        |
                       |  - Interceptors (Audit)                         |
                       |  - Controllers & Services                       |
                       +-------+----------------+-------------+----------+
                               |                |             |
                 +-------------+     +----------+-------+     +-------------+
                 |                   |                  |                   |
                 v                   v                  v                   v
+----------------+--------+ +--------+--------+ +-------+---------+ +-------+--------+
|      Primary DB         | |    Cache / Q    | |  Search Engine  | | Object Storage |
|      PostgreSQL         | |      Redis      | |   MeiliSearch   | |   SeaweedFS    |
| (via Prisma ORM)        | |                 | | (Multi-index)   | | (S3 Gateway)   |
+-------------------------+ +-----------------+ +-----------------+ +----------------+
```

## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| **Vite App** | Entry point for frontend, context providers, theme setup | `apps/web/src/app/App.tsx` |
| **React Router** | Client-side routing with lazy loading & layout wrappers | `apps/web/src/app/router.tsx` |
| **Zustand Stores** | Global client state (Auth, Theme, Notifications) | `apps/web/src/stores/auth.store.ts` |
| **NestJS Bootstrap** | Server setup, security headers (Helmet), CORS, Validation | `apps/api/src/main.ts` |
| **AppModule** | Global config, throttling, module registration, auth guards | `apps/api/src/app.module.ts` |
| **PrismaService** | Database ORM connection and lifecycle management | `apps/api/src/database/prisma.service.ts` |
| **RedisService** | Caching, fast lookups, token blacklisting via Redis | `apps/api/src/common/redis/redis.service.ts` |
| **SearchService** | MeiliSearch multi-search index synchronization and querying | `apps/api/src/modules/search/search.service.ts` |
| **AuditInterceptor**| Automatic capturing of request trails & logging actions | `apps/api/src/common/interceptors/audit.interceptor.ts` |

## Pattern Overview
**Overall:** Modular Monolith (Backend) + Single Page Application (Frontend)
**Key Characteristics:** 
- **Backend:** Module-driven architecture per domain (Assets, Directory, Inventory, etc.), Controller-Service-Repository pattern (though Prisma directly acts as Repository), Guard/Interceptor for cross-cutting concerns.
- **Frontend:** Server-state via React Query, client-state via Zustand. Container/Presentation split in pages vs components. Heavy use of Ant Design Pro components.

## Layers
**Web Presentation Layer:**
- Purpose: UI rendering, client-side routing, user interaction.
- Location: `apps/web/src/`
- Contains: React components, pages, hooks, Zustand stores.
- Depends on: NestJS API (via fetch/React Query).
- Used by: End Users.

**API Presentation Layer:**
- Purpose: Expose HTTP REST endpoints, validate input DTOs, handle auth/permissions.
- Location: `apps/api/src/modules/**/*.controller.ts`
- Contains: Controllers, DTOs, Guards, Pipes.
- Depends on: API Business Layer (Services).
- Used by: Web Presentation Layer.

**API Business Layer:**
- Purpose: Core application logic, transaction boundaries.
- Location: `apps/api/src/modules/**/*.service.ts`
- Contains: NestJS Providers / Services.
- Depends on: Data Access Layer (Prisma), External Integrations (MeiliSearch, S3).
- Used by: API Presentation Layer.

**Data Access / Infrastructure Layer:**
- Purpose: Manage state persistence, caching, full-text search.
- Location: `apps/api/src/database/`, `apps/api/src/common/redis/`
- Contains: Prisma schema & service, Redis wrappers, SeaweedFS calls.
- Depends on: PostgreSQL, Redis, SeaweedFS, MeiliSearch.
- Used by: API Business Layer.

## Data Flow
### Primary Request Path (Example: Search)
1. **User Action:** User types query in UI (`apps/web/src/components/...`).
2. **React Query:** Sends HTTP GET request via Tanstack Query (`apps/web/src/hooks/useSearch.ts` or similar).
3. **Nginx:** Routes request to API container over internal Docker network.
4. **NestJS Guard:** `JwtAuthGuard` and `ThrottlerGuard` validate session and rate limits (`apps/api/src/app.module.ts`).
5. **Controller:** `SearchController` receives request, validated against DTO.
6. **Service:** `SearchService.search()` checks `isMeiliAvailable`.
7. **External Service:** Sends `POST` to MeiliSearch `/multi-search` (`apps/api/src/modules/search/search.service.ts`).
8. **Fallback (if Meili offline):** Queries `PrismaService` for assets/licenses/users concurrently.
9. **Interceptor:** `AuditInterceptor` logs the access.
10. **Response:** Controller returns normalized `SearchResponseDto`.
11. **UI Update:** React Query caches the result, UI renders dropdown list.

## Key Abstractions
- **Shared Types:** A monorepo package `packages/shared-types/` defining Enums, DTOs, and Interfaces that both Web and API consume.
- **Audit Interceptor:** Transparently logs actions without business logic pollution.
- **Unified Config:** `getAppConfig` uses Zod to validate environment variables securely at startup (`apps/api/src/config/app.config.ts`).

## Entry Points
- **Frontend Entry:** `apps/web/src/main.tsx` (React DOM bootstrap)
- **Frontend Router:** `apps/web/src/app/router.tsx`
- **Backend Entry:** `apps/api/src/main.ts` (NestFactory bootstrap)
- **Backend Root Module:** `apps/api/src/app.module.ts`

## Architectural Constraints
- **Monorepo Structure:** Turborepo is used to manage apps and packages. Dependencies flow strictly from packages to apps.
- **Database Access:** Controllers must not inject `PrismaService` directly (except Health module). All data access goes through Services.
- **Authorization:** Handled globally by `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard`. Endpoints use decorators (e.g., `@Roles('Admin')`) rather than manual checks in code.

## Anti-Patterns
1. **God Classes / Large Services:** `network.service.ts` (>840 lines) and `directory.service.ts` (>820 lines) are doing too much and should be split into smaller, domain-specific services or command handlers.
2. **Missing Repository Abstraction:** The codebase tightly couples Services to `PrismaService`. While common in NestJS, it makes unit testing without a real DB (or heavy mocking) difficult.

## Error Handling
- **Global Filters:** `HttpExceptionFilter` and `PrismaExceptionFilter` catch all uncaught exceptions to normalize responses (`apps/api/src/common/filters/`).
- **Client Side:** Axios/Fetch error interceptors are handled in React Query, mapped to Ant Design notifications via `ErrorBoundary` components.

## Cross-Cutting Concerns
- **Security:** Helmet for headers, explicit CORS whitelist in `main.ts`, JWT expiration validation, global parameter whitelist validation.
- **Logging/Audit:** Audit log is saved via interceptors for mutations. NestJS standard logger is used throughout.
- **Performance:** Redis is used for token blacklisting and potentially caching. Compression middleware is active on the API.

---
*Architecture analysis: 2026-09-10*

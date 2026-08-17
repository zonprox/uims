<!-- refreshed: 2026-08-17 -->
# Architecture
**Analysis Date:** 2026-08-17

## System Overview
The UIMS (Unified IT Infrastructure & Assets Management Platform) is built as a monorepo utilizing Turborepo. It features a modern client-server architecture with a React-based Single Page Application frontend (`apps/web`) and a NestJS-based backend API (`apps/api`). The system relies on PostgreSQL via Prisma ORM for persistent data, and Redis/BullMQ for asynchronous job processing. 

```text
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|   UIMS Web App    | <---> |   UIMS API        | <---> |   PostgreSQL      |
|  (React/Vite)     | REST/ |  (NestJS)         | Prisma|                   |
|                   | WSS   |                   |       |                   |
+-------------------+       +-------------------+       +-------------------+
        ^                           ^                             ^
        |                           |                             |
        v                           v                             v
+-----------------------------------------------------------------------+
|                       Shared Packages                                 |
|  (shared-types, shared-validators, shared-utils, eslint-config)       |
+-----------------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | File Path(s) |
|---|---|---|
| **Web Frontend** | Provides the user interface using React, Ant Design, and Zustand for state management. Uses React Query for data fetching and caching. | `apps/web/` |
| **API Backend** | Handles business logic, authentication, data validation, and database operations using NestJS and Prisma. | `apps/api/` |
| **Shared Types** | Defines common TypeScript interfaces, entities, and DTO structures used across frontend and backend. | `packages/shared-types/` |
| **Shared Validators** | Defines common Zod schemas for input validation utilized by both the frontend forms and backend API pipes. | `packages/shared-validators/` |
| **Shared Utils** | Contains common helper functions and utilities (e.g., date formatting, timezone handling). | `packages/shared-utils/` |
| **Prisma Schema** | Defines the database schema and generates the TypeScript client. | `apps/api/prisma/schema.prisma` |

## Pattern Overview
- **Monorepo Strategy:** Codebase is managed using Turborepo and pnpm workspaces, enforcing code sharing across applications.
- **Frontend State Management:** Global UI state is handled by Zustand (e.g., `apps/web/src/stores/theme.store.ts`), while asynchronous server state is managed via React Query (`apps/web/src/app/query-client.ts`).
- **Backend Architecture:** Follows NestJS's standard module-controller-service pattern. Each domain (e.g., Assets, Inventory) is encapsulated within its own module in `apps/api/src/modules/`.
- **Real-time Communication:** Utilizes Socket.IO (`@nestjs/platform-socket.io`) for real-time notifications (`apps/api/src/modules/notifications/notifications.gateway.ts` and `apps/web/src/hooks/useRealtimeNotifications.ts`).

## Layers
- **Presentation Layer (Web):** React components, layouts, and pages (e.g., `apps/web/src/pages/`, `apps/web/src/components/`).
- **Data Access Layer (Web):** Axios service wrappers and React Query hooks (`apps/web/src/services/`).
- **Transport Layer (API):** NestJS Controllers handling REST endpoints (`apps/api/src/modules/**/*.controller.ts`).
- **Business Logic Layer (API):** NestJS Services handling core logic and data manipulation (`apps/api/src/modules/**/*.service.ts`).
- **Persistence Layer (API):** Prisma service acting as the ORM to interact with PostgreSQL (`apps/api/src/database/prisma.service.ts`).

## Data Flow
1. **Client Action:** User interacts with a React component (e.g., submitting an asset form).
2. **Frontend Validation:** The form data is validated using shared Zod schemas (`packages/shared-validators`).
3. **API Request:** React Query triggers an Axios call to the NestJS backend.
4. **Backend Validation:** The incoming request is parsed and validated by a global validation pipe (`apps/api/src/common/pipes/zod-validation.pipe.ts`).
5. **Business Logic Execution:** The relevant NestJS Controller routes the request to its Service, which performs the business logic.
6. **Data Persistence:** The Service calls Prisma to interact with the PostgreSQL database.
7. **Response & Real-time Update:** The API returns a response to the client. If necessary, a WebSocket event is emitted to connected clients via the NotificationsGateway.
8. **Client Update:** React Query updates its cache, triggering a re-render of the relevant React components.

## Key Abstractions
- **Domain Modules:** The backend logic is strictly divided into domain-specific modules such as `auth`, `users`, `assets`, `inventory`, `network`, `licenses`, `organization`, and `audit`.
- **Shared DTOs & Entities:** Cross-boundary data structures are abstracted in `packages/shared-types` to ensure type consistency.

## Entry Points
- **Web Frontend:** `apps/web/src/main.tsx` and `apps/web/src/app/App.tsx`.
- **API Backend:** `apps/api/src/main.ts` and `apps/api/src/app.module.ts`.

## Architectural Constraints
- **Strict Typing:** TypeScript must be used strictly across all applications and packages.
- **Shared Logic:** Any domain logic, types, or validation schemas required by both the frontend and backend MUST be placed in the `packages/` directory.
- **Database Access:** Direct database access is restricted to the backend API (`apps/api/src/database/`). The frontend must communicate via the API.
- **Dependency Management:** Dependencies must be managed via pnpm workspaces to ensure versions align properly across the monorepo.

## Anti-Patterns
- **Duplicated Types:** Defining API request/response types in the frontend or backend instead of using `packages/shared-types`.
- **Direct DB Queries from Controllers:** Skipping the Service layer and calling Prisma directly from a Controller.
- **Frontend State Bloat:** Storing server data in Zustand instead of utilizing React Query for fetching and caching.

## Error Handling
- **Backend:** Global HTTP and Prisma exception filters are utilized to format error responses consistently (`apps/api/src/common/filters/http-exception.filter.ts`, `apps/api/src/common/filters/prisma-exception.filter.ts`).
- **Frontend:** API errors are handled globally via Axios interceptors and presented to the user. React Error Boundaries (`apps/web/src/components/ErrorBoundary.tsx`) capture uncaught render errors.

## Cross-Cutting Concerns
- **Authentication & Authorization:** Managed by the Auth Module using JWT strategy (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`).
- **Logging & Auditing:** Audit logs are generated for significant actions and persisted via the Audit Module (`apps/api/src/modules/audit/audit.service.ts`).
- **Validation:** Enforced uniformly by Zod schemas shared between client and server.

---
*Architecture analysis: 2026-08-17*

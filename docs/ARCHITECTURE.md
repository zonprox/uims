<!-- generated-by: gsd-doc-writer -->
# Architecture Overview

## System Overview
Unified IT Management System (UIMS) is an enterprise IT management platform designed to centralize the administration of IT infrastructure, assets, networks, and organizational structures.
- **Backend:** NestJS 11 (Node.js 22+, TypeScript 7) providing a modular RESTful API and real-time WebSocket gateway. Interactive OpenAPI / Swagger documentation is generated via `@nestjs/swagger` at `/api/v1/docs`.
- **Frontend:** React 19 Single Page Application (SPA) built with Vite 8 and Ant Design 6 (`antd`). Client-side state is managed using Zustand 5, server-state caching and synchronization are managed via TanStack Query 5, and real-time events are received via `socket.io-client`.
- **Data Layer:** PostgreSQL 17 (primary relational store accessed via Prisma ORM 7 with `@prisma/adapter-pg`), Redis 8 (caching, sessions, and job queues), Meilisearch (high-performance full-text search engine), SeaweedFS (S3-compatible distributed object storage for assets and files).
- **Asynchronous Processing:** Redis-backed BullMQ 6 worker queues for asynchronous task execution and background jobs.
- **Architecture Style:** Modular Monolith API with a React SPA frontend, deployed as containerized micro-services via Docker Compose.

## Component Diagram
```mermaid
graph TD
    Client[Web Browser Client]

    subgraph Frontend ["React SPA - apps/web (React 19 + Ant Design 6)"]
        React[React Components & Pages]
        Zustand[Zustand Stores (Client State)]
        TanStack[TanStack Query (Server State Cache)]
        WSClient[Socket.io Client]
        React --> Zustand
        React --> TanStack
        React --> WSClient
    end

    subgraph Backend ["NestJS API - apps/api (NestJS 11 + Express)"]
        Swagger["OpenAPI / Swagger (/api/v1/docs)"]
        WSGateway[WebSocket Gateway (/notifications)]
        Controller[Controllers / Route Handlers (/api/v1/*)]
        Guards["Guards (JWT, Roles, Permissions, Throttler)"]
        Service[Business Logic Services]
        Workers[BullMQ Workers / Queues]
        Prisma[Prisma ORM 7]

        Controller --> Guards
        Guards --> Service
        Service --> Prisma
        Service --> Workers
        WSGateway <--> Service
    end

    subgraph Infrastructure [Data & Infrastructure Layer - Docker Compose]
        Postgres[(PostgreSQL 17)]
        Redis[(Redis 8 / Cache & Queues)]
        Meili[Meilisearch Engine]
        Seaweed[SeaweedFS S3 Storage]
    end

    Client -->|HTTP / REST| Backend
    Client -->|WebSocket Events| WSGateway
    Client -->|Static Web Assets| Frontend
    Frontend -->|HTTP / REST (Axios / TanStack Query)| Controller
    WSClient <-->|Bidirectional Real-time Push| WSGateway

    Prisma --> Postgres
    Service --> Redis
    Workers --> Redis
    Service --> Meili
    Service --> Seaweed
```

## Data Flow
1. **Client Request:** The user triggers an action in the React SPA.
2. **API Call & Mutation:** The frontend sends an HTTP request to the NestJS API using Axios and TanStack Query, or establishes a persistent real-time connection using `socket.io-client`.
3. **Authentication & Authorization:** The NestJS API passes the request through global and route-level guards:
   - `ThrottlerGuard`: Evaluates rate-limiting constraints to prevent abuse.
   - `JwtAuthGuard`: Validates JWT access tokens from authorization headers or cookies (`jwt-auth.guard.ts`).
   - `RolesGuard`: Verifies role assignments for the requested route (`roles.guard.ts`).
   - `PermissionsGuard`: Evaluates fine-grained permissions against role-based access control (RBAC) policies (`permissions.guard.ts`).
4. **Controller Routing:** The request is routed to the corresponding module controller under `apps/api/src/modules/` (e.g., `inventory`, `assets`, `users`).
5. **Business Logic & Asynchronous Processing:** The controller delegates execution to a service. Asynchronous or heavy computational workloads are enqueued to Redis via BullMQ 6 worker queues.
6. **Data Access:** The service interacts with:
   - **PostgreSQL 17** via Prisma 7 ORM with native connection pooling (`@prisma/adapter-pg`) for relational entity operations.
   - **Redis 8** for distributed key-value caching, rate limiting, and session verification.
   - **Meilisearch** for indexed full-text search across assets, inventory, and user records.
   - **SeaweedFS** via S3-compatible endpoints for file and attachment storage.
7. **Response & Auditing:** Mutating operations trigger the `AuditInterceptor` to create tamper-evident, HMAC-signed audit logs. The API standardizes payloads through `TransformInterceptor` returning `{ success: true, data: ..., timestamp: ... }`.
8. **Real-Time WebSocket Updates:** When relevant events or notifications occur, the `NotificationsGateway` dispatches real-time WebSocket messages via `@nestjs/websockets` and Socket.io to connected clients.
9. **Client State Update:** TanStack Query handles server-state cache invalidation and refetching, while Zustand stores update local client state (e.g., `auth.store.ts`, `notification-settings.store.ts`, `theme.store.ts`, `timezone.store.ts`), triggering reactive UI updates.

## Key Abstractions
- **Shared Monorepo Libraries:** Managed under `packages/` to enforce unified typing and validation between backend and frontend:
  - `packages/shared-types`: Canonical TypeScript interfaces, models, and DTO definitions.
  - `packages/shared-validators`: Shared Zod validation schemas enforcing consistent validation rules on client forms and API endpoints.
  - `packages/shared-utils`: Common helper utilities, string manipulation, and Day.js date formatters.
  - `packages/eslint-config`: Monorepo-wide ESLint configurations ensuring code style consistency.
- **NestJS Guards & Interceptors:** Core security and processing pipeline abstractions:
  - `apps/api/src/common/guards/jwt-auth.guard.ts`: JWT authentication token validation.
  - `apps/api/src/common/guards/roles.guard.ts`: Role-based route access controls.
  - `apps/api/src/common/guards/permissions.guard.ts`: Fine-grained permission checks.
  - `apps/api/src/common/interceptors/audit.interceptor.ts`: Automated cryptographic audit logging for state-modifying requests.
  - `apps/api/src/common/interceptors/transform.interceptor.ts`: Standardized response envelope serialization.
- **Frontend State Management:**
  - **Zustand Stores:** Client-side state in `apps/web/src/stores/`:
    - `auth.store.ts`: Authentication state, session tokens, and current user identity.
    - `notification-settings.store.ts`: Real-time notification preferences, sound, and display options.
    - `theme.store.ts`: Ant Design theme tokens, color presets, and dark/light mode toggles.
    - `timezone.store.ts`: User timezone preferences and locale settings.
  - **TanStack Query (v5):** Caching, query deduping, background synchronization, and optimistic mutation handling for server entities.
- **Real-Time Communication:** `NotificationsGateway` using `@nestjs/websockets` and `socket.io` on the server, paired with `useRealtimeNotifications` hook and `socket.io-client` on the web client.
- **Prisma Schema & Database Access:** Located in `apps/api/prisma/schema.prisma`, acting as the single source of truth for the database schema, entity migrations, and typed Prisma Client generation.
- **API Documentation:** Interactive OpenAPI specification generated at runtime via `@nestjs/swagger` accessible at `/api/v1/docs`.
- **UI Components & Layouts:** Reusable modular UI components (`CommandPalette.tsx`, `NotificationDrawer.tsx`, `<Can />` RBAC components) in `apps/web/src/components/` and framing structures (`MainLayout.tsx`, `AuthLayout.tsx`) in `apps/web/src/layouts/`.

## Directory Structure Rationale
The monorepo leverages Turborepo (`turbo.json`) and pnpm workspaces (`pnpm-workspace.yaml`) to optimize build pipelines, cache task outputs, and manage internal dependencies:
- `apps/api/`: Contains the NestJS 11 backend service. It is modularized into discrete domain-specific feature modules under `src/modules/`:
  - `assets`: Hardware lifecycle tracking, asset tagging, status transitions, and assignments.
  - `audit`: Tamper-evident, HMAC-signed security audit logging and query capabilities.
  - `auth`: User authentication, session refresh, credential validation, and password resets.
  - `dashboard`: Aggregated telemetry, KPI metrics, and system activity summaries.
  - `directory`: Corporate directory synchronizations and LDAP/identity integration points.
  - `health`: Service liveness, readiness probes, and database/Redis health indicators.
  - `inventory`: Consumable parts and supplies tracking, stock thresholds, and reorder levels.
  - `licenses`: Software license compliance, seat allocations, expiration alerts, and keys.
  - `network`: IP address management (IPAM), subnets, VLAN allocations, and network devices.
  - `notifications`: Notification dispatch, read state persistence, and WebSocket push events.
  - `organization`: Hierarchical organizational tree (companies, branches, departments, positions).
  - `reports`: Analytical reports, asset depreciation models, and data exports.
  - `roles`: Role-based access control (RBAC), permission definitions, and user assignment.
  - `search`: Full-text search integration across entities utilizing Meilisearch.
  - `settings`: System-wide settings and tenant-specific configuration parameters.
  - `users`: User administration, identity records, and profile management.
- `apps/web/`: Contains the React 19 frontend SPA:
  - `src/pages/`: Domain-specific route views (`access`, `assets`, `audit`, `auth`, `dashboard`, `directory`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `settings`, `users`).
  - `src/components/`: Reusable interface components, access guards (`<Can />`), and modal utilities.
  - `src/layouts/`: Global layout wrappers (`MainLayout`, `AuthLayout`) providing sidebar navigation and header controls.
  - `src/stores/`: Zustand client stores (`auth.store.ts`, `notification-settings.store.ts`, `theme.store.ts`, `timezone.store.ts`).
  - `src/services/`: Configured Axios client instances with automatic token refresh interceptors.
  - `src/hooks/`: Reusable React hooks for real-time notifications, access evaluation, and layout state.
- `packages/`: Shared libraries maintaining DRY domain logic and compile-time type safety:
  - `eslint-config`: Shared linting rules and code style standards.
  - `shared-types`: Canonical TypeScript models, interfaces, and DTO contracts.
  - `shared-utils`: Shared date utilities, formatters, and helper algorithms.
  - `shared-validators`: Shared Zod validation schemas across web and API boundary points.
- `docker-compose.yml`: Multi-service orchestration configuring PostgreSQL 17, Redis 8, Meilisearch, SeaweedFS (Master, Volume, Filer), NestJS API, and React Web Nginx containers.

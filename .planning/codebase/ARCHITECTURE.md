# UIMS Architecture Analysis

## 1. System Architecture Pattern
UIMS (Unified IT Management System) follows a **Modular Monolith** architecture pattern. It isolates domain logic into specific feature modules within a single NestJS backend while maintaining a cleanly decoupled React frontend. The monorepo uses Turborepo and pnpm workspaces to share code (types, utilities, validators) between the client and server.

- **Frontend**: React SPA served via Vite.
- **Backend**: NestJS application exposing REST APIs and WebSockets.
- **Database**: PostgreSQL 17 managed via Prisma 7 ORM.
- **Cache / PubSub**: Redis 8 for caching, session management, and WebSocket adapter/events.

## 2. Backend Architecture (apps/api)

### 2.1 Module Organization
The API is divided into strongly cohesive, loosely coupled domain modules located in `apps/api/src/modules/`:
- **Core Domains**: `inventory` (tracking stock/parts), `network` (IPAM and VLANs), `assets` (hardware and lifecycle), `licenses` (software allocations), `directory` (employee structures), `organization` (departments/locations).
- **System/Support Domains**: `auth`, `roles`, `users`, `notifications`, `search`, `audit`, `reports`, `settings`, `health`, `dashboard`.

Each module strictly encapsulates its controllers, services, DTOs, and event handlers. Cross-module communication is achieved via service injection or event emission rather than circular dependencies, enforcing strong boundaries. 

### 2.2 API Layer & Request Lifecycle
- **Routes**: Prefixed with `api/v1` and documented automatically via Swagger/OpenAPI.
- **Request Flow**: `HTTP Request -> Global Middleware (Helmet, CORS) -> Global Interceptors (Transform) -> Global Guards (Throttler, Auth, Roles, Permissions) -> Controller -> Service -> Prisma Repository -> PostgreSQL`.
- **Controllers**: Handle HTTP routing, payload parsing, and parameter decoration (`@ClientIp`, `@Public`).
- **Validation**: `ValidationPipe` is used globally with `whitelist: true` and `forbidNonWhitelisted: true` to prevent parameter pollution and ensure strict typing at runtime.

### 2.3 Authentication & Authorization
- **Authentication**: JWT-based authentication via `AuthModule`. `JwtAuthGuard` is applied globally by default. Routes can opt-out using the `@Public()` decorator. The strategy automatically extracts and validates tokens from headers.
- **Authorization**: Role-based (RBAC) and Permission-based (PBAC) access control using `@Roles()` and `@RequirePermissions()` decorators. Evaluated by `RolesGuard` and `PermissionsGuard` sequentially after authentication is confirmed. Refresh token strategies can be implemented alongside Redis for immediate invalidation.

### 2.4 Data Access & ORM
- **Prisma ORM**: Configured globally via `PrismaModule`. 
- **Database Schema**: Unified schema in `apps/api/prisma/schema.prisma`. 
- **Data Flow**: Services inject `PrismaService` to execute strongly typed queries. Exception filtering (`PrismaExceptionFilter`) automatically handles database errors (e.g., unique constraint violations, foreign key errors) and maps them to appropriate HTTP responses, preventing raw database errors from leaking to the client.

### 2.5 Real-time & WebSockets
- **Implementation**: Socket.IO integrated via NestJS Gateways.
- **Usage**: Located in `NotificationsModule` (`notifications.gateway.ts`). Handles real-time system alerts, background task updates, and broadcast messages. 
- **Room Management**: The gateway manages rooms based on user IDs, roles, and tenant/organization identifiers.
- **Scalability**: Redis adapter is configured to support multi-node deployments and pub/sub events.

### 2.6 Background Tasks & Caching
- **Scheduling**: `ScheduleModule` is used for cron jobs (e.g., `scheduled-alerts.worker.ts` which processes notifications and automated reports asynchronously).
- **Caching**: Global `RedisModule` (`RedisService`) provides structured caching for expensive queries, active user session state, and rate-limiting counters. Cache invalidation strategies are implemented at the service level on mutation.

---

## 3. Frontend Architecture (apps/web)

### 3.1 Frameworks & Tooling
- **Core**: React 19 concurrent features.
- **Routing**: `react-router` (v7 / data routers) leveraging `createBrowserRouter` with lazy-loaded routes and strict Error Boundaries per route segment.
- **Build**: Vite 8 with extensive chunking rules (`VENDOR_RULES` configured in `vite.config.ts`) to optimize bundle size, cacheability, and load times.

### 3.2 Component Hierarchy
- **Entry**: `main.tsx` initializes React DOM and injects core styles.
- **Providers**: `App.tsx` wraps the application in `QueryClientProvider`, Ant Design `ConfigProvider` (for styling), and React Router.
- **Layouts**: `MainLayout` and `AuthLayout` define structural scaffolding.
- **Pages**: Top-level route components located in `src/pages/` (e.g., `inventory/InventoryPage.tsx`, `network/NetworkPage.tsx`).
- **Shared Components**: High-level generic components in `src/components/` (e.g., `CommandPalette.tsx`, `RouteErrorBoundary.tsx`, `TimezoneSelector.tsx`).

### 3.3 State Management
- **Server State**: Managed by TanStack Query 5. Handles API request caching, background refetching, pagination, and optimistic updates.
- **Client State**: Zustand 5 is used for global client-side state, specifically for UI concerns like `theme.store.ts` (light/dark/compact mode), `auth.store.ts` (JWT session), `notification-settings.store.ts`, and `timezone.store.ts`.

### 3.4 Styling & UI Library
- **Component Library**: Ant Design v6+ (`antd`, `@ant-design/pro-components`).
- **Styling**: Semantic token-based styling via Ant Design's CSS-in-JS `ConfigProvider`. Global CSS is minimal (`global.css`), moving away from heavy SCSS/Less reliance and utilizing built-in theme tokens.

---

## 4. Shared Packages (packages/)

The workspace utilizes internal shared packages to ensure type safety and DRY principles across the monorepo stack:
- **`@uims/shared-types`**: Exports TypeScript interfaces, DTO definitions, entity models, and enums. Guarantees that the frontend and backend agree on exact data contracts.
- **`@uims/shared-validators`**: Uses Zod for runtime schema validation. Imported by the frontend for form validation (e.g., React Hook Form resolvers) and by the backend for complex invariants.
- **`@uims/shared-utils`**: Common logic such as date formatting (Day.js), network/CIDR calculations, and text formatters.

---

## 5. Error Handling & Logging

- **Backend**: `HttpExceptionFilter` and `PrismaExceptionFilter` provide a unified error response structure. `AuditInterceptor` automatically logs mutations and significant queries for compliance, forensic tracking, and debugging.
- **Frontend**: `RouteErrorBoundary` catches rendering errors at the route level to prevent entire application crashes. API errors are caught by Axios interceptors and TanStack Query, and surfaced via standard toast notifications.

## 6. Security Architecture

- **CORS**: Enterprise strict configuration managed in `cors.config.ts`, validating dynamic origins.
- **Headers**: Helmet middleware enforces strict security headers (HSTS, disabled CSP for proxy delegation, X-Frame-Options, etc.).
- **Rate Limiting**: Throttler module configured globally (e.g., 1000 requests / 60s) to mitigate brute-force and DoS attacks.
- **Validation**: Strict input validation pipeline drops unknown properties and guarantees strongly typed payloads, mitigating NoSQL injection or prototype pollution vectors.

## 7. CI/CD & Deployment Architecture
- **Workflows**: GitHub Actions (`ci.yml`) is used for Continuous Integration, running tests, linting, and building both backend and frontend on every PR.
- **Dockerization**: The application utilizes multi-stage Docker builds. `Dockerfile` builds optimized production images, separating build dependencies from runtime execution environments.
- **Local Development**: `docker-compose.dev.yml` provisions the local stack (Postgres, Redis) alongside hot-reloading Vite and NestJS servers.
- **Orchestration**: Production uses `docker-compose.yml` defining networks, restart policies, and environment variable bindings.
- **Reverse Proxy**: Nginx handles SSL termination, routing to the frontend statically, and reverse proxying API requests to the NestJS container.

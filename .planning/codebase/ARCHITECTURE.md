<!-- refreshed: 2026-09-09 -->
# UIMS Architecture Analysis

## System Overview

UIMS (Unified IT Management System) is an enterprise-grade modular monolith application designed to manage IT infrastructure, assets, and users. The system leverages a classic three-tier architecture with a strictly typed boundary between the frontend and backend.

```text
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|   Client Browser  +------>|       Nginx       +------>|     Vite SPA      |
|                   | HTTP  |  (Reverse Proxy)  |       |   (React 19)      |
+-------------------+       +--------+----------+       +-------------------+
                                     |
                                     | API / WebSocket
                                     v
                            +--------+----------+
                            |                   |
                            |    NestJS API     |
                            |   (Node.js 22)    |
                            |                   |
                            +----+----+----+----+
                                 |    |    |
          +----------------------+    |    +----------------------+
          |                           |                           |
          v                           v                           v
+---------+---------+       +---------+---------+       +---------+---------+
|                   |       |                   |       |                   |
|  PostgreSQL 17    |       |      Redis 8      |       |  Background Jobs  |
| (Primary Storage) |       | (Cache/PubSub/MQ) |       |     (BullMQ)      |
+-------------------+       +-------------------+       +-------------------+
```

## Component Responsibilities

| Component | Responsibility | Key File Location(s) |
|-----------|----------------|----------------------|
| **API Gateway** | Handles incoming HTTP requests, route mapping, request validation, global error handling, rate limiting. | `apps/api/src/main.ts`, `apps/api/src/app.module.ts` |
| **Authentication** | Manages user sessions, JWT issuance/validation, and password hashing via Passport. | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts` |
| **Authorization** | Enforces RBAC/PBAC at the route level based on the user's assigned roles and permissions. | `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/guards/permissions.guard.ts` |
| **Business Logic** | Core domain logic encapsulated within isolated feature modules. | `apps/api/src/modules/*/` (e.g., `apps/api/src/modules/assets/assets.service.ts`) |
| **Data Access (ORM)** | Executes database queries, handles transactions, connection pooling, and bounded pagination. | `apps/api/src/database/prisma.service.ts` |
| **Background Processing** | Handles asynchronous tasks like scheduled reports, alerting, and data synchronization. | `apps/api/src/modules/notifications/scheduled-alerts.worker.ts` |
| **Real-time Engine** | Manages WebSocket connections for real-time notifications and live updates. | `apps/api/src/modules/notifications/notifications.gateway.ts` |
| **Frontend Routing** | Client-side routing, code splitting, and layout wrapping. | `apps/web/src/app/router.tsx` |
| **State Management** | Global client-side state for theming, user sessions, and localized user preferences. | `apps/web/src/stores/theme.store.ts`, `apps/web/src/stores/auth.store.ts` |
| **Data Fetching** | Server-state synchronization, caching, and optimistic UI updates via TanStack Query. | `apps/web/src/app/query-client.ts`, `apps/web/src/services/*.ts` |
| **Shared Contracts** | Single source of truth for DTOs, Entities, and Enums ensuring end-to-end type safety. | `packages/shared-types/src/index.ts` |
| **Shared Validation** | Zod schemas used by both frontend forms and backend API pipes. | `packages/shared-validators/src/index.ts` |

## Pattern Overview

### Modular Monolith
The backend is structured as a Modular Monolith. Rather than grouping files by technical layer (e.g., all controllers in one folder, all services in another), files are grouped by feature domains (e.g., `users`, `assets`, `inventory`). Each module encapsulates its own controllers, services, DTOs, and internal logic. This structure enables clear boundaries and facilitates potential future extraction into microservices if needed.

### REST API
Communication between the SPA and the NestJS backend strictly follows RESTful principles. Endpoints are resource-oriented, use standard HTTP verbs (GET, POST, PUT, PATCH, DELETE), and rely on standard status codes. Bounded queries are mandatory for all collection endpoints.

### Single Page Application (SPA)
The frontend is a React 19 SPA built with Vite. It handles routing internally via React Router, reducing full page reloads and providing a highly interactive user experience.

## Detailed Layers

### 1. Presentation Layer (React / Ant Design)
Located primarily in `apps/web/src/`. This layer is responsible for presenting data to the user and capturing input. It heavily utilizes Ant Design v6+ components, customized via the global ConfigProvider and App wrapper. The Presentation layer does not hold business logic; it merely dispatches actions to Zustand stores or triggers TanStack Query mutations.

### 2. Application Layer (NestJS Controllers / Gateways)
Located in `apps/api/src/modules/*/*.controller.ts` and `*.gateway.ts`. The Application Layer is the entry point for all external requests. Controllers are intentionally kept thin: they define route definitions, apply decorators for guards/swagger, extract parameters, trigger validation (via DTOs), and immediately delegate to the Domain Layer.

### 3. Domain Layer (NestJS Services)
Located in `apps/api/src/modules/*/*.service.ts`. This is where the core business rules of UIMS reside. Services are responsible for domain logic, orchestrating calls between different repositories, triggering events, and ensuring data integrity. Cross-module dependencies are handled via Dependency Injection.

### 4. Infrastructure Layer (Prisma / Redis / BullMQ)
Located in `apps/api/src/database/` and `apps/api/src/common/redis/`. This layer provides technical capabilities that the domain needs but shouldn't implement directly. It includes the `PrismaService` for relational data access, Redis client for caching/rate-limiting, and BullMQ setup for queuing.

## Key Data Flows

### Primary Request Path (Synchronous)
1. **HTTP Request**: Client sends a request to `/api/v1/assets`.
2. **Middleware**: Request passes through `helmet`, CORS, and `compression` middleware.
3. **Guard Chain**: `JwtAuthGuard` validates the token, `RolesGuard`/`PermissionsGuard` authorize the request, and `ThrottlerGuard` applies rate limits.
4. **Validation Pipe**: `ValidationPipe` intercepts the request body/query, validating it against shared DTOs/Zod schemas.
5. **Controller**: `AssetsController` receives the strictly typed payload.
6. **Service**: `AssetsService` applies business rules and calculates required state changes.
7. **Prisma**: `PrismaService` translates the operation into a deterministic, bounded SQL query.
8. **PostgreSQL**: The database executes the query and returns the results.
9. **Interceptor**: `TransformInterceptor` formats the output into a standard `ApiResponse` format, while `AuditInterceptor` logs the action.
10. **Response**: HTTP 200/201 response is sent back to the client.

### Authentication Flow
1. **Login**: Client submits credentials to `/api/v1/auth/login`.
2. **Validation**: `auth.controller.ts` receives payload, delegates to `auth.service.ts`.
3. **Verification**: Service fetches the user, verifies password via `bcrypt`.
4. **JWT Generation**: Service generates an access token (and optionally a refresh token) containing user claims.
5. **Session**: Token is returned. Future requests include the token in the `Authorization` header.
6. **Guard Chain**: `jwt.strategy.ts` extracts and validates the token on subsequent requests, attaching the `User` object to the request context.

### WebSocket Flow
1. **Socket.io Connection**: Client connects to `/`.
2. **Gateway**: `NotificationsGateway` (`apps/api/src/modules/notifications/notifications.gateway.ts`) accepts the connection and performs auth handshake.
3. **Subscription**: Client subscribes to specific rooms (e.g., `user_${userId}`).
4. **Event Generation**: System events trigger `NotificationsService.emit(...)`.
5. **Broadcast**: Gateway pushes real-time events to connected sockets, triggering UI updates via `useRealtimeNotifications` hook.

### Background Job Flow
1. **Job Enqueue**: A service (e.g., `ReportsService`) enqueues a job into a BullMQ queue backed by Redis.
2. **BullMQ Queue**: Job waits in the queue based on priority and scheduling constraints.
3. **Worker**: A dedicated worker class (e.g., `scheduled-alerts.worker.ts`) pulls the job from the queue.
4. **Processing**: Worker executes the long-running task (e.g., PDF generation, external API sync).
5. **Completion**: Job status is updated, optionally triggering a WebSocket notification to the initiating user.

## Key Abstractions

- **NestJS Modules**: Boundaries for encapsulation (`AssetsModule`, `AuthModule`). They declare imports, controllers, and providers.
- **Guards**: Intercept requests early for security (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`).
- **Decorators**: Custom annotations like `@RequirePermissions()`, `@Public()`, and `@ClientIp()` to declaratively manage route behavior without boilerplate.
- **Pipes**: Data transformation and validation (`ValidationPipe` paired with `class-validator`).
- **Filters**: Catch and standardize exceptions (`HttpExceptionFilter`, `PrismaExceptionFilter`).
- **Interceptors**: Bind extra logic before/after execution (`TransformInterceptor`, `AuditInterceptor`).

## Entry Points

- **Backend API**: `apps/api/src/main.ts` - Bootstraps the NestJS application, configures global middleware, swagger, and starts the server.
- **Frontend SPA**: `apps/web/src/main.tsx` - Bootstraps React into the DOM, applying font and global CSS.
- **Frontend Root App**: `apps/web/src/app/App.tsx` - Wraps the application in crucial providers (QueryClient, ConfigProvider, ProConfigProvider, Router).

## Architectural Constraints

- **Bounded Queries Mandatory**: Unbounded `findMany()` calls are strictly prohibited to protect the database and application memory. All list endpoints must use `PaginationDto`.
- **Deterministic Sorting**: Every query must have a deterministic `orderBy` clause (e.g., `orderBy: { createdAt: 'desc' }`).
- **Single-threaded Event Loop**: Node.js is single-threaded. CPU-intensive tasks must be delegated to background workers to prevent blocking the event loop.
- **Prisma Connection Pooling**: Direct database queries must respect Prisma's connection limits. Transactions should be kept short to avoid pool exhaustion.

## Anti-Patterns

- **Silent Catch Blocks**: `catch (e: any) { }` is prohibited. All errors must be explicitly typed and handled or logged.
- **Cross-Service Circular Dependencies**: Services should not circularly inject each other. If circular dependencies arise, extract the shared logic into a new provider or emit events.
- **Bypassing Shared Packages**: Redefining types or validation schemas locally in `apps/api` or `apps/web` instead of updating `packages/shared-types` or `packages/shared-validators`.
- **Fat Controllers**: Placing business logic or direct Prisma calls inside controllers. Controllers must delegate to services.
- **Hardcoding Magic Strings**: Role names or permission keys should be referenced from `packages/shared-types/src/enums/`.

## Error Handling

- **Global HttpExceptionFilter**: Catches all standard HTTP exceptions, formatting them into a standard `{ statusCode, message, timestamp, path }` structure. `apps/api/src/common/filters/http-exception.filter.ts`.
- **PrismaExceptionFilter**: Catches Prisma-specific ORM errors (e.g., unique constraint violations) and translates them into appropriate HTTP responses (e.g., 409 Conflict). `apps/api/src/common/filters/prisma-exception.filter.ts`.
- **Typed Catches**: The codebase strictly types catch blocks.
- **Frontend ErrorBoundary**: React Error Boundaries (`apps/web/src/components/ErrorBoundary.tsx`) prevent whole-app crashes on render errors. API errors trigger notification toasts or inline `ErrorResultView` components.

## Cross-Cutting Concerns

- **Logging**: The system uses NestJS's structured `Logger` (often backed by Pino in production) for comprehensive telemetry. `console.log` is strictly avoided.
- **Validation**: Enforced uniformly across boundaries using `Zod` (for complex shared schemas in `shared-validators`) and `class-validator` (integrated natively with NestJS pipes).
- **Authentication**: Managed via standard `Passport JWT` strategies.
- **Audit Logging**: Handled declaratively via `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`), automatically tracking mutations (POST/PUT/DELETE) without cluttering service methods.

*Architecture analysis: 2026-09-09*

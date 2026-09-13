# Architecture
> Generated: 2026-09-13 | Focus: Architectural patterns and design decisions

## System Overview
The Unified IT Management System (UIMS) is a modular monolith built within a pnpm workspaces and Turborepo setup. It features a strictly typed NestJS (v11) backend mapping to a React (v19) frontend. Data persistence relies on PostgreSQL (v17) via Prisma (v7), and Redis (v8) is utilized for caching, rate limiting, and background queueing.

## Backend Architecture
### Module Organization
The API app follows a standard NestJS module organization (e.g., `AppModule`, `UsersModule`, `AuthModule`). Feature modules isolate domain logic (controllers, services, DTOs).

### Request Lifecycle
1. **Middleware & Security**: `helmet`, CORS strictly configured, `compression`, `cookie-parser`.
2. **Guards**:
   - `ThrottlerGuard` for rate limiting (1000 requests per minute).
   - `JwtAuthGuard` globally applied.
   - `RolesGuard` and `PermissionsGuard` for RBAC/ABAC authorization.
3. **Pipes**: Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
4. **Interceptors**: Global `TransformInterceptor` and `AuditInterceptor` for response standardisation and activity logging.
5. **Controllers/Services**: Services inject `PrismaService` for DB access and `RedisService` for caching.
6. **Filters**: Global `HttpExceptionFilter` and `PrismaExceptionFilter` for standardised error envelopes.

### Authentication & Authorization
- Controllers are protected by default via `@ApiBearerAuth()` and global guards.
- Route-level overrides exist via `@Roles()` (e.g. `@Roles('Admin', 'Super Admin')`).
- Enterprise-grade hashing via `bcrypt`.

### Data Access Patterns
- **Prisma** is the ORM of choice, centralizing the schema for standard CRUD operations.
- Redis is used as a caching layer (e.g., `cache:roles:permissions`), improving read performance on heavily accessed hierarchical data.

### Background Processing
- Uses `@nestjs/schedule` for cron jobs.
- Implements integration with BullMQ for reliable queue-based execution.

## Frontend Architecture
### Component Architecture
React components are organised logically. Layout components (`MainLayout`, `AuthLayout`) wrap lazily loaded page components. 

### State Management
- Global UI/Theme state is handled efficiently by **Zustand** (e.g., `useThemeStore`).
- Server state and asynchronous data fetching are managed via **TanStack Query** (v5) providing automatic caching, retries, and invalidation.

### Data Fetching
TanStack Query is configured with defensive defaults (`staleTime: 60s`, avoiding retries on `401`/`403`).

### Routing
**React Router** handles complex routing hierarchies. Client-side routing splits components at the route level via `Suspense` with an `ErrorBoundary` wrapping fallback states like `PageLoader`.

## Cross-Cutting Concerns
- **Logging**: Utilises standard NestJS Logger.
- **Error Handling**: Standardised across both ends. Backend standardises payloads, frontend catches via `RouteErrorBoundary`.
- **Security**: Strict CORS policies configured.

## Shared Package Architecture
Located in `packages/`:
- `shared-types`: Unified TypeScript interfaces.
- `shared-utils`: Reusable helpers (e.g., dayjs localization).
- `shared-validators`: Zod/class-validator schemas.
- `eslint-config`: Enforces code standards uniformly.

## Architecture Assessment (2026 Patterns)
- **Strengths**: The adoption of NestJS v11 + React 19 + Prisma 7 is highly aligned with 2026 enterprise standard patterns for TypeScript modular monoliths. Using Zustand and TanStack Query is ideal for managing distinct state concerns.
- **Observations**: The reliance on older REST patterns (vs GraphQL/tRPC) is standard but robustly implemented with comprehensive DTO and Pipe validations. The transition of logic in `UsersService` calling `DirectoryService` hints at active domain decoupling.

# Architecture Overview
**Analysis Date:** 2026-09-08

## System Overview
UIMS is an enterprise monorepo managing IT infrastructure, built on Node.js. The backend uses NestJS with PostgreSQL and Prisma. The frontend uses React 19, Vite, and Ant Design v6. The repository is managed with pnpm and Turborepo.

```mermaid
flowchart TD
    Client[Web Client (React 19)]
    Nginx[Nginx Reverse Proxy]
    API[API Server (NestJS 11)]
    DB[(PostgreSQL)]
    Redis[(Redis Cache & Queues)]
    
    Client -->|HTTPS / API Requests| Nginx
    Nginx --> API
    API -->|Prisma ORM| DB
    API -->|ioredis / BullMQ| Redis
```

## Monorepo Structure
Managed via `pnpm` (workspace: `>=11.0.0`) and `turbo` (`^2.10.11`).
- `apps/api`: NestJS 11 backend service.
- `apps/web`: React 19 SPA frontend.
- `packages/*`: Shared TypeScript code, types, validators, and linting configurations.

## Backend Architecture
**Bootstrap (`apps/api/src/main.ts`)**
- Runs on port 3000 (default) with `api/v1` global prefix.
- Middleware: `helmet` (Enterprise Security Headers), `compression`, `cookie-parser`.
- Strict CORS configuration using `CORS_ORIGIN` or predefined list.
- Uses `ValidationPipe` for global payload validation (`whitelist`, `transform`, `forbidNonWhitelisted`).
- Sets up Swagger Docs (`/api/v1/docs`).

### Module Graph (`apps/api/src/app.module.ts`)
The root `AppModule` integrates:
- Global configs: `ConfigModule`, `ScheduleModule`, `ThrottlerModule`
- Core Modules: `RedisModule`, `PrismaModule`
- Feature Modules:
  - `AssetsModule`
  - `AuditModule`
  - `AuthModule`
  - `DashboardModule`
  - `HealthModule`
  - `InventoryModule`
  - `LicensesModule`
  - `NetworkModule`
  - `NotificationsModule`
  - `OrganizationModule`
  - `ReportsModule`
  - `RolesModule`
  - `SearchModule`
  - `SettingsModule`
  - `UsersModule`

### Guards & Middleware
Global bindings in `AppModule`:
- `ThrottlerGuard`: Rate limiting.
- `JwtAuthGuard`: Enforces valid JWT token using Passport.
- `RolesGuard`: Role-based access control.
- `PermissionsGuard`: Fine-grained permissions.

Located in `apps/api/src/common/`:
- **Guards**: `jwt-auth.guard.ts`, `roles.guard.ts`, `permissions.guard.ts`.
- **Interceptors**: `AuditInterceptor` (logs actions globally), `TransformInterceptor` (response formatting).
- **Filters**: `HttpExceptionFilter`, `PrismaExceptionFilter` (maps database errors to HTTP codes).
- **Pipes**: `zod-validation.pipe.ts` for schema validation using Zod.

### Data Access Patterns
Data access is handled exclusively by `@prisma/client` (`^7.9.1`). Exceptions are globally caught by `PrismaExceptionFilter`.

## Frontend Architecture
**Tech Stack**: React 19.2.8, React Router v8.3.0, Zustand 5.0.15, Tanstack Query 5.101.4, Vite 8.2.1.

### Routing & Code Splitting
- Implemented in `apps/web/src/app/router.tsx`.
- Uses `createBrowserRouter` with lazy loading via React `Suspense`.
- Contains `AuthLayout` and `MainLayout`.
- Feature-based routes mapped to pages in `apps/web/src/pages/` (e.g. `/assets` -> `AssetsPage`, `/network` -> `NetworkPage`).
- Fallback loading screens via `PageLoader`.
- Error handling via `RouteErrorBoundary`.

### State Management
- **Local/UI State**: Handled inside components or via `zustand` (e.g., `auth.store.ts` for Auth tokens and User).
- **Server State**: Managed via `@tanstack/react-query`.

### API Client Pattern
Defined in `apps/web/src/services/api.ts`.
- `axios` (`^1.19.0`) instance pointing to `/api/v1`.
- **Request Interceptor**: Injects `Authorization: Bearer <token>` from the `useAuthStore`.
- **Response Interceptor**: Intercepts 401 Unauthorized errors. It automatically triggers `/auth/refresh` using a request queue mechanism. Queues failed requests during refresh, and replays them upon success, or redirects to `/login` if refresh fails.
- Service modules per feature (e.g., `assets.service.ts`, `users.service.ts`) export methods wrapping this `api` instance.

## Shared Packages
- `@uims/shared-types`: Common TypeScript definitions (DTOs, models).
- `@uims/shared-validators`: Zod schemas for universal validation.
- `@uims/shared-utils`: Helper functions.
- `@uims/eslint-config`: Shared linting rules.

## Data Flow
1. Client interacts with React view.
2. View calls service layer (`apps/web/src/services/*`) or uses Tanstack query hook.
3. API Client (`api.ts`) adds JWT token and sends HTTP request.
4. Nginx proxy forwards to NestJS (`apps/api`).
5. Global Pipes (`ValidationPipe`, `ZodValidationPipe`) validate request payload.
6. Guards (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`) verify authorization.
7. Controller handles request, calls Service layer.
8. Service accesses DB via `PrismaModule`.
9. `AuditInterceptor` logs the transaction if applicable.
10. `TransformInterceptor` shapes the response payload.
11. Response returns to React client, triggering TanStack query re-render.

## Key Architectural Decisions
- **Strict monorepo boundary**: Heavy reliance on Turborepo for workspace tasks and `workspace:*` dependencies.
- **Fail-safe Data Access**: Global exception filter maps Prisma errors, preventing leak of DB internals.
- **Optimized Frontend Delivery**: React Router 8 lazy loading combined with Vite chunking ensures initial bundle size remains small.
- **Robust Auth**: Transparent token refresh implemented at the axios interceptor level.

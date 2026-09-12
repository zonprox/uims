# Project Structure
> Last Updated: 2026-09-12

## Monorepo Root
The UIMS monorepo uses Turborepo and pnpm workspaces.

- `apps/` — Application source code (NestJS & React).
- `packages/` — Shared libraries (types, utils, configs).
- `docker/` — Container definitions (PostgreSQL, Nginx, Compose files).
- `scripts/` — Development and test automation scripts.
- `package.json`, `pnpm-workspace.yaml`, `turbo.json` — Monorepo config.
- `.planning/` — AI Agent planning and codebase documentation context.
- `README.md`, `PROJECT.md`, `AGENTS.md` — Root documentation.

## apps/api/ — NestJS Backend
### Source Structure
- `src/main.ts` — Application entry point.
- `src/app.module.ts` — Root NestJS module.
- `src/config/` — Environment and app configuration.
- `src/common/` — Shared backend utilities.
  - `decorators/` — Custom parameter decorators (`@Public()`, `@ClientIp()`).
  - `filters/` — Global exception filters (`http-exception`, `prisma-exception`).
  - `guards/` — Auth and RBAC guards (`jwt-auth`, `permissions`, `roles`).
  - `interceptors/` — Request transform and audit interceptors.
  - `redis/` — Redis client abstractions.
- `src/database/` — Prisma module and service.
- `src/modules/` — Feature modules.
  - `assets/` — Hardware asset tracking.
  - `audit/` — Audit logging.
  - `auth/` — Authentication and token management.
  - `directory/` — AD/LDAP sync and hierarchy.
  - `health/` — Liveness and readiness checks.
  - `inventory/` — Consumables and items.
  - `licenses/` — Software licenses.
  - `network/` — IPAM, VLANs, subnets.
  - `notifications/` — Realtime notifications.
  - `organization/` — Departments and corp structure.
  - `reports/` — Scheduled report generation.
  - `roles/` — RBAC configuration.
  - `settings/` — Global app settings.
  - `users/` — Application users.

### Prisma
- `prisma/schema.prisma` — Central data model definition.

## apps/web/ — React Frontend
### Source Structure
- `src/app/` — Core React initialization (`App.tsx`, `router.tsx`, `theme.ts`, `query-client.ts`).
- `src/components/` — Shared UI components (`PageContainer`, `ErrorBoundary`, `CommandPalette`, `Access/`).
- `src/hooks/` — Custom React hooks (`useAccess`, `useRealtimeNotifications`, `useSystemHealth`).
- `src/layouts/` — Shell components (`MainLayout`, `AuthLayout`, sidebar logic).
- `src/stores/` — Zustand state management (`auth.store.ts`, `theme.store.ts`).

## packages/ — Shared Libraries
- `packages/shared-types/` — TypeScript interfaces and DTO definitions.
- `packages/shared-validators/` — Zod schemas used by both frontend and backend.
- `packages/shared-utils/` — Common helper functions.
- `packages/eslint-config/` — Linting rules.

## docker/ — Container Configuration
- `docker/postgres/` — PostgreSQL initialization scripts.
- `docker/nginx/` — Reverse proxy configuration.
- `docker-compose.yml` / `docker-compose.dev.yml` — Orchestration definitions.

## scripts/ — Automation
- `scripts/dev.sh` — Local development runner.
- `scripts/test-login.mjs` / `scripts/test-responsive.mjs` — Test scripts.

## Key File Index
| File | Purpose | Module |
|------|---------|--------|
| `apps/api/prisma/schema.prisma` | Core database schema | Database |
| `apps/web/src/app/router.tsx` | Frontend route definitions | Frontend |
| `apps/web/src/stores/auth.store.ts` | Client-side auth state | Frontend |
| `apps/api/src/common/interceptors/audit.interceptor.ts` | Centralized audit logging | Backend |
| `apps/api/src/common/guards/permissions.guard.ts` | Route authorization | Backend |

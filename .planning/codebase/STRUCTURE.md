# UIMS Directory & File Structure

The UIMS project is a full-stack monorepo managed by Turborepo and PNPM workspaces. It contains ~450 source files spread across applications and shared packages.

## 1. Root-Level Organization
- **`apps/`**: Contains the primary runnable applications (API and Web).
- **`packages/`**: Shared libraries and utilities consumed by apps.
- **`docker/`**: Infrastructure configuration, Nginx rules, and database init scripts.
- **`docs/`**: Documentation (notable files like PROJECT.md, AGENTS.md, TEST_READY.md).
- **`scripts/`**: Shell scripts for automation (e.g., `dev.sh` for stack management).
- **`.planning/`**: Agent/planning and AI-related workspace files.
- **Configuration Files**: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `biome.json` (for linting/formatting).

---

## 2. Backend Structure (`apps/api/src/`)
Total Files: ~170 files.

```text
apps/api/src/
├── main.ts                    # Entry point; sets up NestJS, Swagger, Filters, Interceptors
├── app.module.ts              # Root module wiring up all domain modules
├── common/                    # Cross-cutting utilities
│   ├── decorators/
│   ├── dto/
│   ├── filters/               # HttpExceptionFilter, PrismaExceptionFilter
│   ├── guards/                # JwtAuthGuard, RolesGuard, PermissionsGuard
│   ├── interceptors/          # TransformInterceptor, AuditInterceptor
│   └── redis/                 # RedisModule and connection setup
├── config/                    # Configuration loaders and validation (CORS, app config)
├── database/                  # Prisma module and extensions
└── modules/                   # Domain-Driven Modules
    ├── assets/                # Hardware & IT Assets tracking
    ├── audit/                 # Audit logging
    ├── auth/                  # Authentication & JWT strategies
    ├── dashboard/             # Aggregated stats and widgets
    ├── directory/             # Employee & AD/LDAP sync
    ├── health/                # Service health checks
    ├── inventory/             # Consumables and parts inventory
    ├── licenses/              # Software license tracking
    ├── network/               # VLANs, Subnets, IPAM
    ├── notifications/         # Real-time user notifications
    ├── organization/          # Company org chart and locations
    ├── reports/               # Scheduled report generation
    ├── roles/                 # RBAC and permissions management
    ├── search/                # MeiliSearch integration
    ├── settings/              # App-wide settings and JSON configurations
    └── users/                 # Application users and profiles
```
*Note: Each domain module generally contains its own DTOs, Controllers, Services, and optionally specific Guards/Interceptors.*

---

## 3. Frontend Structure (`apps/web/src/`)
Total Files: ~157 files.

```text
apps/web/src/
├── main.tsx                   # Entry point; mounts React to #root
├── app/
│   ├── App.tsx                # ConfigProviders (AntD, React Query), RouterProvider
│   └── router.tsx             # React Router v6 definitions with Lazy Suspense Boundaries
├── components/                # Shared generic UI components (PageLoader, ErrorBoundary)
├── hooks/                     # Shared React hooks
├── layouts/                   # Layout wrappers (AuthLayout, MainLayout)
├── pages/                     # Domain-driven page components
│   ├── access/                # Access control UI
│   ├── assets/                # Assets UI (with internal /components, /hooks, /utils)
│   ├── audit/
│   ├── auth/
│   ├── dashboard/
│   ├── directory/
│   ├── inventory/
│   ├── licenses/
│   ├── network/
│   ├── notifications/
│   ├── organization/
│   ├── reports/
│   ├── settings/
│   └── users/
├── services/                  # API client implementations (Axios or fetch wrappers)
├── stores/                    # Zustand state stores (e.g., theme.store.ts)
└── styles/                    # Global CSS (global.css) and theme variable files
```

---

## 4. Shared Packages (`packages/`)
Total Files: ~124 files.

- **`packages/shared-types`**: Contains TypeScript definitions shared between Web and API. Includes DTOs, Entities, and Enums representing the shared schema.
- **`packages/shared-utils`**: Contains common utility functions, date formatting (e.g., dayjs configuration), strings, math, etc.
- **`packages/shared-validators`**: Zod or Class-Validator schemas utilized by both backend pipes and frontend form validations.
- **`packages/eslint-config`**: Standardized linting rules for the monorepo.

---

## 5. Docker Infrastructure
- **`docker-compose.yml`**: Defines the production-ready infrastructure services:
  - `postgres` (port 5432)
  - `redis` (port 6379)
  - `meilisearch` (port 7700)
  - `seaweedfs-master`, `seaweedfs-volume`, `seaweedfs-filer` (S3 gateway)
  - `api` (NestJS backend)
  - `web` (React frontend served via Nginx)
- **`docker-compose.dev.yml`**: Overrides and volume mounts for local development environments.
- **`docker/nginx/`**: Contains proxy pass rules, SSL certificates setup for the React frontend, and reverse proxying to the API.

---

## 6. Scripts & Tooling
- **`scripts/dev.sh`**: A shell wrapper used in `package.json` (`pnpm stack:start`, `stack:status`) that manages running the infrastructure stack smoothly.
- **Turbo Pipeline**: Defined in `turbo.json`, handles optimal caching for `build`, `lint`, `test`, `typecheck`.
- **Biome**: Fast formatter and linter (`biome.json`) configured via package scripts (`pnpm format`).

# Project Structure
**Analysis Date:** 2026-09-08

## Directory Tree
```
.
├── apps
│   ├── api
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma
│   │   └── src
│   └── web
│       ├── Dockerfile
│       ├── package.json
│       └── src
├── docker
│   ├── nginx
│   └── postgres
├── docker-compose.yml
├── docs
├── package.json
├── packages
│   ├── eslint-config
│   ├── shared-types
│   ├── shared-utils
│   └── shared-validators
└── scripts
```

## Apps
### apps/api/ — Backend
NestJS 11 backend service.
- **src/main.ts**: Entry point.
- **src/app.module.ts**: Root module aggregating features and global providers.
- **src/common/**: Cross-cutting concerns (guards, interceptors, filters, pipes, utils).
- **src/database/**: Prisma ORM configuration and module.
- **src/modules/**: Feature modules:
  - `assets/`, `audit/`, `auth/`, `dashboard/`, `health/`, `inventory/`, `licenses/`, `network/`, `notifications/`, `organization/`, `reports/`, `roles/`, `search/`, `settings/`, `users/`.

### apps/web/ — Frontend
React 19 SPA built with Vite.
- **src/app/**: Core setup (`router.tsx`, `query-client.ts`, `theme.ts`).
- **src/pages/**: Route entry points corresponding to backend features (`assets`, `audit`, `auth`, `dashboard`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `settings`, `users`).
- **src/services/**: API client configuration (`api.ts`) and feature-specific service wrappers (e.g. `assets.service.ts`).
- **src/stores/**: Zustand stores (e.g. `auth.store.ts`).
- **src/components/**, **src/hooks/**, **src/layouts/**, **src/styles/**, **src/utils/**: UI primitives and helpers.

## Packages
Managed internally with `workspace:*` dependencies.
### packages/shared-types/
Shared TypeScript types, interfaces, and DTO types used across frontend and backend.
### packages/shared-validators/
Common validation rules (primarily Zod schemas) for consistent input verification on client and server.
### packages/shared-utils/
Reusable utility functions agnostic to environment.
### packages/eslint-config/
Centralized ESLint 10 configurations to maintain code quality standards across the workspace.

## Configuration Files
- **package.json**: Root definition for `pnpm` workspaces and Turborepo scripts.
- **turbo.json**: Defines Turborepo task pipelines (e.g. `build`, `lint`, `test`, `dev`).
- **pnpm-workspace.yaml**: Lists all packages included in the workspace.
- **biome.json**: Formatting and linting configuration for Biome tool.
- **docker-compose.yml** & **docker-compose.dev.yml**: Orchestrates local dev environment (PostgreSQL, Redis, API, Frontend, Nginx).

## Docker & Infrastructure
Contained in the `docker/` directory.
- **docker/nginx/**: Reverse proxy configuration (`nginx.conf`) for local routing and potential SSL.
- **docker/postgres/**: Database initialization scripts (`init.sql`).
Each app (`apps/api/`, `apps/web/`) contains its own `Dockerfile` and `Dockerfile.dev` for multi-stage building.

## Scripts
Contained in the `scripts/` directory.
- Utility Node.js (ESM) scripts for isolated end-to-end testing or automation.
- E.g., `test-login.mjs` (for automated login flow testing) and `test-responsive.mjs` (UI responsiveness testing).

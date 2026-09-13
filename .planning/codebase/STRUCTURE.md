# Project Structure
> Generated: 2026-09-13 | Focus: Directory layout and file organization

## Monorepo Layout
```
/home/user/projects/uims
├── apps/
│   ├── api/            # NestJS Backend Application
│   └── web/            # React Frontend Application
├── packages/           # Shared Workspace Packages
│   ├── eslint-config/
│   ├── shared-types/
│   ├── shared-utils/
│   └── shared-validators/
├── docker/             # Docker configuration files
├── scripts/            # Development and operational scripts
└── docs/               # System documentation
```

## Backend Structure (apps/api/)
### Source Organization
```
apps/api/src/
├── common/             # Cross-cutting concerns (decorators, filters, guards, interceptors, redis)
├── config/             # Environment & configuration mapping
├── database/           # Prisma service and module
├── modules/            # Domain feature modules
├── app.module.ts       # Root module definition
└── main.ts             # Application bootstrap
```
### Module Layout Pattern
Inside `src/modules/`, logic is compartmentalised into domain-specific folders (e.g. `users`, `auth`, `inventory`). Each follows a standard NestJS file pattern containing controllers, services, DTOs, and the module definition file.

## Frontend Structure (apps/web/)
### Source Organization
```
apps/web/src/
├── app/                # App initialization (App.tsx, router.tsx, query-client.ts)
├── assets/             # Static assets
├── components/         # Reusable UI components
├── hooks/              # Custom React hooks
├── layouts/            # Page layout wrappers (MainLayout, AuthLayout)
├── pages/              # Route-level components split by domain
├── services/           # API interaction and client utilities
├── stores/             # Zustand global state (theme.store.ts)
├── styles/             # Global CSS and theming
└── main.tsx            # React root mount point
```
### Component Layout Pattern
The `pages` directory mirrors the backend modules closely (`users`, `assets`, `dashboard`, `network`, etc.), reinforcing the unified domain boundaries across the monorepo.

## Shared Packages
- **`shared-types`**: Exports TypeScript types/interfaces consumed by both web and api.
- **`shared-utils`**: Contains utility functions such as date manipulation routines.
- **`shared-validators`**: Common validation schemas.
- **`eslint-config`**: Standardized linting rules for the workspace.

## Configuration Files
- **Workspace**: `pnpm-workspace.yaml`, `package.json`, `turbo.json`.
- **Tooling**: `biome.json` (formatter/linter), `.gitignore`, `tsconfig.json`.
- **Docker**: `docker-compose.yml`, `docker-compose.dev.yml`, and `Dockerfile`s within apps.
- **Apps**: `nest-cli.json`, `vite.config.ts`, `vitest.config.ts`, `prisma.config.ts`.

## Scripts & Tooling
The `scripts/` directory hosts bash scripts and dev tooling utilities for managing the monorepo lifecycle.

## Documentation
The `docs/` directory is intended for system documentation, supplemented by `.planning/` files containing AI-generated or structural plans.

## Key Metrics
- **API**: Highly structured feature modules (16+ modules).
- **Web**: Parallel domain structure (14+ page groupings).
- **Monorepo**: Utilizes Turborepo for efficient task running across 2 apps and 4 packages.

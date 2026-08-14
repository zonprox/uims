# Codebase Structure

**Analysis Date:** 2026-08-14

## Directory Layout

```
uims/
├── apps/
│   ├── api/                     # NestJS backend application
│   │   ├── prisma/              # Prisma schema, migrations, and seed script
│   │   └── src/                 # Application source code
│   │       ├── common/          # Shared decorators, filters, guards, interceptors, pipes
│   │       ├── config/          # Centralized configuration modules
│   │       ├── database/        # Prisma service and database module
│   │       ├── modules/         # 14 feature domain modules
│   │       ├── app.module.ts    # Root NestJS application module
│   │       └── main.ts          # Server entry point and middleware configuration
│   └── web/                     # React 19 + Ant Design 6 SPA frontend
│       ├── public/              # Static assets and icons
│       └── src/                 # Frontend source code
│           ├── app/             # Router, theme configuration, QueryClient setup
│           ├── components/      # Shared layout components (PageContainer, CommandPalette, etc.)
│           ├── hooks/           # Custom React hooks (useAuth)
│           ├── layouts/         # Layout shells (MainLayout, AuthLayout)
│           ├── pages/           # 12 domain page components (Dashboard, Assets, Licenses, etc.)
│           ├── services/        # Axios API client and domain service wrappers
│           ├── stores/          # Zustand persistent state stores (auth, theme)
│           ├── styles/          # Global CSS tokens and resets
│           ├── utils/           # Frontend constants and helpers
│           └── main.tsx         # Web application entry point
├── docker/                      # Container infrastructure definitions
│   ├── nginx/                   # Nginx reverse proxy configuration & SSL certs
│   └── postgres/                # PostgreSQL initialization scripts
├── packages/                    # Monorepo shared packages
│   ├── eslint-config/           # Shared ESLint configuration
│   ├── shared-types/            # TypeScript entity types, DTOs, and enums
│   ├── shared-utils/            # Shared formatting and string utilities
│   └── shared-validators/       # Shared Zod validation schemas
├── scripts/                     # Operational, test, and migration scripts
├── .planning/                   # GSD planning, milestone tracking, and codebase maps
│   └── codebase/                # 7 structured codebase documentation files
├── docker-compose.yml           # Production Docker multi-container stack
├── docker-compose.dev.yml       # Development Docker override stack
├── package.json                 # Root monorepo workspace manifest
├── pnpm-workspace.yaml          # pnpm workspace definition
├── turbo.json                   # Turborepo task pipeline configuration
└── biome.json                   # Biome formatting and linting rules
```

## Directory Purposes

**`apps/api/`:**
- Purpose: Enterprise backend REST API and background worker runtime.
- Contains: NestJS modules, controllers, services, database models, and validation logic.
- Key files: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`.
- Subdirectories:
  - `src/common/`: Shared HTTP exception filters, Prisma exception filters, JWT/Role guards, response interceptors.
  - `src/database/`: `PrismaService` connection lifecycle management.
  - `src/modules/`: 14 domain modules (`assets`, `audit`, `auth`, `dashboard`, `directory`, `email`, `health`, `inventory`, `licenses`, `network`, `reports`, `settings`, `tickets`, `users`).

**`apps/web/`:**
- Purpose: Enterprise Single Page Application frontend interface.
- Contains: React 19 components, Ant Design layouts, Zustand stores, and Axios services.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/app/router.tsx`, `apps/web/src/app/theme.ts`, `apps/web/src/layouts/MainLayout.tsx`.
- Subdirectories:
  - `src/pages/`: Feature views (`assets/AssetsPage.tsx`, `dashboard/DashboardPage.tsx`, `tickets/TicketsPage.tsx`, etc.).
  - `src/components/`: Reusable containers (`PageContainer.tsx`, `CommandPalette.tsx`, `NotificationDrawer.tsx`).
  - `src/services/`: HTTP communication adapters (`api.ts`, `assets.service.ts`, `auth.service.ts`, etc.).
  - `src/stores/`: Zustand state (`auth.store.ts`, `theme.store.ts`).

**`packages/shared-types/`:**
- Purpose: Universal TypeScript interfaces, enums, and types shared across apps.
- Key files: `packages/shared-types/src/index.ts`, `packages/shared-types/src/enums/`, `packages/shared-types/src/entities/`, `packages/shared-types/src/dto/`.

**`packages/shared-validators/`:**
- Purpose: Universal Zod validation schemas matching shared data models.
- Key files: `packages/shared-validators/src/index.ts`, `packages/shared-validators/src/*.validator.ts`.

**`packages/shared-utils/`:**
- Purpose: Universal formatting (bytes, currency, dates) and string utility functions.
- Key files: `packages/shared-utils/src/format.ts`, `packages/shared-utils/src/string.ts`, `packages/shared-utils/src/validation.ts`.

**`docker/`:**
- Purpose: Infrastructure orchestration configurations.
- Contains: Nginx reverse proxy configuration (`docker/nginx/nginx.conf`) and Postgres DB init (`docker/postgres/init.sql`).

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Backend server bootstrap and global middleware setup.
- `apps/web/src/main.tsx`: Frontend React root rendering and provider setup.
- `apps/api/prisma/seed.ts`: Initial database seeder for admin accounts and master data.

**Configuration:**
- `package.json`: Root monorepo scripts and workspace devDependencies.
- `pnpm-workspace.yaml`: Monorepo package glob paths.
- `turbo.json`: Task cache pipelines and execution topologies.
- `biome.json`: Root formatting and linting configuration.
- `docker-compose.yml`: Multi-service container orchestration.
- `apps/api/src/config/app.config.ts`: Backend environment variable resolver.
- `apps/web/vite.config.ts`: Frontend bundler config and proxy setup.

**Core Logic:**
- `apps/api/prisma/schema.prisma`: Single source of truth for database schema.
- `apps/api/src/modules/`: Backend business services and controllers.
- `apps/web/src/pages/`: Frontend view controllers and table interfaces.

**Testing:**
- `apps/api/vitest.config.mts`: Backend test runner configuration.
- `apps/web/vitest.config.ts`: Frontend test runner configuration with happy-dom.
- `packages/shared-validators/src/*.test.ts`: Validator unit tests.
- `packages/shared-utils/src/*.test.ts`: Utility function unit tests.
- `apps/web/src/stores/*.test.ts`: Zustand store state transition tests.

## Naming Conventions

**Files:**
- Backend modules: `kebab-case.module.ts`, `kebab-case.service.ts`, `kebab-case.controller.ts`.
- Backend decorators/filters/pipes: `kebab-case.decorator.ts`, `kebab-case.filter.ts`, `kebab-case.pipe.ts`.
- Frontend components & pages: `PascalCase.tsx` (`PageContainer.tsx`, `AssetsPage.tsx`, `MainLayout.tsx`).
- Frontend services & stores: `camelCase.service.ts` or `kebab-case.service.ts`, `name.store.ts`.
- Test files: `*.spec.ts` for backend tests, `*.test.ts` or `*.test.tsx` for frontend/shared package tests.

**Directories:**
- Feature directories: `kebab-case` or lowercase plural/singular (e.g. `assets`, `shared-validators`, `network`).

## Where to Add New Code

**New Backend Domain Feature (e.g. Vendors Module):**
- Module definition: `apps/api/src/modules/vendors/vendors.module.ts`
- Controller: `apps/api/src/modules/vendors/vendors.controller.ts`
- Service: `apps/api/src/modules/vendors/vendors.service.ts`
- DTOs / Schemas: `packages/shared-types/src/dto/vendors.dto.ts` and `packages/shared-validators/src/vendors.validator.ts`
- Register in: `apps/api/src/app.module.ts`

**New Frontend Page / View:**
- Page component: `apps/web/src/pages/{feature}/{Feature}Page.tsx`
- Service client: `apps/web/src/services/{feature}.service.ts`
- Route definition: Register route in `apps/web/src/app/router.tsx`
- Navigation menu item: Add sidebar entry in `apps/web/src/layouts/MainLayout.tsx`

**New Shared Utility / Helper:**
- Implementation: `packages/shared-utils/src/{helper}.ts`
- Export: Re-export from `packages/shared-utils/src/index.ts`
- Unit tests: `packages/shared-utils/src/{helper}.test.ts`

## Special Directories

**`.planning/`:**
- Purpose: Project roadmap, phase execution logs, and architecture documentation.
- Committed: Yes.

**`apps/api/prisma/migrations/`:**
- Purpose: Versioned SQL migrations generated by Prisma CLI.
- Committed: Yes.

**`dist/` & `.turbo/`:**
- Purpose: Build outputs and Turborepo execution caches.
- Committed: No (in `.gitignore`).

---

*Structure analysis: 2026-08-14*
*Update when directory structure changes*

# Codebase Structure

**Analysis Date:** 2026-08-15

## Directory Layout

```
uims/
├── .planning/                  # GSD planning documents and codebase mapping specs
│   └── codebase/               # Architecture, structure, testing, and stack documentation
├── apps/                       # Monorepo application targets
│   ├── api/                    # NestJS 11 backend application
│   │   ├── prisma/             # Prisma schema, migrations, seeders
│   │   │   ├── migrations/     # Versioned SQL schema migration scripts
│   │   │   └── seeders/        # Modular domain database seeder scripts
│   │   └── src/                # Backend TypeScript source code
│   │       ├── common/         # Decorators, DTOs, filters, guards, interceptors, pipes
│   │       ├── config/         # App configuration & Zod environment validator
│   │       ├── database/       # Prisma client service & connection pool
│   │       └── modules/        # 15 domain feature modules
│   └── web/                    # React 19 + Ant Design 6.6 SPA frontend
│       ├── certs/              # Local HTTPS SSL certificates
│       └── src/                # Frontend TypeScript / TSX source code
│           ├── app/            # App root, router, query client, theme builder
│           ├── components/     # Reusable layout and UI components
│           ├── hooks/          # Global custom React hooks
│           ├── layouts/        # MainLayout, AuthLayout, sidebar/navbar components
│           ├── pages/          # 11 Domain page modules
│           ├── services/       # Axios API client & domain service wrappers
│           ├── stores/         # Zustand global stores (auth, theme)
│           ├── styles/         # Global CSS stylesheet
│           └── utils/          # Frontend utility constants
├── docker/                     # Container orchestration & infrastructure config
│   ├── nginx/                  # Nginx proxy configuration & SSL certs
│   └── postgres/               # PostgreSQL init SQL scripts
├── packages/                   # Shared workspace packages
│   ├── eslint-config/          # Shared ESLint configuration
│   ├── shared-types/           # Common TypeScript entities, DTOs, enums
│   ├── shared-utils/           # Pure formatting, enum mapping, validation utilities
│   └── shared-validators/      # Shared runtime Zod schemas
├── scripts/                    # End-to-end and responsive testing automation scripts
├── .env.example                # Environment variable configuration template
├── biome.json                  # Biome linter and formatter configuration
├── docker-compose.yml          # Production multi-service Docker composition
├── docker-compose.dev.yml      # Development Docker composition with hot reload
├── package.json                # Root workspace configuration & Turbo scripts
├── pnpm-workspace.yaml         # pnpm workspace definition
└── turbo.json                  # Turborepo task pipeline configuration
```

## Directory Purposes

**`apps/api`:**
- Purpose: Provides the core REST API backend for UIMS, running NestJS 11, Prisma 7, and PostgreSQL.
- Contains: NestJS modules, controllers, services, database models, migrations, guards, interceptors, and DTOs.
- Key files: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`, `apps/api/src/database/prisma.service.ts`.

**`apps/api/src/modules/`:**
- Purpose: Houses the 15 domain business modules for UIMS operations.
- Contains: Domain controllers (`*.controller.ts`), services (`*.service.ts`), modules (`*.module.ts`), and DTOs (`dto/*.dto.ts`).
- Key files: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/search/search.service.ts`, `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/health/health.controller.ts`.

**`apps/api/src/common/`:**
- Purpose: Houses cross-cutting HTTP infrastructure, security guards, interceptors, exception filters, and pipes.
- Contains: Guard classes (`guards/`), interceptors (`interceptors/`), exception filters (`filters/`), decorators (`decorators/`), and pipes (`pipes/`).
- Key files: `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/interceptors/audit.interceptor.ts`, `apps/api/src/common/interceptors/transform.interceptor.ts`, `apps/api/src/common/filters/http-exception.filter.ts`, `apps/api/src/common/filters/prisma-exception.filter.ts`.

**`apps/web`:**
- Purpose: Delivers the single-page application (SPA) user interface built with React 19, Ant Design 6.6, Vite 8, Zustand 5, and TanStack Query 5.
- Contains: React components, domain page views, responsive layouts, Axios API services, Zustand state stores, and Vite config.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/app/router.tsx`, `apps/web/src/layouts/MainLayout.tsx`, `apps/web/src/services/api.ts`, `apps/web/vite.config.ts`.

**`apps/web/src/pages/`:**
- Purpose: Modular page views for all IT management verticals.
- Contains: Page components, sub-components (`components/`), custom management hooks (`hooks/`), and view unit tests.
- Key files: `apps/web/src/pages/dashboard/DashboardPage.tsx`, `apps/web/src/pages/assets/AssetsPage.tsx`, `apps/web/src/pages/licenses/LicensesPage.tsx`, `apps/web/src/pages/tickets/TicketsPage.tsx`, `apps/web/src/pages/directory/DirectoryPage.tsx`, `apps/web/src/pages/network/NetworkPage.tsx`, `apps/web/src/pages/inventory/InventoryPage.tsx`, `apps/web/src/pages/audit/AuditPage.tsx`, `apps/web/src/pages/reports/ReportsPage.tsx`, `apps/web/src/pages/settings/SettingsPage.tsx`, `apps/web/src/pages/auth/LoginPage.tsx`.

**`packages/shared-types`:**
- Purpose: Monorepo package defining shared TypeScript interfaces, entities, DTOs, API envelopes, and enums.
- Contains: Pure TypeScript type declarations and enums.
- Key files: `packages/shared-types/src/index.ts`, `packages/shared-types/src/dto/api-response.ts`, `packages/shared-types/src/dto/assets.dto.ts`, `packages/shared-types/src/entities/asset.ts`.

**`packages/shared-validators`:**
- Purpose: Monorepo package providing shared runtime validation schemas powered by Zod.
- Contains: Zod schema definitions for auth, assets, users, licenses, and pagination.
- Key files: `packages/shared-validators/src/index.ts`, `packages/shared-validators/src/asset.validator.ts`, `packages/shared-validators/src/auth.validator.ts`.

**`packages/shared-utils`:**
- Purpose: Monorepo package with pure utility helper functions for data transformation, string manipulation, formatting, and enum resolution.
- Contains: Helper functions for status mapping, currency formatting, date helpers, and validation utilities.
- Key files: `packages/shared-utils/src/index.ts`, `packages/shared-utils/src/enum.ts`, `packages/shared-utils/src/format.ts`.

**`docker`:**
- Purpose: Docker orchestration configurations, SSL certs, and container initialization assets.
- Contains: Nginx configuration (`docker/nginx/nginx.conf`), PostgreSQL init scripts (`docker/postgres/init.sql`).
- Key files: `docker/nginx/nginx.conf`, `docker/postgres/init.sql`, `docker-compose.yml`, `docker-compose.dev.yml`.

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Backend NestJS entry point initializing HTTP server, Swagger docs, global guards, filters, and interceptors.
- `apps/web/src/main.tsx`: Frontend React 19 entry point mounting the root application to DOM.
- `apps/api/prisma/seed.ts`: Database seeder execution entry point.
- `apps/web/index.html`: Web application HTML shell loaded by Vite.

**Configuration:**
- `turbo.json`: Turborepo pipeline caching and task execution graph (`build`, `dev`, `lint`, `test`, `typecheck`).
- `pnpm-workspace.yaml`: pnpm monorepo workspace dependencies and package resolution rules.
- `biome.json`: Biome code style, formatter, and linter configuration.
- `apps/web/vite.config.ts`: Vite 8 build configuration, bundle chunk rules, development SSL, and reverse proxy definitions.
- `apps/api/prisma.config.ts`: Prisma configuration.
- `apps/api/nest-cli.json`: NestJS CLI configuration.
- `.env.example`: Template for environment variables (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `MEILISEARCH_HOST`, etc.).

**Core Logic:**
- `apps/api/src/app.module.ts`: Root NestJS module declaring application providers, guards, and module imports.
- `apps/api/prisma/schema.prisma`: Source of truth for PostgreSQL database schema and relations.
- `apps/api/src/database/prisma.service.ts`: Prisma client database connection service with PostgreSQL adapter.
- `apps/api/src/modules/auth/auth.service.ts`: Authentication, credential hashing, and JWT token issuance.
- `apps/api/src/modules/assets/assets.service.ts`: Hardware asset lifecycle management, status mapping, and audit logging.
- `apps/api/src/modules/search/search.service.ts`: Multi-index search orchestrator combining MeiliSearch with database fallback.
- `apps/web/src/app/App.tsx`: Frontend provider hierarchy (QueryClient, ConfigProvider, ProConfigProvider, AntApp, RouterProvider).
- `apps/web/src/app/router.tsx`: Frontend route definitions with lazy-loaded page modules and AuthLayout protection.
- `apps/web/src/services/api.ts`: Axios HTTP client with request token injector and 401 refresh queue interceptor.

## Naming Conventions

**Files:**
- **NestJS Controllers**: kebab-case with `.controller.ts` suffix (e.g. `assets.controller.ts`, `users.controller.ts`).
- **NestJS Services**: kebab-case with `.service.ts` suffix (e.g. `assets.service.ts`, `auth.service.ts`).
- **NestJS Modules**: kebab-case with `.module.ts` suffix (e.g. `assets.module.ts`, `app.module.ts`).
- **NestJS DTOs**: kebab-case with `.dto.ts` suffix inside `dto/` folder (e.g. `create-asset.dto.ts`, `update-ticket.dto.ts`).
- **React Page Components**: PascalCase with `Page.tsx` suffix (e.g. `AssetsPage.tsx`, `DashboardPage.tsx`, `LoginPage.tsx`).
- **React UI Components**: PascalCase with `.tsx` suffix (e.g. `PageContainer.tsx`, `AssetTable.tsx`, `CommandPalette.tsx`).
- **React Custom Hooks**: camelCase with `use` prefix and `.ts` suffix (e.g. `useAssetManagement.ts`, `useLayoutTelemetry.ts`).
- **Zustand Stores**: kebab-case with `.store.ts` suffix (e.g. `auth.store.ts`, `theme.store.ts`).
- **Shared Type Definitions**: kebab-case with `.ts` suffix inside `packages/shared-types/src/` (e.g. `assets.dto.ts`, `asset.ts`).
- **Shared Validators**: kebab-case with `.validator.ts` suffix inside `packages/shared-validators/src/` (e.g. `asset.validator.ts`).
- **Unit Tests**: matching source file name with `.spec.ts` (backend) or `.test.ts` / `.test.tsx` (frontend/shared).

**Directories:**
- **Backend Feature Modules**: kebab-case singular or plural nouns under `apps/api/src/modules/` (e.g. `assets/`, `auth/`, `directory/`, `inventory/`, `licenses/`, `network/`, `tickets/`).
- **Frontend Page Groups**: kebab-case under `apps/web/src/pages/` (e.g. `assets/`, `dashboard/`, `tickets/`, `settings/`).
- **Packages**: kebab-case under `packages/` with `@uims/` package scope (e.g. `packages/shared-types` -> `@uims/shared-types`).

## Where to Add New Code

**New Feature (e.g. Vendors Management):**
- Database Schema: Add `Vendor` model to `apps/api/prisma/schema.prisma` and run `pnpm db:migrate`.
- Shared Types & DTOs: Add interfaces in `packages/shared-types/src/entities/vendor.ts` and `packages/shared-types/src/dto/vendors.dto.ts`, export in `packages/shared-types/src/index.ts`.
- Shared Validation: Add Zod schemas in `packages/shared-validators/src/vendor.validator.ts`, export in `packages/shared-validators/src/index.ts`.
- Backend Module: Create `apps/api/src/modules/vendors/` containing `vendors.module.ts`, `vendors.controller.ts`, `vendors.service.ts`, and `dto/`. Register `VendorsModule` in `apps/api/src/app.module.ts`.
- Backend Tests: Add `apps/api/src/modules/vendors/vendors.service.spec.ts` and `vendors.controller.spec.ts`.
- Frontend Service: Add `apps/web/src/services/vendors.service.ts`.
- Frontend Page: Add `apps/web/src/pages/vendors/VendorsPage.tsx` with sub-components in `apps/web/src/pages/vendors/components/` and hook in `apps/web/src/pages/vendors/hooks/useVendorManagement.ts`.
- Navigation & Routing: Register route in `apps/web/src/app/router.tsx` and add sidebar navigation item in `apps/web/src/layouts/menuConfig.tsx`.
- Frontend Tests: Add `apps/web/src/pages/vendors/hooks/useVendorManagement.test.ts`.

**New Component/Module:**
- Shared Layout Component: Add to `apps/web/src/components/` (e.g. `apps/web/src/components/MetricCard.tsx`).
- Page-specific Subcomponent: Add to `apps/web/src/pages/[feature]/components/` (e.g. `apps/web/src/pages/assets/components/AssetQrModal.tsx`).

**Utilities:**
- Universal Helpers: Add pure functions to `packages/shared-utils/src/` with corresponding unit tests in `packages/shared-utils/src/*.test.ts`.
- Web-specific Helpers: Add to `apps/web/src/utils/`.
- Backend-specific Helpers: Add to `apps/api/src/common/utils/`.

## Special Directories

**`apps/api/prisma/migrations/`:**
- Purpose: Historical SQL migration files tracking database schema evolution.
- Generated: Yes (generated via `pnpm db:migrate` / `prisma migrate dev`).
- Committed: Yes (must be tracked in version control for repeatable deployments).

**`apps/web/certs/`:**
- Purpose: Local development SSL certificate (`cert.pem`) and private key (`key.pem`) for HTTPS dev server.
- Generated: Yes (created during initial SSL setup).
- Committed: Yes (for local dev container HTTPS support).

**`.planning/`:**
- Purpose: Project roadmap, milestone specifications, and codebase mapping artifacts.
- Generated: No.
- Committed: Yes.

**`node_modules/` and `.turbo/`:**
- Purpose: Installed dependencies and Turborepo build cache.
- Generated: Yes.
- Committed: No (ignored via `.gitignore`).

---

*Structure analysis: 2026-08-15*

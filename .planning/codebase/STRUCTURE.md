# Codebase Structure

**Analysis Date:** 2026-08-14

## Directory Layout

```
uims/
├── apps/                               # Applications workspace
│   ├── api/                            # NestJS backend REST API
│   │   ├── prisma/                     # Database schema, migrations, seeders
│   │   │   ├── migrations/             # SQL schema migrations
│   │   │   ├── schema.prisma           # Prisma ORM schema definition
│   │   │   └── seed.ts                 # Database seed script
│   │   ├── src/                        # NestJS source code
│   │   │   ├── common/                 # Global filters, guards, interceptors, pipes, decorators
│   │   │   │   ├── decorators/         # Parameter and route decorators (@CurrentUser, @Roles)
│   │   │   │   ├── dto/                # Standard API response and pagination DTOs
│   │   │   │   ├── filters/            # Global exception filters (HttpException, PrismaException)
│   │   │   │   ├── guards/             # Authentication & role authorization guards
│   │   │   │   ├── interceptors/       # Response transformation & audit interceptors
│   │   │   │   ├── pipes/              # Zod validation pipe
│   │   │   │   └── utils/              # Cryptographic and utility helpers
│   │   │   ├── config/                 # Environment validation and app configuration
│   │   │   ├── database/               # Database connection service (PrismaPg adapter)
│   │   │   ├── modules/                # Domain feature modules
│   │   │   │   ├── assets/             # Hardware asset fleet tracking
│   │   │   │   ├── audit/              # SOC2/ISO 27001 audit logging
│   │   │   │   ├── auth/               # Passport JWT authentication & login
│   │   │   │   ├── dashboard/          # Aggregated metrics & operational KPIs
│   │   │   │   ├── directory/          # AD/LDAP directory sync & employee accounts
│   │   │   │   ├── email/              # Mailbox management & quotas
│   │   │   │   ├── health/             # Service health check endpoint
│   │   │   │   ├── inventory/          # Spare stockroom & consumables inventory
│   │   │   │   ├── licenses/           # Software subscription & seat management
│   │   │   │   ├── network/            # IPAM, subnets, VLANs, static IPs
│   │   │   │   ├── reports/            # Executive analytics & scheduled report suites
│   │   │   │   ├── search/             # Meilisearch engine with database fallback
│   │   │   │   ├── settings/           # System governance & S3 encrypted backup snapshots
│   │   │   │   ├── tickets/            # Helpdesk support incident management
│   │   │   │   └── users/              # Core user identity management
│   │   │   ├── app.module.ts           # Root application module
│   │   │   └── main.ts                 # Application entry point & middleware bootstrap
│   │   ├── Dockerfile                  # Production API container image
│   │   ├── Dockerfile.dev              # Development API container image
│   │   ├── package.json                # API dependencies and scripts
│   │   ├── tsconfig.json               # TypeScript configuration
│   │   └── vitest.config.mts           # Vitest unit & integration test configuration
│   └── web/                            # React 19 + Ant Design frontend SPA
│       ├── certs/                      # Development SSL certificates
│       ├── src/                        # Frontend source code
│       │   ├── app/                    # Application bootstrapping, routes, theme, query client
│       │   │   ├── App.tsx             # Root React component with providers
│       │   │   ├── query-client.ts     # TanStack Query client configuration
│       │   │   ├── router.tsx          # React Router v8 route definitions
│       │   │   └── theme.ts            # Ant Design theme tokens & customization
│       │   ├── components/             # Reusable UI components
│       │   │   ├── CommandPalette.tsx  # Global search & shortcut modal (Cmd+K)
│       │   │   ├── ErrorBoundary.tsx   # React rendering error boundary
│       │   │   ├── NotificationDrawer.tsx # Warning & alert flyout drawer
│       │   │   └── PageContainer.tsx   # Standard page header & KPI card wrapper
│       │   ├── hooks/                  # Custom React hooks (useAuth)
│       │   ├── layouts/                # Application layout shells
│       │   │   ├── AuthLayout.tsx      # Route guard verifying authentication
│       │   │   └── MainLayout.tsx      # Collapsible sidebar, header, navigation shell
│       │   ├── pages/                  # Page route components
│       │   │   ├── assets/             # Hardware Fleet management page
│       │   │   ├── audit/              # Audit Trail & Security logs page
│       │   │   ├── auth/               # Login & authentication page
│       │   │   ├── dashboard/          # Executive operations dashboard
│       │   │   ├── directory/          # Directory & IAM synchronization page
│       │   │   ├── email/              # Email accounts & quota management page
│       │   │   ├── inventory/          # Spare Stockroom & consumables page
│       │   │   ├── licenses/           # SaaS Licenses & subscriptions page
│       │   │   ├── network/            # Network & IPAM management page
│       │   │   ├── reports/            # Executive Reports & schedules page
│       │   │   ├── settings/           # System Governance & backups page
│       │   │   ├── tickets/            # Helpdesk Tickets & SLA management page
│       │   │   └── NotFoundPage.tsx    # 404 fallback page
│       │   ├── services/               # HTTP client & domain API services
│       │   │   ├── api.ts              # Central Axios instance with token refresh queue
│       │   │   └── *.service.ts        # Domain-specific HTTP service wrappers
│       │   ├── stores/                 # Zustand state stores
│       │   │   ├── auth.store.ts       # Auth state, JWT token, user identity
│       │   │   └── theme.store.ts      # Theme mode store ('dark' | 'light')
│       │   ├── styles/                 # Global stylesheets
│       │   │   └── global.css          # CSS resets, custom scrollbars, stat card styles
│       │   ├── utils/                  # Utility helpers and constants
│       │   └── main.tsx                # Browser entry point
│       ├── Dockerfile                  # Production Web container image
│       ├── Dockerfile.dev              # Development Web container image
│       ├── index.html                  # HTML template
│       ├── package.json                # Web dependencies and scripts
│       ├── tsconfig.json               # TypeScript configuration
│       ├── vite.config.ts              # Vite configuration with proxies and aliases
│       └── vitest.config.ts            # Vitest configuration with Happy-DOM
├── packages/                           # Shared monorepo packages
│   ├── eslint-config/                  # Shared ESLint configuration
│   │   ├── index.js                    # ESLint ruleset
│   │   └── package.json
│   ├── shared-types/                   # TypeScript interfaces, enums, DTOs
│   │   ├── src/
│   │   │   ├── dto/                    # API request & response DTOs
│   │   │   ├── entities/               # Data model entity interfaces
│   │   │   ├── enums/                  # System-wide enums
│   │   │   └── index.ts                # Package exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared-utils/                   # Utility formatting and helper functions
│   │   ├── src/
│   │   │   ├── enum.ts                 # Enum mappers and label formatters
│   │   │   ├── format.ts               # Date, currency, byte size formatters
│   │   │   ├── string.ts               # Text truncation, slugification
│   │   │   ├── validation.ts           # Validation helper utilities
│   │   │   └── index.ts                # Package exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared-validators/              # Zod validation schemas
│       ├── src/
│       │   ├── asset.validator.ts      # Asset input validation schemas
│       │   ├── auth.validator.ts       # Login and auth schemas
│       │   ├── common.validator.ts     # ID and common field schemas
│       │   ├── license.validator.ts    # License input schemas
│       │   ├── pagination.validator.ts # Query pagination schemas
│       │   ├── user.validator.ts       # User management schemas
│       │   └── index.ts                # Package exports
│       ├── package.json
│       └── tsconfig.json
├── docker/                             # Infrastructure configuration
│   ├── nginx/                          # Nginx reverse proxy configuration and SSL certs
│   │   ├── nginx.conf
│   │   └── ssl/
│   └── postgres/                       # PostgreSQL initialization scripts
│       └── init.sql
├── scripts/                            # Helper automation scripts
├── .planning/                          # Planning and codebase analysis documents
│   └── codebase/                       # Architectural & structural documentation
├── docker-compose.yml                  # Production Docker multi-container stack
├── docker-compose.dev.yml              # Development Docker stack with live hot-reload
├── package.json                        # Root workspace configuration & scripts
├── pnpm-workspace.yaml                 # pnpm workspace definition
└── turbo.json                          # Turborepo task pipeline configuration
```

## Directory Purposes

**`apps/api`:**
- Purpose: Backend REST API server built on NestJS 11 providing modular endpoints, database access via Prisma, caching, and background job queues.
- Contains: NestJS modules, controllers, services, database migrations, seed scripts, unit/integration tests.
- Key files: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/database/prisma.service.ts`, `apps/api/prisma/schema.prisma`

**`apps/web`:**
- Purpose: Frontend Single-Page Application (SPA) built with React 19, Vite 8, Ant Design 6.6, and Zustand.
- Contains: Layout shells, pages, Ant Design widgets, Axios HTTP services, Zustand state stores, and theme tokens.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/app/router.tsx`, `apps/web/src/layouts/MainLayout.tsx`, `apps/web/src/services/api.ts`

**`packages/shared-types`:**
- Purpose: Canonical TypeScript types, entity definitions, and DTO contracts used across both frontend and backend.
- Contains: Type definitions for assets, licenses, tickets, users, network, audit, email, inventory, and common API envelopes.
- Key files: `packages/shared-types/src/index.ts`, `packages/shared-types/src/dto/api-response.ts`

**`packages/shared-validators`:**
- Purpose: Reusable Zod schema validators for forms and request payload validation.
- Contains: Schemas for authentication, asset creation/updates, license management, pagination, and user records.
- Key files: `packages/shared-validators/src/index.ts`, `packages/shared-validators/src/asset.validator.ts`

**`packages/shared-utils`:**
- Purpose: Shared utility functions for formatting dates, currency, byte sizes, enum status labels, and strings.
- Contains: Pure functional utility methods and unit tests.
- Key files: `packages/shared-utils/src/index.ts`, `packages/shared-utils/src/enum.ts`, `packages/shared-utils/src/format.ts`

**`docker`:**
- Purpose: Infrastructure and container setup for local development and production orchestration.
- Contains: Nginx configuration, self-signed SSL certificates, and PostgreSQL initialization scripts.
- Key files: `docker/nginx/nginx.conf`, `docker/postgres/init.sql`

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Backend entry point; bootstraps NestJS, sets global prefix `/api/v1`, mounts Swagger OpenAPI at `/api/v1/docs`.
- `apps/web/src/main.tsx`: Frontend browser entry point; mounts React root DOM node.
- `apps/api/prisma/seed.ts`: Database seeder creating default Super Admin, roles, assets, and initial records.

**Configuration:**
- `turbo.json`: Turborepo pipeline configuration for `build`, `dev`, `lint`, and `test` task caching.
- `pnpm-workspace.yaml`: Workspace definition mapping `apps/*` and `packages/*`.
- `biome.json`: Biome formatter and linter configuration.
- `docker-compose.yml`: Production Docker service stack definition.
- `docker-compose.dev.yml`: Development Docker overlay with polling watch mode and volume mounts.
- `apps/web/vite.config.ts`: Vite bundling, SSL certificate detection, path aliases, and backend proxying.
- `apps/api/src/config/app.config.ts`: Zod schema validation for backend environment variables.

**Core Logic:**
- `apps/api/src/database/prisma.service.ts`: Prisma PostgreSQL connection manager with `@prisma/adapter-pg`.
- `apps/api/src/common/interceptors/transform.interceptor.ts`: Uniform HTTP response wrapper.
- `apps/api/src/common/filters/http-exception.filter.ts`: Central HTTP exception normalizer.
- `apps/api/src/modules/auth/auth.service.ts`: JWT issue, verification, and bcrypt hashing logic.
- `apps/api/src/modules/search/search.service.ts`: Meilisearch multi-index search with PostgreSQL fallback.
- `apps/web/src/services/api.ts`: Axios client with automatic token refresh queuing.
- `apps/web/src/stores/auth.store.ts`: Persisted authentication state.
- `apps/web/src/components/PageContainer.tsx`: Standard page wrapper layout and KPI metric display.

## Naming Conventions

**Files:**
- NestJS Modules, Controllers, Services: `kebab-case.module.ts`, `kebab-case.controller.ts`, `kebab-case.service.ts` (e.g., `apps/api/src/modules/assets/assets.service.ts`).
- React Components & Pages: `PascalCase.tsx` (e.g., `apps/web/src/pages/assets/AssetsPage.tsx`, `apps/web/src/components/PageContainer.tsx`).
- React Hooks: `camelCase.ts` prefixed with `use` (e.g., `apps/web/src/hooks/useAuth.ts`).
- Frontend Services: `kebab-case.service.ts` or `camelCase.service.ts` (e.g., `apps/web/src/services/assets.service.ts`).
- Zustand Stores: `kebab-case.store.ts` (e.g., `apps/web/src/stores/auth.store.ts`).
- Unit & Integration Tests: `*.spec.ts` (backend) or `*.test.ts` / `*.test.tsx` (frontend/packages).

**Directories:**
- Feature Modules: `kebab-case` plural or noun (e.g., `apps/api/src/modules/assets`, `apps/web/src/pages/directory`).
- Packages: `kebab-case` under `@uims/` namespace (e.g., `packages/shared-types`, `packages/shared-validators`).

## Where to Add New Code

**New Feature (Backend & Frontend):**
- **Data Models:** Add new Prisma models to `apps/api/prisma/schema.prisma` and run `pnpm db:migrate`.
- **Shared Types:** Add DTO interfaces and entity types to `packages/shared-types/src/dto/` and `packages/shared-types/src/entities/`, re-exporting in `packages/shared-types/src/index.ts`.
- **Shared Validation:** Add Zod schema in `packages/shared-validators/src/` and export from `packages/shared-validators/src/index.ts`.
- **Backend Module:** Create module directory `apps/api/src/modules/<feature-name>/` containing:
  - `<feature-name>.module.ts`
  - `<feature-name>.controller.ts`
  - `<feature-name>.service.ts`
  - `<feature-name>.service.spec.ts`
  - Register the module in `apps/api/src/app.module.ts`.
- **Frontend Service:** Create `apps/web/src/services/<feature-name>.service.ts` invoking endpoints through `api`.
- **Frontend Page:** Create `apps/web/src/pages/<feature-name>/<FeatureName>Page.tsx` using `PageContainer`.
- **Route Registration:** Register lazy-loaded page route in `apps/web/src/app/router.tsx` and add sidebar navigation item in `apps/web/src/layouts/MainLayout.tsx`.
- **Command Palette:** Register navigation shortcut in `COMMAND_ITEMS` array in `apps/web/src/components/CommandPalette.tsx`.
- **Tests:** Add unit tests alongside implementation (`*.spec.ts` in NestJS, `*.test.ts` in web/packages).

**New Component/Module (UI Component):**
- Reusable UI component: `apps/web/src/components/ComponentName.tsx`
- Layout wrapper: `apps/web/src/layouts/LayoutName.tsx`

## Special Directories

**`apps/api/prisma/migrations/`:**
- Purpose: Contains timestamped SQL migration files tracking database schema history.
- Generated: Yes (via `prisma migrate dev`).
- Committed: Yes.

**`packages/*/dist/`:**
- Purpose: Compiled ECMAScript modules (`.mjs`) and TypeScript declaration files (`.d.mts`) produced by `tsdown`.
- Generated: Yes (via `turbo run build` or `pnpm build`).
- Committed: No (ignored via `.gitignore`).

**`apps/*/dist/`:**
- Purpose: Production build artifacts (compiled NestJS JavaScript and Vite static frontend bundle).
- Generated: Yes.
- Committed: No.

**`.planning/`:**
- Purpose: High-level architectural, structural, and roadmap documentation.
- Generated: No.
- Committed: Yes.

**`docker/nginx/ssl/`:**
- Purpose: Development SSL certificate and private key for local HTTPS support.
- Generated: Yes (self-signed).
- Committed: Yes.

---
*Structure analysis: 2026-08-14*

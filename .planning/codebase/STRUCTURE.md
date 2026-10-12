---
last_mapped_commit: 513c003639d98df385b56ab541797a216524064b
last_mapped_at: 2026-10-12
---
# Codebase Structure

**Analysis Date:** 2026-10-12

## Directory Layout

```
/home/user/projects/uims/
├── apps/
│   ├── api/                     # NestJS 11 + Prisma 7 REST API & WebSocket Gateway
│   │   ├── prisma/              # Prisma schema, migrations, seeders, and import scripts
│   │   │   ├── migrations/      # Historical SQL migrations
│   │   │   ├── scripts/         # Dedicated data import scripts (e.g. network excel)
│   │   │   └── seeders/         # Modular enterprise database seeders
│   │   ├── src/                 # Backend TypeScript application source
│   │   │   ├── common/          # Shared filters, guards, interceptors, pipes, decorators
│   │   │   ├── config/          # Centralized CORS, environment, and runtime configs
│   │   │   ├── database/        # PrismaService and database lifecycle management
│   │   │   ├── modules/         # Modular monolith domain modules
│   │   │   │   ├── assets/      # Hardware asset management, lifecycle, QR codes
│   │   │   │   ├── audit/       # Cryptographic HMAC-signed audit logs
│   │   │   │   ├── auth/        # Authentication, JWT rotation, password hashing
│   │   │   │   ├── dashboard/   # Aggregated analytics and metrics
│   │   │   │   ├── directory/   # Active Directory, users, org units, CSV import
│   │   │   │   ├── health/      # PostgreSQL & Redis readiness probes
│   │   │   │   ├── inventory/   # Stock levels, consumables, warehouse tracking
│   │   │   │   ├── licenses/    # Software license seats and compliance tracking
│   │   │   │   ├── network/     # IPAM, VLANs, subnets, switches, ports, racks
│   │   │   │   ├── notifications/# WebSocket gateway and scheduled alert workers
│   │   │   │   ├── organization/# Multi-tenant organization boundaries
│   │   │   │   ├── reports/     # CSV & XLSX report generation pipelines
│   │   │   │   ├── roles/       # RBAC roles and permissions management
│   │   │   │   ├── search/      # MeiliSearch full-text search indexing
│   │   │   │   ├── settings/    # Global system settings and preferences
│   │   │   │   └── users/       # Application user management
│   │   │   └── main.ts          # API bootstrap entry point
│   │   ├── test/                # API integration, e2e, and adversarial test suites
│   │   ├── Dockerfile           # Multi-stage container definition for API
│   │   ├── package.json         # API dependencies (@uims/api)
│   │   ├── tsconfig.json        # TypeScript configuration for API
│   │   └── vitest.config.mts    # Vitest configuration for API tests
│   └── web/                     # React 19 + Ant Design v6 + Vite 8 SPA
│       ├── certs/               # Local TLS certificates for HTTPS development
│       ├── src/                 # Frontend TypeScript/React application source
│       │   ├── app/             # Root App, theme configuration, router, query client
│       │   ├── components/      # Reusable Ant Design v6 UI components
│       │   ├── hooks/           # Custom React hooks (health, auth, sockets)
│       │   ├── layouts/         # MainLayout, AuthLayout, navigation menus
│       │   ├── pages/           # Domain view pages and drawers
│       │   ├── services/        # Axios API clients for backend endpoints
│       │   ├── stores/          # Zustand client state stores
│       │   ├── styles/          # Global CSS resets and custom theme overrides
│       │   ├── utils/           # Frontend formatting, validation, and feedback helpers
│       │   └── main.tsx         # Frontend React DOM bootstrap entry point
│       ├── Dockerfile           # Multi-stage container definition for Web SPA
│       ├── package.json         # Web dependencies (@uims/web)
│       ├── tsconfig.json        # TypeScript configuration for Web
│       ├── vite.config.ts       # Vite configuration with HTTPS and proxying
│       └── vitest.config.ts     # Vitest configuration with Happy-DOM for Web tests
├── packages/                    # Monorepo shared packages
│   ├── eslint-config/           # Centralized ESLint configurations
│   ├── shared-types/            # Common TypeScript DTOs, entities, and API envelopes
│   ├── shared-utils/            # Common formatting, date, byte, and error utilities
│   └── shared-validators/       # Shared runtime Zod schemas for forms and DTOs
├── docker/                      # Infrastructure manifests and proxy configurations
│   ├── nginx/                   # Nginx reverse proxy configuration and SSL certs
│   └── postgres/                # PostgreSQL init scripts and schema bootstrap
├── scripts/                     # Operational scripts and daemon management
│   ├── dev.sh                   # Enterprise dev stack daemon CLI
│   └── run-e2e-network.mjs      # Dedicated end-to-end network test runner
├── .planning/                   # GSD planning directory and codebase maps
│   └── codebase/                # 7 authoritative codebase architecture documents
├── docker-compose.yml           # Production-ready container orchestration
├── docker-compose.dev.yml       # Development overrides for containers
├── pnpm-workspace.yaml          # Monorepo workspace configuration
├── turbo.json                   # Turborepo task pipeline configuration
├── biome.json                   # Biome formatting and linting configuration
└── package.json                 # Monorepo root package manifest
```

## Directory Purposes

**`apps/api/`:**
- Purpose: Delivers the core REST API (`/api/v1/*`) and WebSocket gateway (`/notifications`)
- Contains: NestJS controllers, services, modules, guards, filters, and Prisma database schema
- Key files: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`

**`apps/web/`:**
- Purpose: Delivers the modern desktop & responsive IT operations dashboard
- Contains: React 19 pages, Ant Design v6 components, Zustand stores, TanStack Query hooks
- Key files: `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/app/router.tsx`

**`packages/shared-types/`:**
- Purpose: Single authoritative source of truth for cross-boundary TypeScript types and contracts
- Contains: DTO interfaces, enum definitions, response envelopes, and pagination models
- Key files: `packages/shared-types/src/index.ts`, `packages/shared-types/package.json`

**`packages/shared-validators/`:**
- Purpose: Universal runtime validation schemas shared between frontend forms and backend validation
- Contains: Zod schemas for user login, asset registration, network subnets, and licenses
- Key files: `packages/shared-validators/src/index.ts`, `packages/shared-validators/src/asset.validator.ts`

**`packages/shared-utils/`:**
- Purpose: Common stateless utility functions used across backend services and frontend components
- Contains: Dayjs helpers, currency formatters, byte converters, string sanitizers
- Key files: `packages/shared-utils/src/index.ts`, `packages/shared-utils/src/date.util.ts`

**`scripts/`:**
- Purpose: Host environment automation and persistent daemon management
- Contains: `dev.sh` (start, stop, restart, status, logs, url), test orchestration runners
- Key files: `scripts/dev.sh`

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: NestJS server bootstrap on port 3002
- `apps/web/src/main.tsx`: React 19 DOM bootstrap on port 5679
- `scripts/dev.sh`: Dev stack orchestrator CLI

**Configuration:**
- `turbo.json`: Monorepo build and test caching pipelines
- `pnpm-workspace.yaml`: Workspace packages and package build authorization
- `apps/api/src/config/cors.config.ts`: Centralized CORS configuration
- `apps/web/src/app/theme.ts`: Ant Design v6 semantic theme tokens and presets
- `biome.json`: Unified formatter settings

**Core Logic:**
- `apps/api/src/modules/assets/assets.service.ts`: Hardware asset lifecycle and barcode logic
- `apps/api/src/modules/directory/directory.service.ts`: Active Directory and HR sync logic
- `apps/api/src/modules/network/network.service.ts`: IPAM, VLAN, and subnet management
- `apps/web/src/services/api.ts`: Axios client with JWT refresh queue

**Testing:**
- `apps/api/vitest.config.mts`: API Vitest runner configuration
- `apps/web/vitest.config.ts`: Web Vitest runner with Happy-DOM
- `apps/web/src/AppFeedbackSafety.test.tsx`: Enforces dynamic `App.useApp()` feedback safety

## Naming Conventions

**Files:**
- React Components: PascalCase (`PageContainer.tsx`, `AssetsPage.tsx`, `MainLayout.tsx`)
- NestJS Services / Controllers: kebab-case with role suffix (`assets.service.ts`, `assets.controller.ts`, `auth.module.ts`)
- Zustand Stores: kebab-case with store suffix (`auth.store.ts`, `theme.store.ts`)
- Services & Clients: kebab-case with service suffix (`assets.service.ts`, `network.service.ts`)
- Unit / Integration Tests: kebab-case matching target (`assets.service.spec.ts`, `PageContainer.test.tsx`)

**Directories:**
- Domain Modules: lowercase kebab-case (`apps/api/src/modules/assets/`, `apps/web/src/pages/network/`)
- Component Subdirectories: PascalCase for feature clusters (`apps/web/src/components/Access/`)

## Where to Add New Code

**New Domain Feature (e.g. Purchase Orders):**
- Database: Add model to `apps/api/prisma/schema.prisma` and run `pnpm db:migrate`
- Shared Types: Export entity contracts in `packages/shared-types/src/purchase-order.ts`
- Shared Validators: Add Zod validation schemas in `packages/shared-validators/src/purchase-order.validator.ts`
- Backend API: Create `apps/api/src/modules/purchase-orders/` with controller, service, module, and DTOs
- Frontend Service: Add `apps/web/src/services/purchase-orders.service.ts`
- Frontend Page: Add `apps/web/src/pages/purchase-orders/PurchaseOrdersPage.tsx`
- Routing & Navigation: Register route in `apps/web/src/app/router.tsx` and menu item in `apps/web/src/layouts/menuConfig.tsx`
- Tests: Add unit tests co-located (`*.spec.ts`) and E2E tests in `apps/api/test/`

**New Reusable UI Component:**
- Implementation: Add component in `apps/web/src/components/MyComponent.tsx`
- Styling: Apply Ant Design v6 tokens via `styles={{ ... }}`; consume feedback via `App.useApp()`
- Tests: Co-locate test in `apps/web/src/components/MyComponent.test.tsx` with clean `afterEach` teardown

**New Shared Utility:**
- Implementation: Add utility function to `packages/shared-utils/src/` and re-export in `index.ts`
- Tests: Co-locate test in `packages/shared-utils/src/my-util.test.ts`

## Special Directories

**`.planning/`:**
- Purpose: Project roadmap, state tracking, and codebase intelligence documentation
- Generated: Maintained by GSD workflows
- Committed: Yes

**`logs/`:**
- Purpose: Runtime service output logs (`api.log`, `web.log`, `cloudflared.log`)
- Generated: Yes (by `scripts/dev.sh`)
- Committed: No (gitignored)

**`.pids/`:**
- Purpose: Process IDs and tunnel URLs for background daemons
- Generated: Yes (by `scripts/dev.sh`)
- Committed: No (gitignored)

---

*Structure analysis: 2026-10-12*

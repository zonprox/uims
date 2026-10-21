---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# Codebase Structure

**Analysis Date:** 2026-10-14

## Directory Layout

```text
/home/user/projects/uims/
├── apps/
│   ├── api/                     # NestJS 11 + Prisma 7.10 REST API & WebSocket Gateway
│   │   ├── prisma/              # Prisma schema (28 models), migrations, seeders, scripts
│   │   │   ├── migrations/      # Tracked SQL migrations + migration_lock.toml
│   │   │   ├── scripts/         # Dedicated data import scripts (import-network-excel.ts)
│   │   │   ├── seeders/         # Modular domain seeders (assets, audit, directory, etc.)
│   │   │   ├── schema.prisma    # Authoritative PostgreSQL 17 relational schema
│   │   │   └── seed.ts          # Master database seeding entry point
│   │   ├── src/                 # Backend TypeScript application source
│   │   │   ├── common/          # Shared crypto, decorators, DTOs, filters, guards, interceptors, redis, utils
│   │   │   ├── config/          # Centralized CORS (cors.config.ts) & Zod env validation (app.config.ts)
│   │   │   ├── database/        # PrismaModule & PrismaService (@prisma/adapter-pg)
│   │   │   ├── modules/         # 15 Modular Monolith domain modules
│   │   │   │   ├── assets/      # Hardware lifecycle, QR codes, batch assign/return, handover .docx/HTML builder
│   │   │   │   ├── audit/       # HMAC-SHA256 tamper-evident audit logs & entity activity history
│   │   │   │   ├── auth/        # JWT access/refresh rotation, bcrypt hashing, lastLoginAt tracking
│   │   │   │   ├── dashboard/   # Database-level aggregated KPIs and analytics
│   │   │   │   ├── directory/   # Active Directory users, groups, org hierarchy, chunked CSV imports
│   │   │   │   ├── health/      # PostgreSQL & Redis readiness/latency probes (/api/v1/health)
│   │   │   │   ├── inventory/   # Warehouse stock levels, consumables, restock thresholds
│   │   │   │   ├── licenses/    # Software licenses, AES-256-GCM keys, batch seat allocation
│   │   │   │   ├── network/     # IPAM, VLANs, subnets, switches, ports, 42U rack elevations
│   │   │   │   ├── notifications/# Socket.IO gateway & cursor-paginated ScheduledAlertsWorker
│   │   │   │   ├── organization/# Multi-tenant organizations, departments, positions
│   │   │   │   ├── reports/     # Streaming XLSX, custom PDF (pdf-table-generator.ts), & CSV exports
│   │   │   │   ├── roles/       # RBAC roles, permission matrix sync, role cloning
│   │   │   │   ├── search/      # 6-domain MeiliSearch sync & PostgreSQL fallback omnisearch
│   │   │   │   ├── settings/    # System settings and preferences
│   │   │   │   └── users/       # Application user accounts & status management
│   │   │   ├── app.module.ts    # Root NestJS module
│   │   │   └── main.ts          # API bootstrap entry point (port 3002)
│   │   ├── test/                # API e2e, governance, and challenger adversarial test suites
│   │   ├── Dockerfile           # Multi-stage production container definition for API
│   │   ├── package.json         # API dependencies (@uims/api)
│   │   ├── tsconfig.json        # Strict TypeScript configuration for API
│   │   └── vitest.config.mts    # Vitest runner configuration (fileParallelism: false for DB isolation)
│   └── web/                     # React 19.3 + Ant Design 6.6.7 + Vite 8.3 SPA
│       ├── certs/               # Local TLS certificates for HTTPS development on port 5679
│       ├── src/                 # Frontend TypeScript/React application source
│       │   ├── app/             # App.tsx, theme.ts, router.tsx (with RouteErrorBoundary), query-client.ts
│       │   ├── components/      # Reusable UI components (PageContainer, ActivityTimeline, FieldDiffViewer, CommandPalette, etc.)
│       │   ├── hooks/           # Custom hooks (useRealtimeNotifications, useSystemHealth, useDebounce)
│       │   ├── layouts/         # MainLayout, AuthLayout, menuConfig.tsx
│       │   ├── pages/           # Domain pages, tabs, modals, and detail drawers
│       │   │   ├── access/      # AccessControlPage, AppUsersTab, UserDetailDrawer
│       │   │   ├── assets/      # AssetsPage, AssetDetailDrawer, BatchAssignModal, ReturnAssetModal, HandoverDocumentModal
│       │   │   ├── audit/       # AuditPage, chain verification & diff inspection
│       │   │   ├── auth/        # LoginPage
│       │   │   ├── dashboard/   # DashboardPage
│       │   │   ├── directory/   # DirectoryPage, EmployeesTab, GroupsTab
│       │   │   ├── inventory/   # InventoryPage, InventoryDetailDrawer
│       │   │   ├── licenses/    # LicensesPage, LicenseSeatsDrawer, BatchAssignLicensesModal
│       │   │   ├── network/     # NetworkPage, RackElevationView, SwitchFaceplateDrawer, SubnetDetailDrawer
│       │   │   ├── notifications/# NotificationsPage
│       │   │   ├── organization/# OrganizationPage
│       │   │   ├── reports/     # ReportsPage
│       │   │   ├── settings/    # SettingsPage
│       │   │   └── users/       # RolesTab & permission management
│       │   ├── services/        # Axios API service clients (api.ts, assets.service.ts, audit.service.ts, etc.)
│       │   ├── stores/          # Zustand 5 state stores (auth, theme, timezone, notification-settings)
│       │   ├── styles/          # Global CSS & print media queries (global.css)
│       │   ├── utils/           # Form validators, error feedback formatters, export helpers
│       │   └── main.tsx         # Frontend React 19 DOM bootstrap entry point
│       ├── Dockerfile           # Multi-stage container definition for Web SPA
│       ├── package.json         # Web dependencies (@uims/web)
│       ├── tsconfig.json        # Strict TypeScript configuration for Web
│       ├── vite.config.ts       # Vite 8 HTTPS server & /api + /socket.io proxy configuration
│       └── vitest.config.ts     # Vitest configuration with Happy-DOM
├── packages/                    # Monorepo shared workspace libraries (compiled via tsdown)
│   ├── eslint-config/           # Shared ESLint 10 ruleset (@uims/eslint-config)
│   ├── shared-types/            # Entities, DTOs, Enums, and API envelopes (@uims/shared-types)
│   ├── shared-utils/            # Diff engine (diff.ts), formatters, network, timezone, brand (@uims/shared-utils)
│   └── shared-validators/       # Runtime Zod 4.6 schemas (@uims/shared-validators)
├── docker/                      # Infrastructure manifests and proxy configurations
│   ├── nginx/                   # Nginx TLS 1.2/1.3 reverse proxy (nginx.conf) & SSL certs
│   └── postgres/                # PostgreSQL initialization scripts
├── scripts/                     # Operational scripts and daemon management
│   ├── dev.sh                   # Universal dev stack daemon CLI (start|stop|restart|status|logs|url)
│   └── run-e2e-network.mjs      # Automated end-to-end network test runner
├── docs/                        # Reference documentation (including ant-design-llms-full.txt)
├── .planning/                   # GSD project planning & codebase intelligence maps
│   └── codebase/                # 7 authoritative codebase architecture documents
├── docker-compose.yml           # Production container orchestration
├── docker-compose.dev.yml       # Development container overrides (parameterized credentials)
├── pnpm-workspace.yaml          # Monorepo workspace manifest
├── turbo.json                   # Turborepo pipeline configuration
├── biome.json                   # Biome 2.5.15 formatter configuration
└── package.json                 # Monorepo root manifest
```

## Directory Purposes

**`apps/api/`:**
- Purpose: Modular monolith backend exposing `/api/v1/*` REST endpoints, `/api/v1/docs` Swagger UI, and `/notifications` WebSocket gateway.
- Key files: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`.

**`apps/web/`:**
- Purpose: React 19 + Ant Design 6.6.7 SPA serving responsive IT management workflows over HTTPS port 5679.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/app/router.tsx`, `apps/web/src/app/theme.ts`.

**`packages/shared-types/`:**
- Purpose: Authoritative TypeScript interfaces, DTOs (`assets.dto.ts`, `audit.dto.ts`, `search.dto.ts`, etc.), domain entities, and enums.
- Key files: `packages/shared-types/src/index.ts`.

**`packages/shared-utils/`:**
- Purpose: Pure, zero-side-effect cross-platform utilities including field-level diff calculation (`diff.ts`), CIDR/IP helpers (`network.ts`), timezone formatting (`timezone.ts`), and currency/byte formatters (`format.ts`).
- Key files: `packages/shared-utils/src/index.ts`, `packages/shared-utils/src/diff.ts`.

**`packages/shared-validators/`:**
- Purpose: Shared runtime Zod 4.6 validation schemas consumed by both frontend forms and backend DTO validation pipelines.
- Key files: `packages/shared-validators/src/index.ts`.

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: NestJS HTTP & WebSocket bootstrap on port 3002
- `apps/web/src/main.tsx`: React 19 concurrent root mount
- `apps/api/prisma/seed.ts`: Deterministic enterprise database seeder
- `scripts/dev.sh`: Detached process-group (`setsid -f`) stack manager

**Security, Crypto & Config:**
- `apps/api/src/config/app.config.ts`: Fail-fast Zod environment validation with conditional production `REDIS_URL` enforcement
- `apps/api/src/config/cors.config.ts`: Centralized DRY origin allowlisting for REST and WebSockets
- `apps/api/src/common/crypto/license-crypto.ts`: AES-256-GCM encryption/masking for software license keys
- `apps/api/src/common/crypto/directory-crypto.ts`: AES-256-GCM encryption for initial AD and email credentials
- `apps/api/src/common/utils/sanitize.util.ts`: Input sanitization helpers

**Audit, Handover & Reporting Utilities:**
- `packages/shared-utils/src/diff.ts`: `calculateFieldDiff` / `computeFieldDiff` with sensitive field redaction
- `apps/api/src/modules/assets/utils/handover-document.builder.ts`: `.docx` and HTML generator for asset handover/return minutes
- `apps/api/src/modules/reports/utils/pdf-table-generator.ts`: Native PDF tabular report generator
- `apps/web/src/components/ActivityTimeline.tsx` & `FieldDiffViewer.tsx`: Reusable UI audit timeline and expandable diff viewer

## Naming Conventions

**Files:**
- React Components, Drawers & Modals: PascalCase (`AssetDetailDrawer.tsx`, `HandoverDocumentModal.tsx`, `ActivityTimeline.tsx`)
- NestJS Controllers, Services, Modules & Workers: kebab-case with role suffix (`assets.controller.ts`, `assets.service.ts`, `scheduled-alerts.worker.ts`)
- Zustand Stores: kebab-case with `.store.ts` suffix (`auth.store.ts`, `theme.store.ts`)
- Tests: `.spec.ts` in `apps/api` and `packages/shared-utils`; `.test.ts` / `.test.tsx` in `apps/web` and `packages/shared-validators`

**Directories:**
- Domain modules and pages use lowercase kebab-case (`apps/api/src/modules/assets/`, `apps/web/src/pages/licenses/`).

## Where to Add New Code

**New Domain Feature:**
1. **Schema**: Add model and explicit foreign-key `@@index` definitions to `apps/api/prisma/schema.prisma`, then generate migration in `apps/api/prisma/migrations/`.
2. **Shared Contracts**: Add entity and DTO types to `packages/shared-types/src/` and Zod schemas to `packages/shared-validators/src/`.
3. **Backend Module**: Create `apps/api/src/modules/<domain>/` with controller, service (enforcing bounded `take: Math.min(limit, 100)`, deterministic `orderBy`, and `AuditService.recordEntityDiff`), and DTOs.
4. **Frontend Integration**: Add service client in `apps/web/src/services/`, page and drawers (including `<ActivityTimeline />`) in `apps/web/src/pages/<domain>/`, and register route with `ErrorBoundary: RouteErrorBoundary` in `apps/web/src/app/router.tsx`.
5. **Verification**: Add co-located unit/component tests and run `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.

---

*Structure analysis: 2026-10-14*

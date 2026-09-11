# Codebase Structure

**Analysis Date:** 2026-09-11

## Directory Layout

```
uims/
├── apps/
│   ├── api/                          # NestJS 11 REST API Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # 28 models, 91 indexes
│   │   │   ├── migrations/           # PostgreSQL migration history
│   │   │   ├── seed.ts               # Database seeding entry point
│   │   │   ├── seeders/              # Domain-specific seeders
│   │   │   └── scripts/              # Import scripts (Excel)
│   │   ├── src/
│   │   │   ├── main.ts               # API bootstrap entry point
│   │   │   ├── app.module.ts          # Root NestJS module
│   │   │   ├── config/               # Environment validation (Zod)
│   │   │   ├── common/               # Cross-cutting: guards, filters, interceptors, decorators, DTOs
│   │   │   ├── database/             # PrismaService + PrismaModule
│   │   │   └── modules/              # Domain modules (15 modules)
│   │   ├── test/                      # E2E test suites
│   │   ├── vitest.config.mts          # Vitest configuration
│   │   ├── tsconfig.json              # TypeScript config (CommonJS, decorators)
│   │   └── package.json
│   └── web/                           # React 19 + Ant Design v6 SPA
│       ├── certs/                     # Self-signed TLS certs for dev HTTPS
│       ├── src/
│       │   ├── main.tsx               # React DOM entry point
│       │   ├── app/                   # App shell: router, query client, theme
│       │   ├── layouts/               # MainLayout, AuthLayout, sidebar, navbar
│       │   ├── pages/                 # Domain pages (14 page directories)
│       │   ├── components/            # Shared components (ErrorBoundary, PageContainer, etc.)
│       │   ├── hooks/                 # Custom hooks (useAccess, useRealtimeNotifications, etc.)
│       │   ├── stores/                # Zustand state stores (auth, theme, notifications, timezone)
│       │   ├── services/              # API service clients (Axios-based)
│       │   └── styles/                # Global styles
│       ├── vitest.config.ts           # Vitest configuration (happy-dom)
│       ├── vite.config.ts             # Vite dev server + build config
│       ├── tsconfig.json              # TypeScript config (ESNext, bundler)
│       └── package.json
├── packages/
│   ├── shared-types/                  # TypeScript DTOs, entities, enums
│   │   └── src/
│   │       ├── index.ts               # Barrel export
│   │       ├── dto/                   # Request/response DTOs
│   │       └── entities/              # Domain entity interfaces
│   ├── shared-validators/             # Zod validation schemas
│   │   └── src/
│   │       ├── index.ts               # Barrel export
│   │       └── *.validator.ts         # Per-domain validators
│   ├── shared-utils/                  # Common utility functions
│   │   └── src/
│   │       ├── index.ts               # Barrel export
│   │       ├── brand.ts               # Branding utilities
│   │       ├── enum.ts                # Enum mapping utilities
│   │       ├── format.ts              # Formatting utilities
│   │       ├── string.ts              # String utilities
│   │       ├── timezone.ts            # Timezone utilities
│   │       ├── validation.ts          # Validation helpers
│   │       └── network.ts             # Network/CIDR utilities
│   └── eslint-config/                 # Shared ESLint rules
│       └── index.js                   # typescript-eslint + prettier config
├── docker/                            # Docker infrastructure
│   ├── nginx/                         # Nginx TLS proxy config
│   └── postgres/                      # PostgreSQL init scripts
├── scripts/                           # Dev stack management
│   └── dev.sh                         # Start/stop/restart/status/logs daemon
├── docs/                              # Project documentation
├── .agents/                           # GSD agent workspace directories
├── .planning/                         # Planning and codebase map docs
├── docker-compose.yml                 # Infrastructure containers
├── turbo.json                         # Turborepo pipeline config
├── biome.json                         # Biome formatter/linter config
├── pnpm-workspace.yaml                # pnpm workspace definition
├── pnpm-lock.yaml                     # Lockfile
└── package.json                       # Root manifest
```

## Directory Purposes

**`apps/api/src/common/`:**
- Purpose: Cross-cutting infrastructure shared by all modules
- Contains: Guards (JWT, Roles, Permissions), Filters (HTTP, Prisma), Interceptors (Transform, Audit), Decorators (Public, Roles, RequirePermissions, ClientIP), DTOs (Pagination), Redis service
- Key files:
  - `guards/jwt-auth.guard.ts` — Global JWT authentication guard
  - `guards/roles.guard.ts` — Role-based authorization
  - `guards/permissions.guard.ts` — Permission-based authorization
  - `filters/http-exception.filter.ts` — HTTP error formatting
  - `filters/prisma-exception.filter.ts` — Prisma error translation
  - `interceptors/transform.interceptor.ts` — Response envelope wrapper
  - `interceptors/audit.interceptor.ts` — Audit logging interceptor
  - `decorators/public.decorator.ts` — Opt-out of authentication
  - `redis/redis.service.ts` — Redis client with memory fallback

**`apps/api/src/modules/`:**
- Purpose: Domain-specific business modules (one directory per domain)
- Contains: 15 modules — each has `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `*.spec.ts`
- Modules: `assets`, `audit`, `auth`, `dashboard`, `directory`, `health`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `roles`, `search`, `settings`, `users`

**`apps/web/src/pages/`:**
- Purpose: Route-level page components (lazy-loaded)
- Contains: 14 page directories matching API domains
- Pages: `access`, `assets`, `audit`, `auth`, `dashboard`, `directory`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `settings`, `users`

**`apps/web/src/services/`:**
- Purpose: API client layer — Axios-based service functions
- Contains: One service file per domain + shared `api.ts` (Axios instance with interceptors)
- Key files: `api.ts`, `auth.service.ts`, `assets.service.ts`, `directory.service.ts`, etc.

**`apps/web/src/stores/`:**
- Purpose: Client-side state management (Zustand)
- Contains: `auth.store.ts`, `theme.store.ts`, `notification-settings.store.ts`, `timezone.store.ts`

**`apps/web/src/hooks/`:**
- Purpose: Reusable React hooks
- Contains: `useAccess.ts` (permission checks), `useRealtimeNotifications.ts` (WebSocket), `useSystemHealth.ts` (health polling)

**`apps/web/src/components/`:**
- Purpose: Shared reusable components
- Contains: `ErrorBoundary.tsx`, `RouteErrorBoundary.tsx`, `ErrorResultView.tsx`, `PageContainer.tsx`, `PageLoader.tsx`, `CommandPalette.tsx`, `NotificationDrawer.tsx`, `FormattedDate.tsx`, `TimezoneSelector.tsx`
- Subdirectories: `Access/` — Access control UI components

**`apps/web/src/layouts/`:**
- Purpose: Application shell layouts
- Contains: `MainLayout.tsx` (sidebar + navbar + content), `AuthLayout.tsx` (auth guard wrapper)
- `components/` — `SidebarContent`, `NavbarSections`, `LayoutFooter`
- `hooks/` — `useLayoutTelemetry`
- `menuConfig.tsx` — Navigation menu item definitions

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts` — API server bootstrap
- `apps/web/src/main.tsx` — React DOM render root
- `apps/web/src/app/index.tsx` — App component (providers, theme, router)
- `apps/web/src/app/router.tsx` — Route definitions with lazy loading

**Configuration:**
- `apps/api/src/config/app.config.ts` — Zod-validated env vars
- `apps/api/src/app.module.ts` — Root module wiring
- `apps/web/vite.config.ts` — Vite dev/build config
- `apps/web/src/app/theme.ts` — Ant Design theme configuration
- `apps/web/src/app/query-client.ts` — TanStack Query client config

**Database:**
- `apps/api/prisma/schema.prisma` — 28 models, 91 indexes
- `apps/api/src/database/prisma.service.ts` — Prisma client wrapper
- `apps/api/src/database/prisma.module.ts` — Global Prisma module

**Core Logic:**
- `apps/api/src/modules/auth/auth.service.ts` — Authentication logic
- `apps/api/src/modules/notifications/notifications.gateway.ts` — WebSocket gateway
- `apps/api/src/modules/notifications/scheduled-alerts.worker.ts` — Cron worker
- `apps/api/src/modules/search/search.service.ts` — MeiliSearch integration

## Naming Conventions

**Files:**
- `kebab-case.ts` for all TypeScript files: `auth.service.ts`, `jwt-auth.guard.ts`, `create-asset.dto.ts`
- `PascalCase.tsx` for React components: `DashboardPage.tsx`, `ErrorBoundary.tsx`, `MainLayout.tsx`
- `*.spec.ts` / `*.test.ts` for API tests (co-located in same directory)
- `*.test.tsx` for React component tests (co-located)
- `*.adversarial.spec.ts` for adversarial/stress tests

**Directories:**
- `kebab-case` for module/page directories: `shared-types`, `shared-validators`
- `PascalCase` for React component subdirectories: `Access/`
- Flat structure within modules — no deep nesting

## Where to Add New Code

**New API Domain Module:**
1. Create `apps/api/src/modules/{domain}/`
2. Add `{domain}.module.ts`, `{domain}.controller.ts`, `{domain}.service.ts`
3. Add DTO files in `dto/` subdirectory
4. Add spec files: `{domain}.controller.spec.ts`, `{domain}.service.spec.ts`
5. Register module in `apps/api/src/app.module.ts` imports
6. Add shared types to `packages/shared-types/src/dto/{domain}.dto.ts` and `packages/shared-types/src/entities/{domain}.ts`
7. Add validators to `packages/shared-validators/src/{domain}.validator.ts`

**New Frontend Page:**
1. Create `apps/web/src/pages/{domain}/{Domain}Page.tsx`
2. Add route in `apps/web/src/app/router.tsx` with lazy import and Suspense
3. Add API service in `apps/web/src/services/{domain}.service.ts`
4. Add menu entry in `apps/web/src/layouts/menuConfig.tsx`
5. Add test file `{Domain}Page.test.tsx` co-located

**New Shared Utility:**
- Common types: `packages/shared-types/src/dto/` or `packages/shared-types/src/entities/`
- Validation schemas: `packages/shared-validators/src/{domain}.validator.ts`
- Utility functions: `packages/shared-utils/src/{category}.ts`

**New API Guard/Decorator:**
- Guards: `apps/api/src/common/guards/{name}.guard.ts`
- Decorators: `apps/api/src/common/decorators/{name}.decorator.ts`

**New Prisma Model:**
1. Add model to `apps/api/prisma/schema.prisma`
2. Run `pnpm db:migrate` to generate migration
3. Run `pnpm db:generate` to regenerate Prisma client
4. Add indexes for all foreign key columns

## Special Directories

**`.agents/`:**
- Purpose: GSD workflow agent workspace directories
- Generated: Yes (by GSD commands)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: Project planning artifacts, codebase map, roadmap
- Generated: Yes (by GSD commands)
- Committed: Yes

**`dist/` (in each workspace):**
- Purpose: Compiled output
- Generated: Yes (by `pnpm build`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: Dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (gitignored)

**`apps/api/prisma/migrations/`:**
- Purpose: PostgreSQL migration history
- Generated: Yes (by `prisma migrate dev`)
- Committed: Yes

---

*Structure analysis: 2026-09-11*

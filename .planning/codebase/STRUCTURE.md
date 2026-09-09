# Project Structure
**Analysis Date:** 2026-09-09

## Root Layout
```
uims/
├── apps/
│   ├── api/                          # NestJS 11 backend service
│   └── web/                          # React 19 SPA frontend
├── packages/
│   ├── eslint-config/                # Centralized ESLint 10 flat configuration
│   ├── shared-types/                 # Shared TypeScript interfaces, DTOs & enums
│   ├── shared-utils/                 # Reusable utility functions & formatters
│   └── shared-validators/            # Universal Zod validation schemas
├── docker/
│   ├── nginx/                        # Nginx reverse proxy configuration & SSL certs
│   │   ├── nginx.conf
│   │   └── ssl/
│   └── postgres/                     # Database initialization scripts
│       └── init.sql
├── scripts/                          # Automation & test scripts
│   ├── test-login.mjs                # Automated login flow test
│   └── test-responsive.mjs           # Automated responsive layout test
├── docs/                             # Engineering documentation
│   ├── ARCHITECTURE.md
│   ├── CONFIGURATION.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── GETTING-STARTED.md
│   └── TESTING.md
├── .planning/                        # Project planning & codebase analysis
│   └── codebase/                     # In-depth architectural documentation
├── biome.json                        # Biome formatting and linting rules
├── docker-compose.yml                # Production multi-container Docker compose
├── docker-compose.dev.yml            # Local development Docker compose override
├── package.json                      # Monorepo root scripts & dev dependencies
├── pnpm-lock.yaml                    # Strict pnpm lockfile (pnpm v11)
├── pnpm-workspace.yaml               # pnpm workspace configuration
├── README.md                         # Project overview and quickstart
└── turbo.json                        # Turborepo task pipeline definitions
```

---

## Backend Structure (`apps/api/`)

### Directory Tree
```
apps/api/
├── Dockerfile                        # Multi-stage production container build
├── Dockerfile.dev                    # Hot-reloading development container build
├── package.json                      # NestJS dependencies & script definitions
├── prisma.config.ts                  # Prisma CLI configuration
├── tsconfig.json                     # TypeScript compilation settings
├── prisma/
│   ├── migrations/                   # Sequential SQL schema migrations
│   ├── schema.prisma                 # Prisma schema (26 models, 7 enums)
│   ├── seed.ts                       # Master modular database seeder runner
│   └── seeders/                      # Domain-specific seeder modules
│       ├── ad-directory-data.ts      # Active Directory sample datasets
│       ├── assets.seeder.ts          # Hardware asset seeds
│       ├── audit.seeder.ts           # Tamper-evident audit log seeds
│       ├── directory.seeder.ts       # Employee and group seeds
│       ├── inventory.seeder.ts       # Stockroom inventory seeds
│       ├── licenses.seeder.ts        # Software license & seat seeds
│       ├── network.seeder.ts         # IPAM, subnet & VLAN seeds
│       ├── notifications.seeder.ts   # System notification seeds
│       ├── organization.seeder.ts    # Enterprise department & location seeds
│       ├── roles-users.seeder.ts     # RBAC roles & application user seeds
│       ├── settings-reports.seeder.ts# System settings & report schedule seeds
│       └── taxonomy.seeder.ts        # Categories and location taxonomy seeds
└── src/
    ├── app.module.ts                 # Root NestJS module importing all feature modules
    ├── main.ts                       # Application entry point, bootstrap & middleware
    ├── config/
    │   └── app.config.ts             # Zod environment variable schema & validator
    ├── database/
    │   ├── prisma.module.ts          # Global Prisma provider module
    │   └── prisma.service.ts         # PrismaClient extension with @prisma/adapter-pg
    ├── common/                       # Cross-cutting framework concerns
    │   ├── decorators/
    │   │   ├── client-ip.decorator.ts       # Proxy-aware client IP extractor
    │   │   ├── public.decorator.ts          # Exemption from JWT auth
    │   │   ├── require-permissions.decorator.ts # Action:subject permission metadata
    │   │   └── roles.decorator.ts           # RBAC role requirements metadata
    │   ├── dto/
    │   │   └── pagination.dto.ts            # Global page and limit query schema
    │   ├── filters/
    │   │   ├── http-exception.filter.ts     # Standardized HTTP error formatter
    │   │   └── prisma-exception.filter.ts   # Prisma error code mapper (P2002, etc.)
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts            # Passport JWT bearer guard
    │   │   ├── permissions.guard.ts         # Fine-grained permission checker
    │   │   └── roles.guard.ts               # Role-based access control guard
    │   ├── interceptors/
    │   │   ├── audit.interceptor.ts         # HMAC SHA-256 mutation audit logger
    │   │   └── transform.interceptor.ts     # Envelope formatter { success, data }
    │   └── redis/
    │       ├── redis.module.ts              # Redis provider module
    │       └── redis.service.ts             # ioredis client with memory fallback
    └── modules/                      # 16 domain feature modules
        ├── assets/                   # Hardware asset lifecycle management
        │   ├── assets.controller.ts
        │   ├── assets.service.ts
        │   ├── assets.module.ts
        │   └── dto/
        │       ├── create-asset.dto.ts
        │       └── update-asset.dto.ts
        ├── audit/                    # Compliance & audit logging
        │   ├── audit.controller.ts
        │   ├── audit.service.ts
        │   └── audit.module.ts
        ├── auth/                     # Authentication & JWT issuance
        │   ├── auth.controller.ts
        │   ├── auth.service.ts
        │   ├── auth.module.ts
        │   ├── auth.guard.ts
        │   ├── dto/
        │   │   └── login.dto.ts
        │   └── strategies/
        │       └── jwt.strategy.ts
        ├── dashboard/                # Telemetry & executive statistics
        │   ├── dashboard.controller.ts
        │   ├── dashboard.service.ts
        │   └── dashboard.module.ts
        ├── directory/                # Corporate employee directory & AD sync
        │   ├── directory.controller.ts
        │   ├── directory.service.ts
        │   ├── directory.module.ts
        │   └── dto/
        │       ├── create-directory-group.dto.ts
        │       ├── create-directory-user.dto.ts
        │       ├── directory-query.dto.ts
        │       ├── import-directory.dto.ts
        │       └── update-directory-user.dto.ts
        ├── health/                   # Infrastructure liveness & readiness
        │   ├── health.controller.ts
        │   └── health.module.ts
        ├── inventory/                # Stockroom consumables & spare parts
        │   ├── inventory.controller.ts
        │   ├── inventory.service.ts
        │   ├── inventory.module.ts
        │   └── dto/
        │       ├── create-inventory-item.dto.ts
        │       ├── restock-inventory.dto.ts
        │       └── update-inventory-item.dto.ts
        ├── licenses/                 # Software licenses & seat allocation
        │   ├── licenses.controller.ts
        │   ├── licenses.service.ts
        │   ├── licenses.module.ts
        │   └── dto/
        │       ├── create-license.dto.ts
        │       └── update-license.dto.ts
        ├── network/                  # IPAM, subnets & VLAN management
        │   ├── network.controller.ts
        │   ├── network.service.ts
        │   ├── network.module.ts
        │   └── dto/
        │       ├── create-ip.dto.ts
        │       ├── create-subnet.dto.ts
        │       └── update-ip.dto.ts
        ├── notifications/            # Alerts, WebSockets & cron workers
        │   ├── notifications.controller.ts
        │   ├── notifications.service.ts
        │   ├── notifications.gateway.ts     # Socket.io gateway (/notifications)
        │   ├── scheduled-alerts.worker.ts   # Daily cron worker (@Cron)
        │   ├── notifications.module.ts
        │   └── dto/
        │       ├── create-notification.dto.ts
        │       └── notification-query.dto.ts
        ├── organization/             # Organizational hierarchy (depts, locations)
        │   ├── organization.controller.ts
        │   ├── organization.service.ts
        │   ├── organization.module.ts
        │   └── dto/
        │       ├── create-department.dto.ts
        │       ├── create-organization.dto.ts
        │       ├── create-position.dto.ts
        │       ├── update-department.dto.ts
        │       ├── update-organization.dto.ts
        │       └── update-position.dto.ts
        ├── reports/                  # Analytics & scheduled report exports
        │   ├── reports.controller.ts
        │   ├── reports.service.ts
        │   ├── reports.module.ts
        │   └── dto/
        │       └── schedule-report.dto.ts
        ├── roles/                    # RBAC role management & permissions
        │   ├── roles.controller.ts
        │   ├── roles.service.ts
        │   ├── roles.module.ts
        │   └── dto/
        │       ├── clone-role.dto.ts
        │       ├── create-role.dto.ts
        │       ├── sync-permissions.dto.ts
        │       └── update-role.dto.ts
        ├── search/                   # Omni-search engine across all entities
        │   ├── search.controller.ts
        │   ├── search.service.ts
        │   └── search.module.ts
        ├── settings/                 # Global system configuration key-values
        │   ├── settings.controller.ts
        │   ├── settings.service.ts
        │   └── settings.module.ts
        └── users/                    # Platform administration users
            ├── users.controller.ts
            ├── users.service.ts
            ├── users.module.ts
            └── dto/
                ├── create-group.dto.ts
                ├── create-user.dto.ts
                ├── import-users.dto.ts
                ├── toggle-status.dto.ts
                ├── update-user.dto.ts
                └── user-query.dto.ts
```

### Module Organization Pattern
Every feature module follows NestJS separation of concerns:
1. `*.module.ts`: Declares controllers, providers, and imports needed for the module.
2. `*.controller.ts`: Declares REST routes, swagger decorators, guards, and parameter validation pipes.
3. `*.service.ts`: Implements business logic, database transactions (`PrismaService`), and cache operations.
4. `dto/*.dto.ts`: Declares input validation classes using `class-validator` and `class-transformer`.
5. `*.spec.ts`: Unit and adversarial test specifications co-located with implementation files.

---

## Frontend Structure (`apps/web/`)

### Directory Tree
```
apps/web/
├── Dockerfile                        # Multi-stage production container build
├── Dockerfile.dev                    # Hot-reloading development container build
├── index.html                        # HTML application shell
├── package.json                      # React 19 & Ant Design v6 dependencies
├── tsconfig.json                     # TypeScript config with path aliases
├── vite.config.ts                    # Vite bundle config, manual chunks & proxy
├── certs/                            # Local HTTPS certificates for dev server
│   ├── cert.pem
│   └── key.pem
└── src/
    ├── main.tsx                      # DOM root mount
    ├── vite-env.d.ts                 # Vite environment definitions
    ├── app/                          # Core application providers & bootstrap
    │   ├── App.tsx                   # Top-level provider wrapper (Theme, Query, Auth)
    │   ├── query-client.ts           # TanStack QueryClient with retry & cache rules
    │   ├── router.tsx                # React Router v8 lazy routes & boundaries
    │   └── theme.ts                  # Ant Design v6 design token & theme generator
    ├── components/                   # Shared UI primitives
    │   ├── Access/
    │   │   ├── Can.tsx               # Declarative RBAC permission gate wrapper
    │   │   └── index.ts
    │   ├── CommandPalette.tsx        # Cmd+K omni-search modal
    │   ├── ErrorBoundary.tsx         # React class error boundary
    │   ├── ErrorResultView.tsx       # Ant Design error presentation component
    │   ├── FormattedDate.tsx         # Timezone-aware date renderer
    │   ├── NotificationDrawer.tsx    # Slide-over real-time notification drawer
    │   ├── PageContainer.tsx         # View header with breadcrumbs and action buttons
    │   ├── PageLoader.tsx            # Suspense loading spinner
    │   ├── RouteErrorBoundary.tsx    # React Router 404/500 fault barrier
    │   └── TimezoneSelector.tsx      # Timezone configuration selector
    ├── hooks/                        # Custom application hooks
    │   ├── useAccess.ts              # RBAC evaluation hook (can, hasRole, hasPermission)
    │   ├── useRealtimeNotifications.ts# Socket.io alert listener & chime player
    │   └── useSystemHealth.ts        # Telemetry polling with connectivity awareness
    ├── layouts/                      # Layout templates
    │   ├── AuthLayout.tsx            # Authentication check & login redirector
    │   ├── MainLayout.tsx            # Application shell with header, sidebar, footer
    │   ├── menuConfig.tsx            # Navigation sidebar menu items & permission filters
    │   ├── components/               # Subcomponents for layout shell
    │   │   ├── LayoutFooter.tsx
    │   │   ├── MenuCountBadge.tsx
    │   │   ├── NavIconWithBadge.tsx
    │   │   ├── NavbarSections.tsx
    │   │   ├── SidebarBrandHeader.tsx
    │   │   ├── SidebarContent.tsx
    │   │   ├── SidebarFooter.tsx
    │   │   └── SidebarOrgSelector.tsx
    │   └── hooks/
    │       └── useLayoutTelemetry.ts # Telemetry metrics for layout
    ├── pages/                        # Route pages and co-located subcomponents
    │   ├── NotFoundPage.tsx          # 404 fallback page
    │   ├── access/                   # Access Control management
    │   │   ├── AccessControlPage.tsx
    │   │   └── AppUsersTab.tsx
    │   ├── assets/                   # Hardware asset management
    │   │   ├── AssetsPage.tsx
    │   │   ├── components/
    │   │   │   ├── AssetDetailDrawer.tsx
    │   │   │   ├── AssetFilterBar.tsx
    │   │   │   ├── AssetFormModal.tsx
    │   │   │   ├── AssetQrModal.tsx
    │   │   │   ├── AssetScannerModal.tsx
    │   │   │   └── AssetTable.tsx
    │   │   ├── hooks/
    │   │   │   └── useAssetManagement.ts
    │   │   └── utils/
    │   │       └── qrDecoder.ts
    │   ├── audit/                    # Audit log trail viewer
    │   │   └── AuditPage.tsx
    │   ├── auth/                     # Authentication
    │   │   └── LoginPage.tsx
    │   ├── dashboard/                # Metric KPI cards & charts
    │   │   └── DashboardPage.tsx
    │   ├── directory/                # Corporate directory
    │   │   ├── DirectoryPage.tsx
    │   │   ├── DirectoryGroupsTab.tsx
    │   │   └── EmployeesTab.tsx
    │   ├── inventory/                # Stock inventory
    │   │   └── InventoryPage.tsx
    │   ├── licenses/                 # Software licenses
    │   │   └── LicensesPage.tsx
    │   ├── network/                  # IPAM & network
    │   │   ├── NetworkPage.tsx
    │   │   └── components/
    │   │       ├── IpAddressTable.tsx
    │   │       ├── IpFormModal.tsx
    │   │       ├── PingToolModal.tsx
    │   │       ├── SubnetCardList.tsx
    │   │       └── SubnetFormModal.tsx
    │   ├── notifications/            # Notification center
    │   │   └── NotificationsPage.tsx
    │   ├── organization/             # Org hierarchy canvas
    │   │   ├── OrganizationPage.tsx
    │   │   └── OrganizationCanvas.tsx
    │   ├── reports/                  # Analytics & exports
    │   │   └── ReportsPage.tsx
    │   ├── settings/                 # System preferences
    │   │   └── SettingsPage.tsx
    │   └── users/                    # Role & permission matrix
    │       ├── UsersPage.tsx
    │       └── components/
    │           ├── AccessSimulatorModal.tsx
    │           ├── CreateRoleModal.tsx
    │           ├── OrganizationalUnitsTab.tsx
    │           ├── PermissionMatrixDrawer.tsx
    │           ├── RoleCloneModal.tsx
    │           ├── RoleDetailDrawer.tsx
    │           └── RolesTab.tsx
    ├── services/                     # Typed API client wrappers
    │   ├── api.ts                    # Axios instance with 401 refresh queue
    │   ├── assets.service.ts
    │   ├── audit.service.ts
    │   ├── auth.service.ts
    │   ├── dashboard.service.ts
    │   ├── directory.service.ts
    │   ├── health.service.ts
    │   ├── inventory.service.ts
    │   ├── licenses.service.ts
    │   ├── network.service.ts
    │   ├── notifications.service.ts
    │   ├── organization.service.ts
    │   ├── reports.service.ts
    │   ├── roles.service.ts
    │   ├── settings.service.ts
    │   └── users.service.ts
    ├── stores/                       # Zustand state management
    │   ├── auth.store.ts             # Auth credentials & RBAC permissions
    │   ├── notification-settings.store.ts # Toast & sound alert preferences
    │   ├── theme.store.ts            # Dark/light theme & color presets
    │   └── timezone.store.ts         # User timezone & date format store
    └── styles/                       # CSS style sheets
        └── globals.css               # Global baseline stylesheet
```

---

## Shared Packages Structure

### 1. `packages/shared-types/`
```
packages/shared-types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                      # Root re-export barrel
    ├── dto/                          # 17 DTO definition files
    │   ├── api-response.ts
    │   ├── assets.dto.ts
    │   ├── audit.dto.ts
    │   ├── auth.ts
    │   ├── common.ts
    │   ├── dashboard.dto.ts
    │   ├── directory.dto.ts
    │   ├── health.dto.ts
    │   ├── inventory.dto.ts
    │   ├── licenses.dto.ts
    │   ├── network.dto.ts
    │   ├── notification.dto.ts
    │   ├── organization.dto.ts
    │   ├── pagination.ts
    │   ├── roles.dto.ts
    │   ├── search.dto.ts
    │   └── users.dto.ts
    ├── entities/                     # 12 Entity definition files
    │   ├── asset.ts
    │   ├── audit.ts
    │   ├── common.ts
    │   ├── directory.ts
    │   ├── inventory.ts
    │   ├── license.ts
    │   ├── network.ts
    │   ├── notification.ts
    │   ├── organization.ts
    │   ├── role.ts
    │   ├── timezone.ts
    │   └── user.ts
    └── enums/
        ├── index.ts
        └── permissions.ts            # Permission action and subject constants
```

### 2. `packages/shared-validators/`
```
packages/shared-validators/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                      # Barrel re-exporting all schemas
    ├── asset.validator.ts            # Zod validation for asset creation/editing
    ├── auth.validator.ts             # Zod validation for login & credentials
    ├── common.validator.ts           # Shared primitives (UUIDs, dates)
    ├── directory.validator.ts        # Zod validation for employees & AD groups
    ├── license.validator.ts          # Zod validation for licenses & seats
    ├── notification.validator.ts     # Zod validation for notification payloads
    ├── organization.validator.ts     # Zod validation for depts, orgs & positions
    ├── pagination.validator.ts       # Zod validation for pagination parameters
    ├── role.validator.ts             # Zod validation for roles & permissions
    └── user.validator.ts             # Zod validation for user profiles
```

### 3. `packages/shared-utils/`
```
packages/shared-utils/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                      # Barrel re-exporting all utility helpers
    ├── brand.ts                      # System branding tokens & metadata constants
    ├── enum.ts                       # Enum-to-label conversion & mapping helpers
    ├── format.ts                     # String, currency, and numeric formatters
    ├── string.ts                     # Slugs, capitalization, and SKU utilities
    ├── timezone.ts                   # Dayjs wrapper, timezone conversions & arithmetic
    └── validation.ts                 # Type guards and assertion functions
```

### 4. `packages/eslint-config/`
```
packages/eslint-config/
├── package.json
├── README.md
└── index.js                          # Shared ESLint flat config combining
                                      # typescript-eslint and eslint-config-prettier
```

---

## Configuration Files

| File | Location | Purpose |
| :--- | :--- | :--- |
| `package.json` | `/` (root) | Monorepo root definition, workspace dependencies, and top-level execution scripts |
| `pnpm-workspace.yaml`| `/` (root) | Defines workspace packages (`apps/*`, `packages/*`), build settings, and release policies |
| `turbo.json` | `/` (root) | Configures Turborepo build/dev/lint pipeline dependencies and global environment caching |
| `biome.json` | `/` (root) | Biome code formatter and linter rules with ignores for generated files and migrations |
| `docker-compose.yml` | `/` (root) | Multi-container production deployment (PostgreSQL, Redis, Meilisearch, SeaweedFS, API, Web) |
| `docker-compose.dev.yml`| `/` (root)| Development Docker override providing volume binds, debug ports, and hot-reloading |
| `.env.example` | `/` (root) | Template defining required and optional environment variables with default values |
| `.gitignore` | `/` (root) | Git exclusion patterns (node_modules, build outputs, coverage, environment secrets) |
| `.dockerignore` | `/` (root) | Exclusions for Docker context builds to minimize image sizes |
| `ant-design-guide.md`| `/` (root) | Engineering guidelines for Ant Design v6 migration, tokens, and components |

---

## Key Directories

### `docker/`
- **`docker/nginx/nginx.conf`**: Nginx configuration terminating HTTPS (port 443), serving production SPA static assets, and reverse-proxying `/api/v1` to the API service and `/socket.io` to the WebSocket gateway.
- **`docker/nginx/ssl/`**: Self-signed development certificates for local HTTPS encryption.
- **`docker/postgres/init.sql`**: Database initialization script enabling required PostgreSQL extensions (e.g. `uuid-ossp`, `pgcrypto`) upon container startup.

### `scripts/`
- **`scripts/test-login.mjs`**: Standalone Node.js automation script using Playwright to execute end-to-end authentication, form validation, and credential submission.
- **`scripts/test-responsive.mjs`**: Automated script testing frontend viewport breakpoints (desktop, tablet, mobile) and checking for layout regressions or overflow issues.

### `docs/`
- **`docs/ARCHITECTURE.md`**: High-level architectural specification and component boundaries.
- **`docs/CONFIGURATION.md`**: Detailed guide to environment variables and application runtime options.
- **`docs/DEPLOYMENT.md`**: Production deployment procedures, Docker Compose orchestration, and reverse proxy setup.
- **`docs/DEVELOPMENT.md`**: Local development setup, workspace commands, and workflow guidelines.
- **`docs/GETTING-STARTED.md`**: Quick-start guide for onboarding new developers.
- **`docs/TESTING.md`**: Unit, integration, and end-to-end testing guidelines using Vitest and Playwright.

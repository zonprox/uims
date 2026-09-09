# UIMS Structure Analysis

## Full Directory Tree

```text
/home/user/projects/uims/
├── .agents/                 # AI Agent operational configurations
├── .github/                 # GitHub Actions workflows and templates
├── .planning/               # Architectural plans, codebase mapping, and strategic documents
├── .turbo/                  # TurboRepo local cache (auto-generated)
├── apps/                    # Core executable applications
│   ├── api/                 # Backend NestJS Application
│   │   ├── prisma/          # Database schema (schema.prisma), migrations, and seeds
│   │   └── src/             # API Source code
│   │       ├── common/      # Global cross-cutting concerns (guards, filters, etc.)
│   │       ├── config/      # Environment loading and runtime configuration validation
│   │       ├── database/    # Prisma service instantiation and database modules
│   │       ├── modules/     # Feature-driven business logic modules
│   │       └── main.ts      # API application entry point
│   └── web/                 # Frontend React SPA Application
│       ├── certs/           # TLS certificates for local HTTPS development
│       └── src/             # SPA Source code
│           ├── app/         # App initialization, routing config, theming, and providers
│           ├── components/  # Reusable UI building blocks and common views
│           ├── hooks/       # Custom React hooks encapsulating UI/API logic
│           ├── layouts/     # High-level page structures (Main, Auth, Sidebar)
│           ├── pages/       # Feature-specific route views and page-level components
│           ├── services/    # Axios-based API client classes mapping to backend endpoints
│           ├── stores/      # Zustand state management definitions
│           ├── styles/      # Global CSS files and base variables
│           └── main.tsx     # SPA DOM mounting entry point
├── packages/                # Shared monorepo packages (internal libraries)
│   ├── eslint-config/       # Unified ESLint rules applied across all apps/packages
│   ├── shared-types/        # DTOs, Entities, and Enums used by both API and Web
│   ├── shared-utils/        # Common utility functions (date manipulation, brands)
│   └── shared-validators/   # Zod validation schemas shared between frontend/backend
├── docs/                    # Extensive technical documentation and guides
├── docker/                  # Dockerfiles, compose files, and infrastructure scripts
└── scripts/                 # Maintenance, build, and deployment bash/node scripts
```

## Complete Module Listing (apps/api/src/modules/)

- **`assets/`**: Manages hardware/software assets, lifecycle tracking, assignments, and QR code generation.
- **`audit/`**: Provides the audit log query interface for tracking system-wide mutations and user activities.
- **`auth/`**: Handles authentication, login, token generation, and secure session management.
- **`dashboard/`**: Aggregates high-level metrics, system status, and widgets for the main landing page.
- **`directory/`**: Manages organizational directory sync, employee lists, and group hierarchies.
- **`health/`**: Exposes system health checks for infrastructure monitoring (DB, Redis, Memory).
- **`inventory/`**: Tracks consumables, stock levels, restocking workflows, and threshold alerts.
- **`licenses/`**: Manages software license keys, seat allocations, expirations, and compliance tracking.
- **`network/`**: Manages IP address allocations, subnet configurations, and basic network mapping.
- **`notifications/`**: Orchestrates real-time WebSocket alerts, email dispatches, and background alert workers.
- **`organization/`**: Defines the corporate structure, departments, and positions.
- **`reports/`**: Handles asynchronous generation of system reports (PDF, CSV) using BullMQ.
- **`roles/`**: Manages the Role-Based Access Control (RBAC) definitions and permission matrices.
- **`search/`**: Provides global search capabilities across multiple entities (assets, users, IPs).
- **`settings/`**: Manages global application settings, integrations, and environment flags.
- **`users/`**: Manages application user accounts, status toggles, and user-specific configurations.

## Complete Page/Feature Listing (apps/web/src/pages/)

- **`access/`**: UI for managing app users, assigning roles, and viewing access logs. (`AccessControlPage.tsx`)
- **`assets/`**: Comprehensive hardware/software asset management, including scanner modals and QR printing. (`AssetsPage.tsx`)
- **`audit/`**: View for the system audit trail, providing advanced filtering of historical actions. (`AuditPage.tsx`)
- **`auth/`**: The login view and authentication workflows. (`LoginPage.tsx`)
- **`dashboard/`**: The primary landing view showing aggregated metrics and system status. (`DashboardPage.tsx`)
- **`directory/`**: Display of company employees, organizational hierarchy, and groups. (`DirectoryPage.tsx`)
- **`inventory/`**: Management of consumable stock levels and alerts. (`InventoryPage.tsx`)
- **`licenses/`**: Interface for tracking software licenses, renewals, and seat distribution. (`LicensesPage.tsx`)
- **`network/`**: Network management UI, including IP address tables, subnet forms, and ping tools. (`NetworkPage.tsx`)
- **`notifications/`**: User's notification inbox and preference settings. (`NotificationsPage.tsx`)
- **`organization/`**: Canvas and views for defining departments, units, and corporate structure. (`OrganizationPage.tsx`, `OrganizationCanvas.tsx`)
- **`reports/`**: UI for triggering, scheduling, and downloading system reports. (`ReportsPage.tsx`)
- **`settings/`**: System configuration forms and integration management. (`SettingsPage.tsx`)
- **`users/`**: Advanced role management, permission matrices, and role cloning tools. (`UsersPage.tsx`)
- **`NotFoundPage.tsx`**: Standard 404 fallback page.

## Key File Locations

- **Entry Points**: 
  - Backend: `apps/api/src/main.ts`
  - Frontend: `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`
- **Configuration**: 
  - Backend validation: `apps/api/src/config/app.config.ts`
  - Database schema: `apps/api/prisma/schema.prisma`
  - Vite config: `apps/web/vite.config.ts`
  - Monorepo tooling: root `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- **Core Logic**:
  - Global guards: `apps/api/src/common/guards/`
  - Frontend Router: `apps/web/src/app/router.tsx`
  - API Client mapping: `apps/web/src/services/`
- **Testing**:
  - Backend Unit/Integration: Beside the implementation files (e.g., `*.spec.ts`, `*.adversarial.spec.ts`)
  - Frontend Component: Beside the components (e.g., `*.test.tsx`)
  - Configs: `vitest.config.mts` (API) / `vitest.config.ts` (Web)

## Naming Conventions

- **Directories**: Always `kebab-case`. Examples: `shared-validators`, `auth`, `components`.
- **Backend Files**: `kebab-case` with specific structural suffixes:
  - Modules: `*.module.ts`
  - Controllers: `*.controller.ts`
  - Services: `*.service.ts`
  - Guards/Filters/Interceptors: `*.guard.ts`, `*.filter.ts`, `*.interceptor.ts`
- **Frontend Components**: Always `PascalCase`. Examples: `AccessControlPage.tsx`, `AssetScannerModal.tsx`.
- **Frontend Hooks**: `camelCase`, explicitly prefixed with `use`. Examples: `useAssetManagement.ts`, `useRealtimeNotifications.ts`.
- **Frontend Stores**: `kebab-case` with `.store.ts` suffix. Examples: `auth.store.ts`, `theme.store.ts`.
- **Types and Interfaces**: `PascalCase`. Examples: `AssetEntity`, `CreateUserDto`.
- **Validation Schemas**: `camelCase` ending in `Schema`. Located in `shared-validators/src/*.validator.ts`.

## Where to Add New Code

### 1. New Backend NestJS Module
- Create `apps/api/src/modules/<feature-name>/`.
- Define `<feature-name>.module.ts`, `<feature-name>.controller.ts`, and `<feature-name>.service.ts`.
- Add local DTOs to a `dto/` subfolder only if they are not needed by the frontend. Otherwise, place them in `shared-types`.
- Register the new module in `apps/api/src/app.module.ts`.

### 2. New Frontend React Page
- Create a directory `apps/web/src/pages/<feature-name>/`.
- Define `<FeatureName>Page.tsx` as the main entry point.
- Place feature-specific UI components in `apps/web/src/pages/<feature-name>/components/`.
- Add the route to `apps/web/src/app/router.tsx`.
- Add a navigation entry in `apps/web/src/layouts/menuConfig.tsx`.

### 3. New Shared Type or DTO
- Navigate to `packages/shared-types/src/`.
- Add to the relevant domain file (e.g., `dto/<feature>.dto.ts` or `entities/<feature>.ts`).
- Ensure the type is exported in `packages/shared-types/src/index.ts`.

### 4. New Shared Validator
- Navigate to `packages/shared-validators/src/`.
- Create or update `<feature>.validator.ts`.
- Export the Zod schema in `packages/shared-validators/src/index.ts`.
- Use this schema in the frontend forms (via Hook Form + Zod resolver) and backend (via ValidationPipe).

### 5. New Shared Utility
- Navigate to `packages/shared-utils/src/`.
- Define the utility (e.g., date formatting, string manipulation).
- Write a corresponding `*.test.ts` file.
- Export in `packages/shared-utils/src/index.ts`.

## Special Directories

- **`node_modules/`**: Contains external dependencies. Ignored by git. Managed by pnpm at the workspace root and linked to apps.
- **`dist/`**: The compiled output directory for both the NestJS application and the Vite React build. Ignored by git.
- **`.planning/`**: The designated location for AI agent planning outputs, architecture snapshots, and project-wide documentation generation.
- **`docker/`**: Contains infrastructure-as-code assets, including specialized `docker-compose` topologies for development, testing, and production environments.
- **`apps/api/prisma/`**: Crucial directory holding `schema.prisma`. It is the absolute source of truth for the database schema. All migrations (`migrations/` subfolder) and seed scripts (`seed.ts`) reside here.

*Structure analysis: 2026-09-09*

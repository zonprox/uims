# Directory Structure
**Analysis Date:** 2026-08-20

## Root Structure
- `apps/` - Contains executable applications.
- `packages/` - Contains internal libraries and shared dependencies.
- `docker/` - Docker-related infrastructure.
- `scripts/` - Utility scripts.
- `.planning/` - Planning and architectural documentation.

## Backend Structure (`apps/api/`)
```
apps/api/src/
├── common/                  # Shared cross-module NestJS components
│   ├── decorators/          # Custom parameter and method decorators
│   ├── dto/                 # Generic Data Transfer Objects
│   ├── filters/             # Exception filters (e.g., HttpExceptionFilter)
│   ├── guards/              # Authentication and Authorization guards
│   ├── interceptors/        # Request/Response interceptors (e.g., AuditInterceptor)
│   ├── pipes/               # Data transformation pipes
│   ├── redis/               # Redis connection and caching utilities
│   └── utils/               # Backend specific utility functions
├── config/                  # Configuration loaders (e.g., environment variables)
├── database/                # Prisma service and module
├── modules/                 # Feature-specific bounded contexts
│   ├── assets/              # Hardware and software asset tracking
│   ├── audit/               # System and user activity audit logs
│   ├── auth/                # Authentication logic and strategies
│   ├── dashboard/           # Aggregated data for dashboard metrics
│   ├── health/              # Health check endpoints
│   ├── inventory/           # IT inventory management
│   ├── licenses/            # Software license management
│   ├── network/             # Network and IPAM features
│   ├── notifications/       # User notification management
│   ├── organization/        # Org charts and structure
│   ├── reports/             # Reporting endpoints
│   ├── roles/               # Role management
│   ├── search/              # Global search capabilities
│   ├── settings/            # Application settings
│   └── users/               # User management
├── app.module.ts            # Root application module
└── main.ts                  # NestJS bootstrap entry point
```

## Frontend Structure (`apps/web/`)
```
apps/web/src/
├── app/                     # Global app configuration
│   ├── App.tsx              # Root component provider setup
│   └── router.tsx           # Application route definitions
├── components/              # Shared generic UI components
│   └── Access/              # Access control wrappers
├── hooks/                   # Shared React hooks
├── layouts/                 # Page layout components
│   ├── components/          # Subcomponents for layouts
│   └── hooks/               # Layout specific hooks
├── pages/                   # Route-based page components
│   ├── assets/              # Assets module views
│   ├── audit/               # Audit module views
│   ├── auth/                # Login and auth flow views
│   ├── dashboard/           # Dashboard views
│   ├── inventory/           # Inventory management views
│   ├── licenses/            # Licenses management views
│   ├── network/             # Network management views
│   ├── organization/        # Organization structure views
│   ├── reports/             # Reporting views
│   ├── settings/            # Application settings views
│   └── users/               # User management views
├── services/                # API client and integrations
├── stores/                  # Zustand global state (e.g., theme)
├── styles/                  # Global CSS and theming
└── utils/                   # Frontend-specific utilities
```

## Shared Packages Structure
- **`packages/shared-types/`**:
  - `src/dto/`: Request/Response type shapes.
  - `src/entities/`: Core data models matching Prisma schema.
  - `src/enums/`: Shared literal value types.
- **`packages/shared-utils/`**:
  - `src/`: Date/Time utilities (Day.js), string formatters, enum helpers.
- **`packages/shared-validators/`**:
  - `src/`: Zod schemas grouped by domain (e.g., `user.validator.ts`).

## Configuration Files
- **`package.json`**: Root dependencies and workspace scripts.
- **`turbo.json`**: Turborepo pipeline configuration for `build`, `dev`, `lint`, and `test`.
- **`pnpm-workspace.yaml`**: Defines workspace boundaries (`apps/*`, `packages/*`).
- **`docker-compose.yml` / `.dev.yml`**: Infrastructure deployment configurations.
- **`biome.json`**: Code formatting and linting rules.

## Module Inventory
### Backend Modules (NestJS)
- `AppModule`, `PrismaModule`, `RedisModule`
- `AuthModule`, `UsersModule`, `RolesModule`, `OrganizationModule`
- `AssetsModule`, `InventoryModule`, `LicensesModule`, `NetworkModule`
- `AuditModule`, `ReportsModule`, `DashboardModule`
- `SearchModule`, `NotificationsModule`, `SettingsModule`, `HealthModule`

### Frontend Routes
- `/login`: `LoginPage`
- `/`: `DashboardPage`
- `/assets`: `AssetsPage`
- `/licenses`: `LicensesPage`
- `/directory`: Redirects to `/users`
- `/organization`: `OrganizationPage`
- `/users`: `UsersPage`
- `/network`: `NetworkPage`
- `/inventory`: `InventoryPage`
- `/audit`: `AuditPage`
- `/reports`: `ReportsPage`
- `/settings`: `SettingsPage`
- `/*`: `NotFoundPage`

---
*2026-08-20*

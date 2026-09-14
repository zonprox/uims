# UIMS Project File Structure

This document outlines the directory and file structure of the UIMS (Unified IT Management System) monorepo.

## 1. Root Level
The root directory orchestrates the monorepo workspace, builds, and dependencies.

```text
uims/
├── .github/              # GitHub Actions workflows (CI/CD)
├── .planning/            # System documentation and AI agent working directories
├── apps/                 # Primary deployable applications
├── docker/               # Container configurations (Nginx, PostgreSQL, Redis)
├── docs/                 # General project documentation files
├── packages/             # Shared internal libraries
├── scripts/              # Automation and deployment scripts
├── temp/                 # Temporary untracked files
├── package.json          # Root package manifest and workspace scripts
├── pnpm-workspace.yaml   # Defines the pnpm monorepo workspace boundaries
├── turbo.json            # Turborepo task runner configuration
├── biome.json            # Biome configuration for linting and formatting
├── docker-compose.yml    # Main Docker compose file for production/staging
└── docker-compose.dev.yml # Docker compose for local development
```

## 2. API Application (`apps/api/`)
The NestJS 11 backend service.

```text
apps/api/
├── prisma/
│   ├── migrations/       # Automated SQL migrations
│   ├── scripts/          # DB-related utility scripts
│   ├── seeders/          # Data seeders for all modules
│   ├── schema.prisma     # Single source of truth for DB schema
│   └── seed.ts           # Seeder execution entry point
├── src/
│   ├── common/           # Shared backend resources
│   │   ├── crypto/       # Cryptographic utilities
│   │   ├── decorators/   # Custom NestJS decorators (@ClientIp, @Public, @Roles)
│   │   ├── dto/          # Shared Data Transfer Objects
│   │   ├── filters/      # Global exception filters (HTTP, Prisma)
│   │   ├── guards/       # Auth, Roles, and Permission guards
│   │   ├── interceptors/ # Request/Response interceptors (Audit logs, Transformation)
│   │   └── redis/        # Redis caching module and service
│   ├── config/           # Application-level configurations (CORS, App settings)
│   ├── database/         # Prisma service instantiation and module
│   ├── modules/          # Feature domains
│   │   ├── assets/       # Hardware asset management
│   │   ├── audit/        # System audit trailing
│   │   ├── auth/         # Authentication and JWT issuance
│   │   ├── dashboard/    # Analytics and metrics aggregation
│   │   ├── directory/    # Employee directory and hierarchy
│   │   ├── health/       # Liveness and readiness probes
│   │   ├── inventory/    # Stock, parts, and consumables
│   │   ├── licenses/     # Software license tracking
│   │   ├── network/      # IP Address Management (IPAM) and VLANs
│   │   ├── notifications/# WebSocket gateway and alert workers
│   │   ├── organization/ # Departments, Positions, Locations
│   │   ├── reports/      # Reporting engines and scheduling
│   │   ├── roles/        # RBAC definitions and sync
│   │   ├── search/       # Global search indexing
│   │   ├── settings/     # System configurations
│   │   └── users/        # User accounts and lifecycle
│   ├── app.module.ts     # Root module injecting all sub-modules
│   └── main.ts           # Application bootstrap and middleware setup
├── test/                 # End-to-End test suites
├── Dockerfile            # Production multi-stage build container
├── nest-cli.json         # NestJS CLI configuration
└── package.json          # API dependencies and scripts
```

## 3. Web Application (`apps/web/`)
The React 19 + Vite 8 frontend interface.

```text
apps/web/
├── certs/                # SSL certificates for local HTTPS development
├── src/
│   ├── app/              # Core initialization logic
│   │   ├── App.tsx       # Root provider wrapper (Query, Theme, Router)
│   │   ├── query-client.ts # TanStack Query configuration
│   │   ├── router.tsx    # React Router definitions and lazy loading
│   │   └── theme.ts      # Ant Design theme builder
│   ├── components/       # Reusable UI components
│   │   ├── Access/       # RBAC conditional rendering wrappers
│   │   ├── CommandPalette.tsx # Global keyboard-driven search
│   │   ├── ErrorBoundary.tsx  # Fallback UI for crashes
│   │   └── ...           # Badges, Loaders, Layout wrappers
│   ├── hooks/            # Custom React hooks (useAccess, useRealtimeNotifications)
│   ├── layouts/          # Structural page wrappers
│   │   ├── components/   # Headers, sidebars, footers
│   │   ├── AuthLayout.tsx# Unauthenticated shell
│   │   └── MainLayout.tsx# Authenticated app shell
│   ├── pages/            # Routable top-level components (lazy-loaded)
│   │   ├── access/       # Users and roles mapping
│   │   ├── assets/       # Asset tables, drawers, forms, QR scanners
│   │   ├── audit/        # Audit logs view
│   │   ├── auth/         # Login interfaces
│   │   ├── dashboard/    # Summary metrics and charts
│   │   ├── directory/    # Employee profiles and structure
│   │   ├── inventory/    # Stock and spatial views
│   │   ├── licenses/     # Software assignment and allocations
│   │   ├── network/      # IPAM and Subnet visualizers
│   │   ├── notifications/# Alert management
│   │   ├── organization/ # Hierarchical tree viewers
│   │   ├── reports/      # Report generation and scheduling
│   │   ├── settings/     # App-wide settings
│   │   └── users/        # User account management
│   ├── services/         # Axios API client integrations
│   ├── stores/           # Zustand client-state stores (Theme, Auth)
│   ├── styles/           # Minimal global CSS (Tailwind or reset logic)
│   ├── main.tsx          # React DOM mounting
│   └── vite-env.d.ts     # Vite environment types
├── index.html            # Static HTML entry template
├── vite.config.ts        # Vite configuration and proxying
└── package.json          # Frontend dependencies and scripts
```

## 4. Shared Packages (`packages/`)
Internal workspaces allowing code reuse and maintaining type safety across the boundary.

```text
packages/
├── eslint-config/        # (Legacy/Optional) Shared ESLint rules
├── shared-types/         # Single source of truth for typings
│   ├── src/
│   │   ├── dto/          # Payload types and API responses
│   │   ├── entities/     # Replicated ORM models for frontend
│   │   ├── enums/        # Global constants and enum flags
│   │   └── index.ts      # Main barrel export
├── shared-validators/    # Shared validation schemas
│   ├── src/
│   │   ├── *.validator.ts # Zod schemas for all domain entities
│   │   └── index.ts
└── shared-utils/         # Domain-agnostic helper functions
    ├── src/
    │   ├── network.ts    # CIDR, IP calculations
    │   ├── format.ts     # String/currency formatting
    │   ├── timezone.ts   # Day.js utility wrappers
    │   └── validation.ts # Reusable logic for checks
```

## 5. Supporting Directories
- **`docker/`**: Contains runtime definitions for the external dependencies. `nginx/` handles reverse proxy and static asset serving in production. `postgres/` manages DB initialization.
- **`scripts/`**: Bash and Node scripts for rapid local dev bootstrapping, migrations, and test running.
- **`docs/`**: Broader documentation (e.g., Markdown guidelines for LLMs, deployment specs).
- **`.planning/`**: Agent history, verification files, and systemic design documents generated progressively.

# UIMS Codebase Structure
*Date: September 2026*

This document outlines the full monorepo structure of the UIMS platform.

## Monorepo Summary

| Workspace | Description | File Count |
| :--- | :--- | :--- |
| **Root** | Config files, scripts, markdown docs | 18 |
| **apps/api** | NestJS backend application | 214 |
| **apps/web** | React SPA frontend application | 172 |
| **packages/shared-types** | Shared TS entities, DTOs, enums | 37 |
| **packages/shared-validators** | Zod 4 runtime schemas | 26 |
| **packages/shared-utils** | Common utility functions | 19 |
| **packages/eslint-config** | Shared ESLint configurations | 3 |
| **docker** | Container definitions & initializers | 4 |
| **scripts** | Build & deployment helper scripts | 3 |

---

## Directory Trees

### 1. Root Workspace
Configuration for the monorepo, continuous integration, and high-level documentation.
```text
/
├── apps/                 # Application workspaces (api, web)
├── packages/             # Shared packages (types, utils, validators)
├── docker/               # Infrastructure definitions
├── scripts/              # Utility scripts
├── docs/                 # Documentation directory
├── .planning/            # Architecture and agent planning docs
├── .github/              # GitHub Actions workflows (ci.yml)
├── package.json          # Monorepo dependencies & scripts
├── pnpm-workspace.yaml   # pnpm workspace definitions
├── pnpm-lock.yaml        # Lockfile
├── turbo.json            # Turborepo configuration
├── biome.json            # Biome linter/formatter config
├── docker-compose.yml    # Main compose file
├── docker-compose.dev.yml# Dev compose overrides
└── README.md             # Project overview
```

### 2. Backend (`apps/api/`)
The NestJS API following a clean modular monolith structure.

```text
apps/api/
├── package.json
├── nest-cli.json
├── tsconfig.json
├── eslint.config.mjs
├── prisma.config.ts
├── prisma/               # Prisma schema & migrations
│   └── schema.prisma
├── test/                 # E2E test suite
└── src/
    ├── main.ts           # Application entry point
    ├── app.module.ts     # Root module
    ├── config/           # App, CORS, and external configurations
    ├── common/           # Shared NestJS components
    │   ├── decorators/   # public, roles, client-ip, require-permissions
    │   ├── dto/          # pagination.dto.ts, generic dtos
    │   ├── filters/      # http-exception, prisma-exception filters
    │   ├── guards/       # jwt-auth, roles, permissions guards
    │   └── interceptors/ # transform, audit interceptors
    └── modules/          # 15 Domain modules (see structure pattern below)
```

#### API Domain Module Pattern
Every business domain under `apps/api/src/modules/` adheres to a strict pattern:
```text
modules/<domain>/
├── <domain>.module.ts       # Module wire-up
├── <domain>.controller.ts   # HTTP Route definitions
├── <domain>.service.ts      # Business logic
├── <domain>.controller.spec.ts
├── <domain>.service.spec.ts
└── dto/
    ├── create-<domain>.dto.ts
    ├── update-<domain>.dto.ts
    └── <domain>-query.dto.ts
```
*Note: Domains include auth, users, roles, directory, organization, assets, licenses, inventory, network, audit, reports, settings, dashboard, health, search, and notifications.*

### 3. Frontend (`apps/web/`)
The React 19 application built with Vite and Ant Design v6.

```text
apps/web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── index.html            # Vite HTML entry point
└── src/
    ├── app/              # Core App setup
    │   ├── App.tsx       # Root wrapper (ConfigProvider, etc.)
    │   ├── router.tsx    # React Router 8 configuration
    │   ├── theme.ts      # Ant Design theme customization
    │   └── query-client.ts # TanStack Query client setup
    ├── layouts/          # UI Shells
    │   ├── AuthLayout.tsx# Unauthenticated layout shell
    │   └── MainLayout.tsx# Authenticated layout shell (Sidebar, Header)
    ├── pages/            # Routable view components
    ├── components/       # Shared UI components
    ├── hooks/            # Custom React hooks
    ├── stores/           # Zustand state management
    │   └── auth.store.ts
    ├── services/         # Axios-based API clients
    │   └── api.ts        # Base Axios instance setup
    └── utils/            # Frontend utilities
```

### 4. Shared Packages (`packages/`)

#### `packages/shared-types/`
Cross-boundary TypeScript definitions used by both `api` and `web`.
```text
packages/shared-types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── dtos/             # Data Transfer Object interfaces
    ├── entities/         # Domain entity interfaces
    └── enums/            # Shared string/number enumerations
```

#### `packages/shared-validators/`
Zod 4 schemas that mirror `shared-types` for runtime validation.
```text
packages/shared-validators/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    └── schemas/          # Zod schema definitions corresponding to entities/DTOs
```

#### `packages/shared-utils/`
Pure functional utilities shared across both ecosystems.
```text
packages/shared-utils/
├── package.json
├── tsconfig.json
└── src/
    ├── format.ts         # Number, date formatting
    ├── network.ts        # IP/network utilities
    ├── timezone.ts       # Timezone helpers
    ├── string.ts         # String manipulation
    ├── enum.ts           # Enum helpers
    └── brand.ts          # Branded type utilities
```

#### `packages/eslint-config/`
Centralized linting configs to enforce consistency.
```text
packages/eslint-config/
├── package.json
└── index.js              # Base ESLint rules
```

### 5. Infrastructure and Scripts

#### `docker/`
Infrastructure orchestration files.
```text
docker/
├── nginx/
│   ├── nginx.conf        # Reverse proxy config
│   └── ssl/              # Local SSL certs
└── postgres/
    └── init.sql          # DB initialization script
```

#### `scripts/`
Utility scripts for development operations.
```text
scripts/
├── dev.sh                # Main local dev initialization script
├── test-login.mjs        # Helper script for login testing
└── test-responsive.mjs   # Helper script for UI testing
```

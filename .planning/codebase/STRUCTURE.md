# Codebase Structure

**Analysis Date:** 2026-08-14

## Directory Layout

```
/home/user/projects/uims/
├── .planning/                  # Planning and architecture documents
├── apps/
│   ├── api/                    # NestJS Backend Application
│   │   ├── prisma/             # Database schema, migrations, and seeds
│   │   └── src/
│   │       ├── common/         # Global filters, interceptors, and decorators
│   │       ├── config/         # Environment and application configuration
│   │       ├── database/       # Prisma service and module setup
│   │       ├── modules/        # Domain-driven feature modules (assets, auth, etc.)
│   │       ├── app.module.ts   # Root application module
│   │       └── main.ts         # Backend entry point
│   └── web/                    # React + Vite Frontend Application
│       ├── src/
│       │   ├── app/            # App initialization, routing, and React Query setup
│       │   ├── components/     # Reusable UI components (e.g., PageContainer)
│       │   ├── hooks/          # Custom React hooks (e.g., useAuth)
│       │   ├── layouts/        # Page layouts (e.g., MainLayout, AuthLayout)
│       │   ├── pages/          # Route-level components grouped by feature
│       │   ├── services/       # API integration functions and Axios setup
│       │   ├── stores/         # Zustand global state stores
│       │   ├── styles/         # Global CSS styles
│       │   ├── utils/          # Frontend utility functions
│       │   └── main.tsx        # Frontend entry point
├── packages/
│   ├── eslint-config/          # Shared ESLint configuration
│   ├── shared-types/           # Shared TypeScript interfaces and enums (DTOs, entities)
│   ├── shared-utils/           # Shared helper functions
│   └── shared-validators/      # Shared Zod validation schemas
├── biome.json                  # Biome configuration for formatting/linting
├── docker/                     # Docker configurations and setup files
├── package.json                # Root monorepo configuration
├── pnpm-workspace.yaml         # PNPM workspace definition
└── turbo.json                  # Turborepo task pipeline configuration
```

## Directory Purposes

- **`apps/api/`**: The core backend system for the Unified IT Management System (UIMS). Handles data persistence, authentication, and background jobs.
- **`apps/web/`**: The frontend UI for users to interact with UIMS features like assets, tickets, and network inventory.
- **`packages/shared-*/`**: Extracted domain logic, types, and schemas to enforce a single source of truth between API and Web clients.

## Key File Locations

- **Database Schema**: `apps/api/prisma/schema.prisma` - The central definition of all database entities and relationships.
- **Backend Entry**: `apps/api/src/main.ts` - Where the NestJS server is configured and started.
- **Frontend Entry**: `apps/web/src/main.tsx` - Where React is mounted to the DOM.
- **Frontend Routing**: `apps/web/src/app/router.tsx` (assumed from `App.tsx` imports) - Defines the page routing structure.
- **Global Types**: `packages/shared-types/src/index.ts` - Exports shared DTOs and entity shapes.

## Naming Conventions

- **Modules/Services**: Use `kebab-case` for file names (e.g., `assets.service.ts`, `assets.controller.ts`).
- **React Components**: Use `PascalCase` for component files and folders when appropriate (e.g., `CommandPalette.tsx`, `PageContainer.tsx`).
- **React Pages**: Page files are typically suffixed with `Page` (e.g., `AssetsPage.tsx`, `NotFoundPage.tsx`).
- **State Stores**: Suffixed with `.store.ts` (e.g., `theme.store.ts`).
- **Test Files**: Suffixed with `.test.ts` (e.g., `auth.store.test.ts`).

## Where to Add New Code

- **New Database Entity**: Add the model to `apps/api/prisma/schema.prisma`, run `pnpm prisma generate`, and create a corresponding module in `apps/api/src/modules/`.
- **New Shared Type/Validator**: Add to `packages/shared-types/src/` and `packages/shared-validators/src/`. Update `index.ts` to export it.
- **New API Route**: Create a new controller in `apps/api/src/modules/<feature>/<feature>.controller.ts` and document with Swagger decorators.
- **New Frontend View**: Create a new folder under `apps/web/src/pages/`, add your `<Feature>Page.tsx`, and add it to the router in `apps/web/src/app/router.ts`.
- **New Global State**: Create a new slice/store in `apps/web/src/stores/` using Zustand.

## Special Directories

- **`.turbo/`**: Turborepo cache directory. Should be ignored in version control.
- **`apps/api/dist/` & `apps/web/dist/`**: Compiled build outputs.
- **`packages/*/dist/`**: Built versions of shared packages.

---

*Structure analysis: 2026-08-14*

# Codebase Structure

**Analysis Date:** 2026-08-15

## Directory Layout
The repository is structured as a pnpm workspace monorepo managed by Turbo.
```text
uims/
├── apps/
│   ├── api/                 # NestJS Backend
│   │   ├── prisma/          # Database schema and migrations
│   │   └── src/
│   │       ├── common/      # Interceptors, filters, shared NestJS code
│   │       └── modules/     # Feature modules (auth, assets, tickets, etc.)
│   └── web/                 # React + Vite Frontend
│       └── src/
│           ├── components/  # Reusable UI components
│           ├── hooks/       # Custom React Query and UI hooks
│           ├── pages/       # Route-level components
│           ├── services/    # API client wrappers (Axios)
│           ├── stores/      # Zustand state stores
│           └── utils/       # Helpers
├── packages/                # Shared internal libraries
│   ├── eslint-config/       # Linting configuration
│   ├── shared-types/        # TypeScript interfaces and DTOs
│   ├── shared-utils/        # Common pure functions
│   └── shared-validators/   # Zod validation schemas
├── docker/                  # Docker compose and container configs
└── .planning/               # Agent planning and documentation
```

## Directory Purposes
- `apps/api/src/modules/`: Contains domain-driven feature modules (e.g., `assets`, `users`, `tickets`). Each module encapsulates its own Controller, Service, and DTOs.
- `apps/web/src/pages/`: Contains monolithic views or coordinate components for routing (e.g., `AssetsPage.tsx`).
- `packages/shared-types/src/`: The single source of truth for interfaces and types shared between the front and back end.

## Key File Locations
- **Database Schema**: `apps/api/prisma/schema.prisma`
- **Backend Entry Point**: `apps/api/src/main.ts`
- **Frontend Entry Point**: `apps/web/src/main.tsx`
- **Backend Exception Filters**: `apps/api/src/common/filters/`
- **Backend API Response Interceptor**: `apps/api/src/common/interceptors/transform.interceptor.ts`

## Naming Conventions
- **Files**:
  - NestJS uses dot notation: `feature.controller.ts`, `feature.service.ts`, `feature.module.ts`.
  - React components use PascalCase: `MyComponent.tsx`, `AssetsPage.tsx`.
  - Standard TypeScript files use kebab-case: `asset.validator.ts`, `transform.interceptor.ts`.
- **Classes/Types**: PascalCase (`AssetService`, `CreateAssetDto`).
- **Variables/Functions**: camelCase (`fetchAssets`, `assetStats`).

## Where to Add New Code
- **New API Endpoint**:
  1. Add DTOs to `apps/api/src/modules/{feature}/dto/`.
  2. Implement business logic in `apps/api/src/modules/{feature}/{feature}.service.ts`.
  3. Wire endpoint in `apps/api/src/modules/{feature}/{feature}.controller.ts`.
  4. Ensure any cross-boundary types are added to `packages/shared-types/`.
- **New Frontend View**:
  1. Create a page component in `apps/web/src/pages/{feature}/{Feature}Page.tsx`.
  2. Add an API client wrapper in `apps/web/src/services/{feature}.service.ts`.
  3. (Optional) Define Zod schemas in `packages/shared-validators/src/{feature}.validator.ts` if client-side form validation is needed.
- **New Database Model**:
  1. Define in `apps/api/prisma/schema.prisma`.
  2. Export corresponding TypeScript interfaces from `packages/shared-types/src/entities/`.
  3. Run `pnpm prisma:generate` (or equivalent) in `apps/api`.

## Special Directories
- `apps/api/src/common/`: Holds generic cross-cutting NestJS abstractions like global filters, guards, decorators, and interceptors.
- `packages/shared-*/`: Changes here require rebuilding the packages (usually handled automatically by Turbo dev server or build processes) so the apps can pick them up.

---
*Structure analysis: 2026-08-15*

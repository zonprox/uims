# Directory Structure
**Analysis Date:** 2026-08-15

## Directory Layout

```text
/home/user/projects/uims
├── apps/
│   ├── api/                   # NestJS Backend
│   │   ├── prisma/            # Database schema and migrations
│   │   └── src/
│   │       ├── common/        # Shared NestJS constructs (guards, filters)
│   │       ├── config/        # Environment and app configuration
│   │       ├── database/      # DB connection/seeding logic
│   │       └── modules/       # Feature modules (auth, users, tickets, etc.)
│   └── web/                   # React Frontend
│       └── src/
│           ├── app/           # App initialization, routing, theme
│           ├── components/    # Reusable generic UI components
│           ├── hooks/         # Shared React hooks
│           ├── layouts/       # Page layout structures
│           ├── pages/         # Feature-based route components
│           ├── services/      # API client functions
│           ├── stores/        # Zustand global state stores
│           ├── styles/        # Global CSS
│           └── utils/         # Helper functions
├── packages/                  # Shared Monorepo Packages
│   ├── eslint-config/         # Shared ESLint rules
│   ├── shared-types/          # Domain TypeScript interfaces/types
│   ├── shared-utils/          # Common helper logic
│   └── shared-validators/     # Zod validation schemas
├── docker/                    # Container orchestration definitions
└── scripts/                   # CI/CD and utility scripts
```

## Directory Purposes

- **`apps/`**: Contains the runnable application services. Each folder here is an independent application with its own build process and server/bundle.
- **`packages/`**: Contains library code intended to be consumed by multiple apps or other packages.
- **`apps/api/src/modules/`**: The heart of the backend. Groups code by domain feature (e.g., `users`, `auth`).
- **`apps/web/src/pages/`**: The main views of the frontend, grouped by feature domain matching the backend modules where applicable.

## Key File Locations

- **API Entry**: [`apps/api/src/main.ts`](file:///home/user/projects/uims/apps/api/src/main.ts)
- **Web Entry**: [`apps/web/src/main.tsx`](file:///home/user/projects/uims/apps/web/src/main.tsx)
- **Database Schema**: [`apps/api/prisma/schema.prisma`](file:///home/user/projects/uims/apps/api/prisma/schema.prisma) (assumed standard path)
- **Web Router**: [`apps/web/src/app/router.tsx`](file:///home/user/projects/uims/apps/web/src/app/router.tsx)
- **Workspace Config**: [`pnpm-workspace.yaml`](file:///home/user/projects/uims/pnpm-workspace.yaml) and [`turbo.json`](file:///home/user/projects/uims/turbo.json)

## Naming Conventions

- **Directories**: 
  - Standard folders are `kebab-case`.
  - Feature directories are `kebab-case`.
- **Files**:
  - API files follow NestJS conventions: `feature.type.ts` (e.g., `users.controller.ts`, `users.service.ts`).
  - Web React components follow `PascalCase.tsx` (e.g., `DashboardPage.tsx`, `CommandPalette.tsx`).
  - Web standard TS files follow `kebab-case.ts` (e.g., `auth.store.ts`, `query-client.ts`).
- **Code Symbols**:
  - React components are `PascalCase`.
  - Classes and Types/Interfaces are `PascalCase`.
  - Functions and variables are `camelCase`.
  - Constants are typically `UPPER_SNAKE_CASE`.

## Where to Add New Code

- **New Backend Feature**: Create a new folder under `apps/api/src/modules/`. Use the Nest CLI if possible (e.g., `nest g module <name>`).
- **New Frontend Page/View**: Create a new folder under `apps/web/src/pages/` if it's a major feature, or add to existing feature folders. Update `apps/web/src/app/router.tsx`.
- **Reusable UI Component**: Add to `apps/web/src/components/`.
- **New Shared Type/Schema**: Add to `packages/shared-types` or `packages/shared-validators` so it can be consumed seamlessly by both web and api.
- **Database Model Change**: Update `apps/api/prisma/schema.prisma` and run migrations.

## Special Directories

- **`.planning/`**: GSD operational metadata and documentation.
- **`docker/`**: Contains `docker-compose` setups for local development and potentially production infrastructure.
- **`.turbo/`**: Turborepo cache directory (should be gitignored).

---
<!-- refreshed: 2026-08-15 -->
*Codebase structure analysis: 2026-08-15*

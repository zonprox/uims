# Codebase Structure

**Analysis Date:** 2026-09-10

## Directory Layout
```
uims/
├── apps/
│   ├── api/                      # Backend (NestJS)
│   │   ├── prisma/               # Schema, migrations, seeders
│   │   └── src/
│   │       ├── common/           # Shared guards, filters, interceptors
│   │       ├── config/           # App configuration parsing (Zod)
│   │       ├── database/         # Prisma module & service
│   │       └── modules/          # Domain-specific backend modules
│   └── web/                      # Frontend (React/Vite)
│       └── src/
│           ├── app/              # Router, theme config, main app component
│           ├── components/       # Shared UI components
│           ├── hooks/            # Global custom React hooks
│           ├── layouts/          # AuthLayout, MainLayout
│           ├── pages/            # Route-based page components
│           ├── services/         # API fetch calls
│           └── stores/           # Zustand global state
├── docker/                       # Infrastructure configs (Nginx, Postgres)
├── packages/                     # Shared monorepo packages
│   ├── eslint-config/            # Common linting rules
│   ├── shared-types/             # Shared DTOs, Enums, Entities
│   ├── shared-utils/             # Common utility functions (e.g., date parsing)
│   └── shared-validators/        # Shared validation schemas
└── scripts/                      # Utility scripts
```

## Directory Purposes
- **`apps/api/`**: Contains the Node.js backend. Powered by NestJS. Uses Prisma for ORM.
- **`apps/web/`**: Contains the frontend SPA. Built with React and Vite. Uses Ant Design.
- **`packages/shared-*/`**: Contains code that is reused across both `apps/web` and `apps/api`. Crucial for keeping types and validation logic perfectly synced between client and server.
- **`docker/`**: Holds configurations for the local development environment or production deployments (PostgreSQL init, Nginx SSL, etc.).

## Key File Locations
- **Backend Entry Point**: `apps/api/src/main.ts`
- **Backend Root Module**: `apps/api/src/app.module.ts`
- **Database Schema**: `apps/api/prisma/schema.prisma` (assumed based on standard Prisma structure)
- **Frontend Entry Point**: `apps/web/src/main.tsx`
- **Frontend Routing**: `apps/web/src/app/router.tsx`
- **Frontend Theme**: `apps/web/src/app/theme.ts`
- **Docker Compose**: `docker-compose.yml` (at root)

## Naming Conventions
- **Files:** `kebab-case` for file names (e.g., `app.module.ts`, `auth.store.ts`).
- **Components:** `PascalCase` for React components and their filenames (e.g., `DashboardPage.tsx`, `ErrorBoundary.tsx`).
- **Classes/Interfaces:** `PascalCase` for classes (e.g., `AssetsController`, `UpdateAssetDto`).
- **Methods/Variables:** `camelCase` for functions and variables.
- **Domain suffixing:** NestJS files suffix their type: `.controller.ts`, `.service.ts`, `.module.ts`, `.dto.ts`.

## Where to Add New Code
### Backend (NestJS)
1. **New Domain Feature**: Create a new folder under `apps/api/src/modules/<feature-name>`.
2. **DTOs**: Place in `apps/api/src/modules/<feature-name>/dto/`. If shared with frontend, they should eventually be defined or mapped in `packages/shared-types`.
3. **Database Change**: Modify `apps/api/prisma/schema.prisma`, then run Prisma migrate. 
4. **New Middleware/Guard**: Add to `apps/api/src/common/`.
5. **New Environment Variable**: Add to `apps/api/src/config/app.config.ts` (Zod schema) and update `.env.example`.

### Frontend (React)
1. **New Page**: Add a folder under `apps/web/src/pages/<feature-name>`, create the main component, and update `apps/web/src/app/router.tsx`.
2. **Page-Specific Components**: Add to `apps/web/src/pages/<feature-name>/components/`.
3. **Shared UI Component**: Add to `apps/web/src/components/`.
4. **Global State**: Add a new slice/store in `apps/web/src/stores/` using Zustand.
5. **API Calls**: Add fetch logic to `apps/web/src/services/` or use React Query hooks in `hooks/` / `pages/<feature-name>/hooks/`.

### Shared
1. **New Enums/Interfaces**: Add to `packages/shared-types/src/`.
2. **New Validations**: Add to `packages/shared-validators/src/`.

## Special Directories
- **`.planning/`**: GSD operational metadata, generated code maps, and plans. **Do not modify manually unless acting as an architect.**
- **`apps/api/dist/` & `apps/web/dist/`**: Compiled output. Do not edit.
- **`.turbo/`**: Turborepo cache. Do not edit.

---
*Structure analysis: 2026-09-10*

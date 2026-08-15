# Codebase Structure

**Analysis Date:** 2026-08-15

## Directory Layout

```
/home/user/projects/uims/
├── apps/               # Application entry points
│   ├── api/            # NestJS Backend API
│   └── web/            # React/Vite Frontend
├── docker/             # Docker configuration files
├── packages/           # Shared libraries
│   ├── eslint-config/  # Shared ESLint configurations
│   ├── shared-types/   # Shared TypeScript definitions
│   ├── shared-utils/   # Shared utility functions
│   └── shared-validators/# Validation logic (Zod schemas)
└── scripts/            # Build and utility scripts
```

## Directory Purposes

**`apps/api/`:**
- Purpose: Contains the primary NestJS backend service.
- Contains: Controllers, Services, Prisma schemas, Dockerfiles, module definitions.
- Key files: `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`

**`apps/web/`:**
- Purpose: Contains the primary React frontend SPA.
- Contains: Components, pages, layouts, hooks, API services, stores, Vite configuration.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/app/router.tsx`

**`packages/*/`:**
- Purpose: Contains code reused across apps (monorepo internal libraries).
- Contains: Code and type definitions for validations, utils, and configurations.
- Key files: `packages/shared-validators/src/index.ts`

## Key File Locations

**Entry Points:**
- `apps/web/src/main.tsx`: React application mount point.
- `apps/web/src/app/router.tsx`: Frontend routing definition.
- `apps/api/src/app.module.ts`: NestJS root module definition.

**Configuration:**
- `docker-compose.yml`: Local infrastructure deployment configuration.
- `apps/api/prisma/schema.prisma`: Database schema and ORM mappings.
- `turbo.json`: Turborepo build pipeline configuration.

**Core Logic:**
- `apps/api/src/modules/`: Domain-specific backend implementation.
- `apps/web/src/pages/`: Frontend views by feature.
- `apps/web/src/services/`: Client-side API integration layers.

## Naming Conventions

**Files:**
- React Components: PascalCase (`PageContainer.tsx`)
- Hooks: camelCase with 'use' prefix (`useSystemHealth.ts`)
- API Controllers: kebab-case with suffix (`users.controller.ts`)
- API Services: kebab-case with suffix (`users.service.ts`)
- DTOs: kebab-case with suffix (`create-user.dto.ts`)

**Directories:**
- Frontend pages: lowercase by domain (`dashboard`, `assets`)
- Backend modules: lowercase by domain (`dashboard`, `assets`)
- Packages: lowercase with dashes (`shared-validators`)

## Where to Add New Code

**New Feature (e.g. "Work Orders"):**
- Primary code (Backend): `apps/api/src/modules/work-orders/`
- Primary code (Frontend): `apps/web/src/pages/work-orders/`
- API Client (Frontend): `apps/web/src/services/work-orders.service.ts`
- Database Schema: Add `WorkOrder` model to `apps/api/prisma/schema.prisma`
- Shared Validations: `packages/shared-validators/src/work-order.validator.ts`

**New Component/Module:**
- Implementation (Frontend Shared Component): `apps/web/src/components/`
- Implementation (Backend Shared Module): `apps/api/src/common/`

**Utilities:**
- Shared helpers (cross-app): `packages/shared-utils/src/`
- Frontend-only helpers: `apps/web/src/utils/`

## Special Directories

**`apps/api/prisma/`:**
- Purpose: Prisma schema definitions and database configurations.
- Generated: No
- Committed: Yes

**`node_modules/` / `.turbo/`:**
- Purpose: Dependency installations and build caches.
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-08-15*

---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
# Codebase Structure

**Analysis Date:** 2026-09-17

## Directory Layout

```
uims/
├── apps/                 # Application code
│   ├── api/              # NestJS backend application
│   └── web/              # React/Vite frontend application
├── packages/             # Shared libraries and configurations
│   ├── eslint-config/    # Shared ESLint configuration
│   ├── shared-types/     # Shared TypeScript interfaces
│   ├── shared-utils/     # Shared utility functions
│   └── shared-validators/# Shared Zod validation schemas
├── docs/                 # Project documentation
├── scripts/              # Utility scripts for build/deploy
├── .github/              # GitHub Actions workflows
└── .planning/            # Planning and codebase documentation
```

## Directory Purposes

**`apps/api/src/`**:

- Purpose: Contains all backend logic.
- Contains: NestJS modules, controllers, services, database configuration, common utilities.
- Key files: `main.ts` (Entry point), `app.module.ts` (Root module).

**`apps/api/src/modules/`**:

- Purpose: Feature-specific backend modules.
- Contains: Directories for each feature (e.g., `users`, `auth`, `inventory`). Each contains a `.module.ts`, `.controller.ts`, and `.service.ts`.

**`apps/api/src/common/`**:

- Purpose: Cross-cutting backend concerns.
- Contains: `guards/`, `interceptors/`, `filters/`, `decorators/`, `redis/`.

**`apps/web/src/`**:

- Purpose: Contains all frontend logic.
- Contains: React components, pages, routes, state management, API services.
- Key files: `main.tsx` (Entry point), `app/router.tsx` (Routing definition).

**`apps/web/src/pages/`**:

- Purpose: Route-level React components (Pages).
- Contains: Directories for features (e.g., `dashboard/`, `assets/`), containing `*Page.tsx` files.

**`apps/web/src/components/`**:

- Purpose: Reusable UI components.
- Contains: Generic React components used across multiple pages.

**`apps/web/src/services/`**:

- Purpose: API client interactions.
- Contains: Axios configuration (`api.ts`) and feature-specific service files (e.g., `users.service.ts`).

**`apps/web/src/stores/`**:

- Purpose: Global state management.
- Contains: Zustand store definitions (e.g., `auth.store.ts`, `theme.store.ts`).

## Key File Locations

**Entry Points:**

- `apps/api/src/main.ts`: Backend entry point.
- `apps/web/src/main.tsx`: Frontend entry point.

**Configuration:**

- `apps/api/src/config/`: Backend configuration loading (e.g., `app.config.ts`, `cors.config.ts`).
- `apps/api/prisma/schema.prisma`: Database schema and ORM configuration.
- `apps/web/vite.config.ts`: Frontend build and development server configuration.
- `apps/web/src/app/theme.ts`: Frontend Ant Design theme configuration.

**Core Logic:**

- `apps/api/src/modules/`: Backend feature modules.
- `apps/web/src/app/router.tsx`: Frontend routing logic.

**Testing:**

- Backend: `.spec.ts` files alongside their implementations (e.g., `apps/api/src/modules/users/users.service.spec.ts`).
- Frontend: `.test.tsx` or `.test.ts` files alongside their implementations (e.g., `apps/web/src/pages/NotFoundPage.test.tsx`).

## Naming Conventions

**Files:**

- Backend Classes: Kebab-case with type suffix (e.g., `users.controller.ts`, `auth.service.ts`).
- Frontend Components: PascalCase (e.g., `PageLoader.tsx`, `DashboardPage.tsx`).
- Frontend Services/Stores: Kebab-case with type suffix (e.g., `users.service.ts`, `theme.store.ts`).

**Directories:**

- Kebab-case (e.g., `shared-types`, `access-control`).

## Where to Add New Code

**New Feature (Full Stack):**

1. **Database:** Update `apps/api/prisma/schema.prisma` with new models.
2. **Backend API:**
   - Create a new directory in `apps/api/src/modules/` (e.g., `new-feature/`).
   - Add `new-feature.module.ts`, `new-feature.controller.ts`, and `new-feature.service.ts`.
   - Register the module in `apps/api/src/app.module.ts`.
3. **Frontend API Client:**
   - Add `new-feature.service.ts` in `apps/web/src/services/`.
4. **Frontend UI:**
   - Add new page components in `apps/web/src/pages/new-feature/`.
   - Update `apps/web/src/app/router.tsx` to add the new route.

**New Component/Module:**

- Reusable UI component: `apps/web/src/components/`
- New Backend common utility: `apps/api/src/common/`

**Utilities:**

- Shared across backend and frontend: `packages/shared-utils/src/`
- Backend only: within the specific module or a common utility service.
- Frontend only: `apps/web/src/utils/`

## Special Directories

**`apps/api/prisma/`**:

- Purpose: Database schema, migrations, and seed scripts.
- Generated: No (migrations are generated but committed).
- Committed: Yes.

**`apps/api/dist/` / `apps/web/dist/`**:

- Purpose: Compiled output.
- Generated: Yes.
- Committed: No.

**`packages/shared-*/dist/`**:

- Purpose: Compiled shared packages for consumption by apps.
- Generated: Yes.
- Committed: No.

---

*Structure analysis: 2026-09-17*

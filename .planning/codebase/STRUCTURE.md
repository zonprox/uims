# Codebase Structure

**Analysis Date:** 2026-08-16

## Directory Layout

```text
/home/user/projects/uims/
├── apps/               # Main application workspaces
│   ├── api/            # NestJS backend API
│   └── web/            # React frontend application
├── packages/           # Shared monorepo dependencies
│   ├── eslint-config/  # Shared ESLint rules
│   ├── shared-types/   # Shared TypeScript types
│   ├── shared-utils/   # Common utility functions
│   └── shared-validators/# Shared Zod validation schemas
├── .planning/          # AI Agent context and documentation
└── turbo.json          # Turborepo configuration
```

## Directory Purposes

**`apps/api/src/`:**
- Purpose: Backend REST API implementation.
- Contains: Modules, common filters/guards/interceptors, database connection logic.
- Key files: `main.ts`, `app.module.ts`

**`apps/web/src/`:**
- Purpose: Frontend React application implementation.
- Contains: Components, pages, layouts, stores, hooks, services.
- Key files: `main.tsx`, `app/App.tsx`, `app/router.tsx`

**`packages/shared-*/`:**
- Purpose: Code sharing between `api` and `web`.
- Contains: TypeScript interfaces, Zod schemas, utility functions.
- Key files: `src/index.ts` in each package.

## Key File Locations

**Entry Points:**
- `apps/web/src/main.tsx`: React application mount point.
- `apps/api/src/main.ts`: NestJS server bootstrap.

**Configuration:**
- `turbo.json`: Monorepo build/task pipeline configuration.
- `apps/api/prisma/schema.prisma`: Database schema definition.
- `apps/web/vite.config.ts`: Frontend bundler configuration.
- `package.json` (root): Workspace definitions.

**Core Logic:**
- `apps/api/src/modules/`: Domain-specific backend logic (e.g., auth, users, inventory).
- `apps/web/src/pages/`: Domain-specific frontend views matching backend modules.

**Testing:**
- `apps/api/vitest.config.mts`: API test runner configuration.
- `apps/web/vitest.config.ts`: Web test runner configuration.

## Naming Conventions

**Files:**
- Kebab-case for most files: `app.module.ts`, `jwt-auth.guard.ts`.
- PascalCase for React components: `PageContainer.tsx`, `NotificationDrawer.tsx`.
- Suffixes for backend files indicating their role: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.validator.ts`.

**Directories:**
- Kebab-case or lowercase: `shared-validators`, `components`, `hooks`.
- Pluralization for grouped items: `modules`, `pages`, `components`.

## Where to Add New Code

**New Feature:**
- Primary backend code: `apps/api/src/modules/[new-feature]/`
- Primary frontend code: `apps/web/src/pages/[new-feature]/`
- Shared validation: `packages/shared-validators/src/[new-feature].validator.ts`
- Shared types: `packages/shared-types/src/[new-feature].types.ts`

**New Component/Module:**
- Shared UI component: `apps/web/src/components/`
- Backend domain module: `apps/api/src/modules/`

**Utilities:**
- Shared helpers (both ends): `packages/shared-utils/src/`
- Web-only helpers: `apps/web/src/utils/`
- API-only helpers: `apps/api/src/common/utils/`

## Special Directories

**`apps/api/prisma/`:**
- Purpose: Database schema, migrations, and seed scripts.
- Generated: No (schema is source of truth, but generates client).
- Committed: Yes.

**`apps/api/dist/` & `apps/web/dist/`:**
- Purpose: Build output artifacts.
- Generated: Yes.
- Committed: No (in `.gitignore`).

**`packages/*/dist/`:**
- Purpose: Compiled shared packages.
- Generated: Yes.
- Committed: No.

---

*Structure analysis: 2026-08-16*

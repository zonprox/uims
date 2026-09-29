# Codebase Structure

**Analysis Date:** 2026-09-28

## Directory Layout
```
/home/user/projects/uims/
├── apps/               # Application entry points and deployable artifacts
│   ├── api/            # NestJS Backend API Application
│   └── web/            # React/Vite Frontend Web Application
├── packages/           # Shared libraries and monorepo packages
│   ├── eslint-config/  # Shared ESLint configurations
│   ├── shared-types/   # Shared TypeScript interfaces, types, and enums
│   ├── shared-utils/   # Common utility functions (formatting, networking, etc.)
│   └── shared-validators/# Zod validation schemas shared across the stack
├── docs/               # Project documentation
├── scripts/            # Build, deployment, and automation scripts
├── docker/             # Docker configurations and setup files
├── .planning/          # Agent planning and architecture documentation
├── .github/            # GitHub Actions workflows and CI/CD pipelines
├── turbo.json          # Turborepo configuration
├── pnpm-workspace.yaml # PNPM workspace definition
└── package.json        # Root package configuration
```

## Directory Purposes

**`apps/api/`:**
- Purpose: Backend REST API application providing business logic and data access.
- Contains: NestJS modules, controllers, services, Prisma ORM schema, and database migrations.
- Key files: `src/main.ts`, `src/app.module.ts`, `prisma/schema.prisma`

**`apps/web/`:**
- Purpose: Frontend single-page application for the user interface.
- Contains: React components, pages, routing, state management (Zustand), and styling.
- Key files: `src/main.tsx`, `src/app/router.tsx`, `vite.config.ts`

**`packages/shared-*/`:**
- Purpose: Code sharing across applications to enforce consistency and DRY principles.
- Contains: TypeScript definitions, Zod schemas, utility functions, and lint rules.
- Key files: `packages/shared-validators/src/index.ts`, `packages/shared-types/src/index.ts`

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Backend application bootstrap and global configuration (filters, pipes).
- `apps/web/src/main.tsx`: Frontend application bootstrap, attaching React to the DOM.

**Configuration:**
- `turbo.json`: Monorepo task orchestration and caching configuration.
- `apps/api/prisma.config.ts`: Configuration for Prisma database client.
- `apps/web/vite.config.ts`: Vite build and development server configuration.
- `apps/web/src/app/query-client.ts`: React Query global configuration (stale times, retries).

**Core Logic:**
- `apps/api/src/modules/`: Backend domain-specific modules (e.g., users, auth, directory).
- `apps/web/src/pages/`: Frontend feature modules, mapped to application routes.
- `apps/web/src/stores/`: Client-side global state management using Zustand.

**Testing:**
- `apps/api/test/`: Backend End-to-End (E2E) testing suites.
- `apps/web/src/**/*.test.tsx`: Colocated frontend component and logic unit tests.
- `packages/shared-*/src/**/*.test.ts`: Colocated utility and validation unit tests.

## Naming Conventions

**Files:**
- React Components: PascalCase (e.g., `NotificationDrawer.tsx`, `ErrorResultView.tsx`)
- NestJS Classes: kebab-case with type suffix (e.g., `users.controller.ts`, `prisma.service.ts`)
- Utility/Hooks: camelCase (e.g., `useAccess.ts`, `format.ts`)
- Tests: Suffix `.test.ts`, `.spec.ts`, or `.adversarial.test.tsx` (e.g., `auth.store.test.ts`)

**Directories:**
- Frontend Components: PascalCase for component folders if they contain multiple files (e.g., `Access/`)
- General/Backend Directories: kebab-case (e.g., `shared-validators`, `modules`, `settings`)

## Where to Add New Code

**New Feature:**
- Primary code: `apps/web/src/pages/[feature-name]/` for UI, `apps/api/src/modules/[feature-name]/` for API.
- Tests: Colocate alongside the implementation as `[file].test.ts` or `[file].spec.ts`.

**New Component/Module:**
- Implementation: `apps/web/src/components/[ComponentName]/` for shared UI elements; `apps/api/src/modules/[module-name]/` for backend domains.

**Utilities:**
- Shared helpers: `packages/shared-utils/src/` if used by both API and Web; otherwise `apps/web/src/utils/` or `apps/api/src/common/`.

## Special Directories

**`apps/api/dist/` & `apps/web/dist/`:**
- Purpose: Compiled and bundled production-ready code.
- Generated: Yes
- Committed: No

**`apps/api/prisma/migrations/`:**
- Purpose: Database schema migration history.
- Generated: Yes (via Prisma CLI)
- Committed: Yes

**`node_modules/`:**
- Purpose: Third-party dependencies installed via PNPM.
- Generated: Yes
- Committed: No

---
*Structure analysis: 2026-09-28*

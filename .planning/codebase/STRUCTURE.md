# UIMS Directory Structure

**Analysis Date:** 2026-08-14

## Root Structure
The UIMS project is a Turborepo monorepo with the following high-level layout:
- `apps/` - Contains the main deployable applications.
- `packages/` - Contains shared code libraries.
- `docker/` - Docker configurations (nginx, postgres) and `docker-compose.yml`.
- `scripts/` - Utility scripts for development and deployment.
- `.planning/` - Project planning and AI-generated documentation.

## Applications (`apps/`)

### 1. Backend (`apps/api/`)
NestJS application handling API logic.
- `src/main.ts`: Application entry point.
- `src/app.module.ts`: Root module wiring the app together.
- `src/common/`: Cross-cutting concerns.
  - `decorators/`: Custom decorators.
  - `dto/`: Shared DTOs or base DTOs.
  - `filters/`: Exception filters (`http-exception.filter.ts`, `prisma-exception.filter.ts`).
  - `guards/`: Authentication/authorization guards.
  - `interceptors/`: Response interceptors (`transform.interceptor.ts`).
  - `pipes/`: Custom validation pipes.
  - `utils/`: General backend utilities.
- `src/config/`: Configuration modules.
- `src/database/`: Database connection files (`prisma.service.ts`).
- `src/modules/`: Feature modules. Each directory represents a domain (e.g., `users/`, `auth/`, `dashboard/`).
  - Convention: Modules group related controllers, services, and DTOs (e.g., `users.controller.ts`, `users.service.ts`, `dto/`).
- `prisma/`: Prisma ORM definitions.
  - `schema.prisma`: The database schema.
  - `migrations/`: Auto-generated migration files.
  - `seed.ts`: Database seeder.

### 2. Frontend (`apps/web/`)
React + Vite frontend application.
- `src/main.tsx`: React application entry point.
- `src/app/`: App-level routing and initialization.
- `src/components/`: Reusable UI components (e.g., `CommandPalette.tsx`, `PageContainer.tsx`).
- `src/layouts/`: Page layout wrappers.
- `src/pages/`: Route-specific page components. Grouped by domain (e.g., `dashboard/`, `users/`, `settings/`).
- `src/hooks/`: Custom React hooks, including React Query wrappers.
- `src/services/`: API interaction layer. Contains Axios configuration (`api.ts`) and domain-specific service files (e.g., `users.service.ts`).
- `src/stores/`: Zustand state stores for global client state.
- `src/styles/`: Global CSS/SCSS or theme files.
- `src/utils/`: Frontend helper utilities.
- `vite.config.ts`: Vite build configuration.

## Packages (`packages/`)
Shared libraries to maintain consistency across apps.
- `eslint-config/`: Shared ESLint configurations.
- `shared-types/`: Shared TypeScript types and interfaces used by both API and Web (e.g., API responses, base entities). Contains `dto/`, `entities/`, `enums/`.
- `shared-utils/`: Common utility functions.
- `shared-validators/`: Shared validation logic (e.g., Zod schemas or custom validation functions like `user.validator.ts`) for consistent validation boundaries.

## Naming Conventions
- **TypeScript Files:** `camelCase.ts` or `kebab-case.ts`.
- **React Components:** `PascalCase.tsx` (e.g., `PageContainer.tsx`).
- **NestJS Files:** `[feature].[type].ts` (e.g., `users.controller.ts`, `users.service.ts`, `app.module.ts`).
- **Directories:** `kebab-case` or `lowercase` (e.g., `shared-types`, `users`).

<!-- refreshed: 2026-08-14 -->
*UIMS Directory Structure analysis: 2026-08-14*

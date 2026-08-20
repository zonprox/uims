# Codebase Testing Setup

**Analysis Date:** 2026-08-20

## Test Framework
- **Vitest**: The primary test runner for both the frontend and backend.
  - **API Config (`apps/api/vitest.config.mts`)**: Configured for the `node` environment, targeting files matching `src/**/*.{test,spec}.ts`.
  - **Web Config (`apps/web/vitest.config.ts`)**: Configured for the `happy-dom` environment, utilizing `@vitejs/plugin-react`, and mapping path aliases (e.g., `@/`, `@uims/*`).
- **Playwright**: The root `package.json` includes `@playwright/test` and `playwright` (v1.62.1) in `devDependencies`. There is a `test:e2e` script, but no Playwright configuration or E2E test files are currently present in the codebase.

## Test Organization
Tests are co-located with the source code they are verifying rather than being placed in a centralized `tests/` directory.
- **Backend (API)**: Test files use the `.spec.ts` extension (e.g., `inventory.service.spec.ts`).
- **Frontend (Web)**: Test files use `.test.ts` or `.test.tsx` extensions (e.g., `auth.store.test.ts`, `OrganizationCanvas.test.tsx`).

## Unit Tests
- **API**: Controllers and services are unit tested by mocking external dependencies. For instance, in `inventory.service.spec.ts`, the Prisma client is manually mocked using `vi.fn()` for all database operations (e.g., `findMany`, `create`).
- **Web**: Unit tests focus on state management (Zustand stores like `auth.store.test.ts`), custom hooks (`useSystemHealth.test.ts`), and utility services. These tests verify state initialization, actions, and side effects. Component testing exists (e.g., `OrganizationCanvas.test.tsx`) but is not the sole focus.

## Integration Tests
- Dedicated integration tests (e.g., making real HTTP requests to endpoints or interacting with a test database instance) do not have a distinct pattern or directory. Most API tests are unit tests that mock the database layer.

## E2E Tests
- **Setup**: While dependencies and a `test:e2e` script exist via Turborepo, Playwright E2E tests are not yet implemented. There are no `playwright.config.ts` files or `e2e` directories.

## Test Utilities
- Tests rely heavily on Vitest's built-in mocking and assertion utilities (`vi.fn()`, `expect`, `describe`, `it`, `beforeEach`).
- Mocks and fixtures are typically constructed inline within the `beforeEach` blocks of individual test suites rather than being imported from centralized factory files or a dedicated utilities directory.

## Coverage
- **Current State**: There are 32 test files in the backend (`apps/api/src/**/*.spec.ts`) and 11 test files in the frontend (`apps/web/src/**/*.test.{ts,tsx}`). 
- **Gaps**:
  - E2E test coverage is currently 0%.
  - Database integration tests are lacking, as data access layers are mocked.
  - Frontend component testing coverage appears thin relative to the number of components; the focus is visibly skewed towards testing hooks and stores.

## CI/CD Testing
- Testing is orchestrated using Turborepo via the root `package.json`:
  - `pnpm run test`: Executes `turbo run test` to run Vitest suites across all applicable workspaces concurrently and with caching.
  - `pnpm run test:e2e`: Executes `turbo run test:e2e` (currently a no-op given the lack of E2E setup).

---
*Analysis Date: 2026-08-20*

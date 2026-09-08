# Testing Strategy
**Analysis Date:** 2026-09-08

## Overview
The UIMS monorepo uses Vitest as the primary test runner for both the backend (`apps/api`) and frontend (`apps/web`). The test strategy focuses heavily on unit testing core services and frontend components, with a unified testing framework across the workspace.

## Test Framework & Tools
- **Runner**: Vitest (v4.1.11).
- **Environment**: Backend runs in the default Node environment, while the frontend is configured to use `happy-dom` (via `vitest.config.ts`).
- **Assertion Library**: Vitest's built-in `expect` and mocking (`vi`).

## Backend Testing
### Unit Test Patterns
- Test files are collocated with their corresponding source files using the `*.spec.ts` naming convention (e.g., `assets.service.spec.ts`).
- Tests rely heavily on isolated unit testing, ensuring that business logic in services is tested independently of the database.

### Mocking Strategy
- Database dependencies (Prisma) are heavily mocked using `vi.fn()`.
- Complex operations like `this.prisma.$transaction` are mocked by yielding the mock Prisma client instance back to the callback.
- Service dependencies (like `NotificationsService`) are stubbed or optionally omitted if not critical to the core logic being tested.

### Test File Organization
- Tests reside inside the module directories alongside implementation (e.g., `apps/api/src/modules/assets/assets.service.spec.ts`).
- Naming scheme: `*.spec.ts`.

## Frontend Testing
### Component Test Patterns
- Test files are collocated with React components using the `*.test.tsx` and `*.test.ts` naming conventions (e.g., `ErrorBoundary.test.tsx`, `auth.store.test.ts`).
- Component tests directly render React trees and validate DOM node presence, text content, and interactions.
- Complex tests use `createRoot`, `act`, and manual DOM creation (e.g., `document.createElement`) to assert component lifecycles and error boundaries safely.

### Mocking Strategy
- State stores (like Zustand's `auth.store.ts`) are manually reset before each test block (`beforeEach`) to ensure test isolation.
- Global browser APIs (e.g., `console.error`) are often spied on or stubbed using `vi.fn()` to suppress expected error output during boundary tests.

### Test Utilities
- Direct DOM manipulation is utilized heavily, though tools like `@testing-library/react` might be beneficial for standardizing queries. Test utilities primarily revolve around custom render wrappers for context providers (e.g., wrapping with Ant Design's `App` and `ConfigProvider`).

## E2E Testing
- **Status**: No End-to-End (E2E) testing configuration was found.
- There are no `playwright.config.ts` or `cypress.config.ts` files present in the repository.

## Test Scripts & CI
- Backend test scripts (`apps/api/package.json`):
  - `test`: Runs `vitest run`
  - `test:watch`: Runs `vitest`
- Frontend test scripts (`apps/web/package.json`):
  - `test`: Runs `vitest run`

## Coverage Configuration
- There are no explicit test coverage commands or coverage threshold configurations defined in the `package.json` scripts or `vitest.config.ts` files. The focus is currently on successful test execution rather than enforcing coverage metrics.

## Gaps & Recommendations
1. **Missing E2E Tests**: There is no end-to-end test suite configured. Adopting Playwright or Cypress is highly recommended to validate user flows across the full stack.
2. **Coverage Tracking**: Coverage reporting is not configured. Consider adding `@vitest/coverage-v8` to track code coverage metrics.
3. **Frontend Testing Library**: Consider integrating `@testing-library/react` in the frontend to simplify DOM assertions and encourage accessible UI testing patterns.
4. **Data Fetching Mocks**: Standardize mocking for API calls and TanStack Query interactions if the latter is broadly adopted in the future.

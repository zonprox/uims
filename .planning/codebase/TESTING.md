# Testing Patterns

**Analysis Date:** 2026-08-14

## Test Framework

**Runner:**
- **Framework:** Vitest (`^4.1.10`)
- Integrates with `@nestjs/testing` for backend module/DI mocking and DOM testing libraries for the frontend.

**Run Commands:**
- `turbo run test`: Runs `vitest run` across the monorepo.
- `turbo run test:watch`: Runs `vitest` in watch mode.
- `turbo run test:e2e`: Triggers E2E tests workspace-wide.

## Test File Organization
- Tests are colocated with the source files they verify.
- **Backend (API):** Uses the `*.spec.ts` naming convention (e.g., `health.controller.spec.ts`).
- **Frontend/Shared:** Uses the `*.test.ts` naming convention (e.g., `auth.store.test.ts`, `format.test.ts`).

## Test Structure
- Organized using standard BDD blocks: `describe()`, `beforeEach()`, and `it()`.
- Global test functions are enabled via Vitest config (`globals: true`), reducing import overhead.
- Frontend tests run in the `happy-dom` environment (configured in `apps/web/vitest.config.ts`).

## Mocking
- Uses Vitest's built-in mocking (`vi.fn()`, `vi.mock()`).
- In API tests, framework-specific interfaces (like Express Request/Response) are mocked manually with `vi.fn()` (e.g., `http-exception.filter.spec.ts`).
- NestJS dependency injection is utilized for providing mock services to controllers.

## Fixtures and Factories
- Minimal reliance on centralized factories. Mock data is generally declared inline within the test files (e.g., `mockUser` in store tests).

## Coverage
- No explicit coverage threshold configuration detected in `package.json`. Coverage generation relies on Vitest's default capabilities (e.g., running `vitest run --coverage`).

## Test Types
- **Unit Tests:** High density of unit tests for utilities (`shared-utils`), validators (`shared-validators`), Zustand stores (`auth.store.test.ts`), and NestJS controllers/filters.
- **E2E Tests:** Configured at the workspace level, typically orchestrated by Turbo to test integrated apps.

## Common Patterns
- **Store Testing:** Zustand stores are tested by resetting state in `beforeEach` (`useAuthStore.setState({...})`) and verifying state transitions after calling actions.
- **Filter Testing:** NestJS filters are tested by mocking the ExecutionContext host and verifying that the correct JSON payload and HTTP status code are sent to the response object.

---

*Testing analysis: 2026-08-14*

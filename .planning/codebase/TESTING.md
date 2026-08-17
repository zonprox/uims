# Testing Patterns
**Analysis Date:** 2026-08-17

## Test Framework
- **Unit & Integration:** `Vitest` is configured across the monorepo.
  - Web config: `apps/web/vitest.config.ts` (using `happy-dom`).
  - API config: `apps/api/vitest.config.mts` (using `node`).
- **End-to-End:** `Playwright` is used for E2E tests (`@playwright/test`).

## Test File Organization
- **Colocation:** Tests are colocated directly next to the files they are testing.
- **Naming Conventions:** 
  - Use `*.spec.ts` for backend API modules (e.g., `assets.service.spec.ts`).
  - Use `*.test.ts` for frontend Web components and utilities (e.g., `api.test.ts`, `auth.store.test.ts`).

## Test Structure
- Standard `describe` and `it` blocks are required.
- **Goal-Driven Execution:** Test names should define a clear success criterion tracing back to specific behavior (e.g., `it('should create an asset with atomic category and location lookup within transaction')`).
- **Isolation Setup:** Use `beforeEach` to reset all shared state and mocks (e.g., resetting Zustand stores with `useAuthStore.setState({ user: null, token: null });`).

## Mocking
- Exclusively use `vi.fn()` and `vi.spyOn()` from Vitest.
- **Database Mocks:** Mock Prisma dependencies fully in backend tests by replacing the service layer (e.g., `mockPrisma.$transaction` and nested model methods like `mockPrisma.asset.findMany`).
- **HTTP Clients:** For frontend Axios clients, mock the adapter to intercept network requests (e.g., `const mockAdapter = vi.fn().mockResolvedValue(...)`).
- **Store Mocks:** Directly mutate Zustand stores using `.setState()` rather than mocking the store hook.

## Fixtures and Factories
- Use inline static object factories to construct payloads (e.g., inline mock API responses or Prisma query results). No extensive factory library is currently used.

## Coverage
- Handled by Vitest globally. The configuration explicitly excludes `dist/**`, `node_modules/**`, and `*.generated.*` files.

## Test Types
- **Unit Tests:** Found extensively for API controllers, API services, and Web hooks.
- **Service Integration:** API service tests evaluate transactional integrity and complex data fetching patterns without a live database.
- **E2E Tests:** Invoked via standard `turbo run test:e2e` scripts.

## Common Patterns
- **Prisma Transactions:** Validate transactional integrity by checking that `mockPrisma.$transaction` is invoked correctly.
- **Enterprise Language:** All test descriptions and error string assertions MUST be in clear, standardized Enterprise English.

---
*Testing analysis: 2026-08-17*

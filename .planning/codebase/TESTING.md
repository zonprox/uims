# Testing Patterns

**Analysis Date:** 2026-08-15

## Test Framework
- **Framework**: `vitest` is the standard testing framework across the monorepo.
- **Configuration**: Managed via `vitest.config.mts` (API) and `vitest.config.ts` (Web). Configured with `globals: true` and `passWithNoTests: true`.

## Test File Organization
- **Placement**: Tests are co-located with their source files.
- **Naming**: 
  - API layer uses `*.spec.ts` (e.g., `apps/api/src/modules/assets/assets.service.spec.ts`).
  - Web and shared packages use `*.test.ts` (e.g., `apps/web/src/stores/auth.store.test.ts`).

## Test Structure
- Use standard `describe` blocks to group tests by class or domain.
- Use nested `describe` blocks for individual methods (e.g., `describe('create', () => { ... })`).
- Use `beforeEach` to reset state or initialize mock dependencies before each `it` block.

## Mocking
- **Functions**: Use `vi.fn()` for creating mock functions.
- **Dependencies (API)**: Mock heavy dependencies like `PrismaService` by providing a mocked object during service instantiation:
  ```typescript
  mockPrisma = {
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    asset: { create: vi.fn(), findMany: vi.fn() },
  };
  service = new AssetsService(mockPrisma as unknown as PrismaService);
  ```
- **State (Web)**: Reset Zustand stores in `beforeEach` to ensure isolated tests (e.g., `useAuthStore.setState({ user: null, token: null });`).

## Fixtures and Factories
- Use hardcoded object fixtures inline to resolve mock returns (e.g., `mockPrisma.asset.findMany.mockResolvedValue([{ id: 'ast-1' }])`).
- No heavy usage of factory libraries observed; maintain simple, minimal mocked payloads focusing only on the fields required for the test logic.

## Coverage
- Test coverage is generated via Vitest (as indicated by the `coverage/**` ignore pattern in ESLint).

## Test Types
- **Unit Tests**: Focus on business logic in services (API), store state transitions (Web), and pure utility functions (Shared).

## Common Patterns
- **Transactional Tests**: When testing methods involving database transactions (`$transaction`), ensure the mock transaction callback is correctly executed and assertions cover the nested operations.
- **Store Testing**: For Zustand stores, use `store.getState()` to call actions and assert on state changes. Ensure initial state is reset properly via `setState` in `beforeEach`.

---
*Testing analysis: 2026-08-15*

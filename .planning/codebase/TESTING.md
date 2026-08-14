# Testing Patterns

**Analysis Date:** 2026-08-14

## Framework & Tooling
- **Test Runner**: Vitest (`vitest.config.ts`/`vitest.config.mts`) is used uniformly across the monorepo.
  - The backend (`apps/api`) runs in a `node` environment.
  - The frontend (`apps/web`) uses the `happy-dom` environment.
- **Commands**: Tests can be triggered from the root via `turbo run test`. The backend and frontend execute their local tests using Vitest.

## Test File Structure
- Test files should be strictly co-located with their implementation files.
- **Backend**: Use the `.spec.ts` suffix (e.g., `apps/api/src/modules/assets/assets.service.spec.ts`).
- **Frontend**: Use the `.test.ts` or `.test.tsx` suffix (e.g., `apps/web/src/stores/auth.store.test.ts`).

## Mocking & Testing Patterns
### Backend Services (apps/api)
- **Direct Instantiation**: The backend bypasses the NestJS testing utility (`Test.createTestingModule`). Instead, services are instantiated directly with their mocked dependencies. This approach drastically speeds up test execution and limits framework overhead.
  ```typescript
  // Pattern example
  let service: AssetsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      asset: { create: vi.fn(), findMany: vi.fn() },
    };
    service = new AssetsService(mockPrisma);
  });
  ```
- **Prisma Transactions**: As shown above, `$transaction` is mocked by providing a callback that immediately passes back the mocked Prisma object to ensure inner queries map correctly to the mocked repository methods.
- **Assertions**: Standard Vitest assertions (`expect`, `toHaveBeenCalledWith`, `mockResolvedValueOnce`) are used to validate business logic and repository interactions.

### Frontend Logic (apps/web)
- **State Store Testing**: Zustand stores are tested by resetting state in `beforeEach` via `store.setState()`, calling store methods, and asserting on `store.getState()`.
  ```typescript
  // Pattern example
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  it('should login and set state', () => {
    useAuthStore.getState().login('token', mockUser);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });
  ```
- **Component Testing**: The frontend suite primarily focuses on business logic (services, API layers, stores). There are currently no unit tests for React components (`.test.tsx` files). Stick to testing core logic unless specifically prompted to build component tests.

## Coverage & Execution
- **Pass With No Tests**: The configuration permits passing test runs even if no tests exist (`passWithNoTests: true`).
- **E2E Testing**: E2E infrastructure leans on Playwright (`@playwright/test` is in the root `package.json` dependencies, with a `test:e2e` script defined). E2E suites are slated to cover critical integration flows, although unit tests remain the priority for new business logic.

*Codebase testing patterns analysis: 2026-08-14*
<!-- refreshed: 2026-08-14 -->

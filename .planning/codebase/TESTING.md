# Testing Patterns

**Analysis Date:** 2026-08-15

## Test Framework

**Runner:**
- Vitest v4
- Config: `apps/web/vitest.config.ts` (using `happy-dom`), `apps/api/vitest.config.mts`

**Assertion Library:**
- Vitest built-in `expect`

**Run Commands:**
```bash
turbo run test         # Run all tests via turborepo
vitest run             # Run tests in specific workspace
turbo run test:e2e     # Run e2e tests (configured but tests currently absent)
```

## Test File Organization

**Location:**
- Co-located with the source files they test.

**Naming:**
- Matches source file with `.test.ts`, `.spec.ts`, or `.test.tsx` (e.g., `useAssetManagement.test.ts`, `users.service.spec.ts`).

**Structure:**
```
src/
  hooks/
    useSystemHealth.ts
    useSystemHealth.test.ts
  modules/
    users/
      users.service.ts
      users.service.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('UsersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate system login user metrics', async () => {
    // test body
  });
});
```

**Patterns:**
- **Setup:** Uses `beforeEach` to initialize services, mock dependencies, and reset DOM/containers (e.g., `document.createElement('div')`).
- **Teardown:** `vi.clearAllMocks()` in `beforeEach`, and `root.unmount()` in React hook tests.
- **Assertion:** Uses standard `expect(result).toEqual(...)` or `expect(result).toBe(...)`.

## Mocking

**Framework:** Vitest (`vi`)

**Patterns:**
```typescript
// Module Mocking
vi.mock('../services/health.service', () => ({
  healthService: {
    checkHealth: vi.fn(),
  },
}));

// Object Mocking (e.g., Prisma)
const mockPrisma = {
  user: {
    count: vi.fn(),
  }
};
(mockPrisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(50);
```

**What to Mock:**
- External services and API boundaries (e.g., `healthService`, `assetsService`).
- Database clients (e.g., Prisma models).

**What NOT to Mock:**
- Pure utility functions (e.g., `buildAssetSpecs`).

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data is typically used over external fixtures
const payload = buildAssetPayload({
  tag: 'AST-1099',
  name: 'Dell XPS 16',
  // ...
});
```

**Location:**
- Test data is defined inline within the test files rather than in dedicated fixture directories.

## Coverage

**Requirements:** None enforced natively in configs.

**View Coverage:**
```bash
vitest run --coverage  # Requires vitest coverage provider installation
```

## Test Types

**Unit Tests:**
- Used heavily for React hooks, utility functions, and backend services. Hooks are tested natively using `react-dom/client` `createRoot` and `act` (without React Testing Library).

**Integration Tests:**
- Not distinctly separated; backend tests currently mock the database (Prisma) indicating a preference for unit isolation over DB integration.

**E2E Tests:**
- Playwright is present in `package.json` (`test:e2e`), but no explicit e2e test directories or configs currently implemented.

## Common Patterns

**Async Testing (React Hooks):**
```typescript
const root = createRoot(container);
await act(async () => {
  root.render(createElement(TestComponent));
});

// Allow promise resolution for internal state updates
await act(async () => {
  await Promise.resolve();
});
```

**Error Testing:**
```typescript
vi.mocked(healthService.checkHealth).mockRejectedValueOnce(new Error('Network error'));
// wait for resolution and assert error state
expect(currentHookState!.error).toBe('Network error');
```

---

*Testing analysis: 2026-08-15*

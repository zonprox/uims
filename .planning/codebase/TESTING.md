# Testing Patterns

**Analysis Date:** 2026-09-10

## Test Framework
**Runner:**
- Vitest (`vitest.config.ts`) across the workspace.

**Assertion Library:**
- Vitest's built-in `expect`.

**Run Commands:**
- Root: `turbo run test`, `turbo run test:e2e`.
- Web/API: `vitest run` and `vitest` (for watch mode).

## Test File Organization
**Location:**
- Tests live adjacent to the implementation files (e.g., `apps/api/src/modules/auth/auth.service.spec.ts`).
- Web tests are inside `__tests__` folders (e.g., `apps/web/src/features/auth/__tests__/auth.test.tsx`).

**Naming:**
- Backend: `*.spec.ts`
- Frontend: `*.test.tsx`

**Structure:**
- Wrap everything in a primary `describe` block.
- Setup uses `beforeEach` and cleanup `afterEach`.

## Test Structure
**Suite Organization:**
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: { findByIdentifier: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockUsersService = { findByIdentifier: vi.fn() };
  });

  it('should authenticate user', async () => {
    // ... test logic
  });
});
```

**Patterns:**
- Extensive use of variable capturing in outer `describe` scopes for global mock objects.

## Mocking
**Framework:**
- Vitest's `vi` utility.

**Patterns:**
- Services use manual mock objects with typed `vi.fn()` returns injected instead of real dependencies.
- React hooks are mocked heavily using `vi.mock()` at the top level.

```typescript
// Mocking a React hook
vi.mock('../../hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({
    health: { status: 'ok', uptimePercent: '100%', clientLatencyMs: 12 },
    isOnline: true,
  }),
}));

// Mocking Prisma Service in NestJS
mockPrismaService = {
  appUser: {
    findUnique: vi.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE' }),
  },
};
```

## Fixtures and Factories
**Test Data:**
- Ad-hoc test data is usually hardcoded in tests via `mockResolvedValue()`. Factories aren't highly centralized.

**Location:**
- Stored inline within the `*.spec.ts` files.

## Coverage
**Requirements:**
- Unspecified by default configuration, relying on turbo and vitest standard outputs.

**View Coverage:**
- Typically generated dynamically if requested via CLI flags.

## Test Types
**Unit Tests:**
- Dominant form of testing. Cover components (`SidebarContent`), services (`AuthService`), and isolated exception filters (`http-exception.filter.spec.ts`).

**Integration Tests:**
- Tested minimally on the unit level; mostly replaced by testing NestJS controller flow.

**E2E Tests:**
- Standardized via turbo pipeline (`test:e2e`), testing the full application boundaries.

## Common Patterns
**Async Testing:**
- React component tests utilize React 18 `act` wrapper for rendering:
```typescript
const root = createRoot(container);
await act(async () => {
  root.render(createElement(SidebarContent, { ...props }));
});
```
- Requires setting environment flag: `(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;`

**Error Testing:**
- NestJS services test exceptions using `expect(...).rejects.toThrow(UnauthorizedException)`. 

---
*Testing analysis: 2026-09-10*

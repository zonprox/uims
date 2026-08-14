# Testing Patterns

**Analysis Date:** 2026-08-14

## Test Framework

**Runner:**
- Vitest 4.1.10 - Uniform test runner configured across all workspaces
- Frontend DOM environment: `happy-dom` 20.11.2 (in `apps/web/vitest.config.ts`)
- Backend environment: Node.js environment (in `apps/api/vitest.config.mts`)

**Assertion Library:**
- Vitest built-in assertions (`expect`, `toBe`, `toEqual`, `toBeDefined`, `toBeNull`, `toThrowError`)

**Run Commands:**
```bash
# Run entire test suite across monorepo
pnpm test

# Run tests in specific package / app
pnpm --filter @uims/api test
pnpm --filter @uims/web test
pnpm --filter @uims/shared-validators test
pnpm --filter @uims/shared-utils test

# Watch mode
pnpm --filter @uims/web test:watch
pnpm --filter @uims/api test:watch

# End-to-end testing
pnpm test:e2e
```

## Test File Organization

**Location:**
- Unit & integration tests are co-located alongside target source code or in adjacent spec files.
- `apps/api/src/**/*.spec.ts` for NestJS controllers, filters, and services.
- `apps/web/src/**/*.test.ts` or `*.test.tsx` for React hooks, stores, and utilities.
- `packages/shared-*/**/*.test.ts` for shared library tests.

**Structure:**
```
apps/
  api/
    src/
      common/filters/
        http-exception.filter.ts
        http-exception.filter.spec.ts
      modules/health/
        health.controller.ts
        health.controller.spec.ts
  web/
    src/
      stores/
        auth.store.ts
        auth.store.test.ts
        theme.store.ts
        theme.store.test.ts
packages/
  shared-utils/
    src/
      format.ts
      format.test.ts
  shared-validators/
    src/
      common.validator.ts
      common.validator.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SharedUtils.format', () => {
  describe('formatBytes', () => {
    it('should format bytes into human-readable units correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });
});
```

**NestJS Controller / Filter Test Pattern:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });
});
```

## Mocking

**Framework:**
- Vitest built-in mock utilities (`vi.fn()`, `vi.spyOn()`, `vi.mock()`).

**Patterns:**
- Mocking external services (e.g. `authService` in `auth.store.test.ts`):
```typescript
import { vi } from 'vitest';
import { authService } from '../services/auth.service';

vi.mock('../services/auth.service', () => ({
  authService: {
    logout: vi.fn(),
  },
}));
```
- Mocking database / ORM access: In unit tests, inject mock PrismaService objects with jest/vitest spy functions to prevent direct database connections.

## Fixtures and Factories

**Test Data Helpers:**
- Define mock user payloads and fixture records inline or in dedicated test helper files.
- Sample user fixtures for store testing:
```typescript
const mockUser = {
  id: 'user-1',
  email: 'admin@acme.corp',
  name: 'Admin User',
  role: 'Super Admin',
};
```

## Coverage

**Requirements:**
- Coverage output configured via Turborepo task pipeline (`outputs: ["coverage/**"]`).
- Focus areas: Shared validation schemas, core business calculations, security filters, state management stores.

## Test Types

**Unit Tests:**
- Fast tests for isolated pure functions, validators, Zustand state stores, and utility modules. Execution time < 100ms per file.

**Integration Tests:**
- NestJS controller and filter testing with simulated Nest execution contexts.

**E2E Tests:**
- Playwright test harness (`@playwright/test`) configured in root for end-to-end UI and authentication workflows (`scripts/test-login.mjs`, `scripts/test-responsive.mjs`).

---

*Testing analysis: 2026-08-14*
*Update when test patterns change*

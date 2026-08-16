# Testing Patterns

**Analysis Date:** 2026-08-16

## Test Framework

**Runner:**
- Vitest (`v4.1.10`) for Unit/Integration tests.
- Config: `vite.config.ts` / `vitest.config.ts` (implied by Vite usage).

**Assertion Library:**
- Vitest's built-in `expect` (Chai/Jest compatible).

**Run Commands:**
```bash
turbo run test         # Run all unit tests across the workspace
vitest run             # Run tests in a specific package
vitest                 # Watch mode
turbo run test:e2e     # Run end-to-end tests
```

## Test File Organization

**Location:**
- Co-located with the implementation file.

**Naming:**
- Suffix `.spec.ts` (e.g., `users.service.spec.ts`).

**Structure:**
```text
apps/api/src/modules/users/
├── users.service.ts
└── users.service.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    // setup
  });

  describe('getStats', () => {
    it('should aggregate system login user metrics', async () => {
      // test logic
    });
  });
});
```

**Patterns:**
- **Setup:** Use `beforeEach` to instantiate the service/component and reset mock objects.
- **Assertion:** Arrange-Act-Assert pattern, using `expect(res).toEqual(...)` or `.toBe(...)`.

## Mocking

**Framework:** Vitest (`vi`).

**Patterns:**
```typescript
let mockPrisma: Record<string, unknown>;

beforeEach(() => {
  mockPrisma = {
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  service = new UsersService(
    mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
  );
});

it('should update user status', async () => {
  (mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValueOnce({
    id: 'usr-1',
  });

  const res = await service.toggleStatus('usr-1', 'SUSPENDED');
  expect(res.status).toBe('SUSPENDED');
});
```

**What to Mock:**
- External dependencies (e.g., Prisma database client, HTTP clients).
- File system and external service interactions.

## Test Types

**Unit Tests:**
- Validate business logic in services and controllers in isolation.
- Co-located `.spec.ts` files.

**Integration Tests:**
- Validate interaction between internal modules.

**E2E Tests:**
- Framework: Playwright (`@playwright/test`).
- Command: `turbo run test:e2e`.

---

*Testing analysis: 2026-08-16*

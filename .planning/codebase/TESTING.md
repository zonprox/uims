---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
# Testing Patterns

**Analysis Date:** 2026-09-17

## Test Framework

**Runner:**

- Vitest 5.x
- Config: `vitest.config.ts` (Web) and `vitest.config.mts` (API)

**Assertion Library:**

- Vitest's built-in `expect` (Chai-based)

**Run Commands:**

```bash
turbo run test              # Run all unit tests
turbo run test:e2e          # Run end-to-end tests via Playwright
vitest                      # Watch mode (in specific app dirs)
```

## Test File Organization

**Location:**

- Co-located next to the implementation files they test (e.g., `assets.service.ts` and `assets.service.spec.ts` in the same directory).

**Naming:**

- API (NestJS): `*.spec.ts`
- Web (React/Hooks/Utils): `*.test.ts`
- UI Components: `*.test.tsx`

**Structure:**

```
src/
  modules/
    assets/
      assets.service.ts
      assets.service.spec.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, expect, it, beforeEach } from 'vitest';

describe('AssetsService', () => {
  describe('create', () => {
    it('should create an asset and assign a generated tag', async () => {
      // test body
    });
  });
});
```

**Patterns:**

- **Setup:** Use `beforeEach` to reinitialize the service and mock dependencies before each test, ensuring a clean state.
- **Teardown:** Let Vitest handle garbage collection. Explicit teardowns are rare unless dealing with external resources.
- **Assertion:** Act on the subject under test and use `expect(...)` for structural and value assertions.

## Mocking

**Framework:** Vitest (`vi.fn`, `vi.mock`)

**Patterns:**

```typescript
// Manual Mocking using Dependency Injection (API)
let mockPrisma: Record<string, unknown>;

beforeEach(() => {
  mockPrisma = {
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    asset: { create: vi.fn(), findUnique: vi.fn() },
  };
  service = new AssetsService(mockPrisma as any);
});

// Setting mock returns
mockPrisma.asset.findUnique.mockResolvedValue({ id: 'ast-1', status: 'IN_USE' });
```

**What to Mock:**

- Database calls (Prisma).
- External service calls (e.g., HTTP clients, notifications service).
- Global window APIs in Web when needed.

**What NOT to Mock:**

- Pure utilities, domain formatting functions, or simple state management logic. Use real implementations where possible for integration confidence.

## Fixtures and Factories

**Test Data:**

```typescript
// Inline literal objects are often used for test data
const mockAsset = {
  id: 'ast-1',
  name: 'MacBook Pro 16',
  status: AssetStatus.IN_USE,
  specs: { cpu: 'M3 Max', ram: '64GB' }
};
```

**Location:**

- Fixtures are usually defined inline within the `describe` or `it` blocks for visibility. Shared mocks may be stored in setup files, but prefer explicit localized test data.

## Coverage

**Requirements:** None explicitly enforced in CI/CD via configuration at the moment.

**View Coverage:**

```bash
turbo run test -- --coverage
```

## Test Types

**Unit Tests:**

- Scoped to individual services, utilities, hooks, or components. 
- API: Heavily tests business logic in services (e.g., status transitions in `AssetsService`).
- Web: Tests hook logic (`useAssetManagement.test.ts`), utility parsing, and formatting functions.

**Integration Tests:**

- Often blended with unit tests. Boundary specifications exist (e.g., `notifications.boundary.spec.ts`).

**E2E Tests:**

- Framework: Playwright (`@playwright/test`).
- Tests end-to-end user flows and API integrations.

## Common Patterns

**Async Testing:**

```typescript
it('should perform async operations correctly', async () => {
  mockPrisma.asset.create.mockResolvedValue(mockAsset);
  const result = await service.create(mockDto);
  expect(result.id).toBe('ast-1');
  expect(mockPrisma.asset.create).toHaveBeenCalled();
});
```

**Error Testing:**

```typescript
it('should throw NotFoundException if category is invalid', async () => {
  mockPrisma.assetCategory.findUnique.mockResolvedValue(null);
  
  await expect(service.create({ categoryId: 'invalid' }))
    .rejects
    .toThrow(NotFoundException);
});
```

---

*Testing analysis: 2026-09-17*

---
last_mapped_commit: 47a62716158aff0e5b1b981ab498a7df3f1defc4
last_mapped_at: 2026-10-12
---
# Testing Patterns

**Analysis Date:** 2026-10-12

## Test Framework

**Runner:**
- Vitest 5.0.0 - Primary test runner for unit, integration, and UI component tests across monorepo packages
  - Backend Config: `apps/api/vitest.config.mts` (Environment: `node`, timeout: `20000ms`)
  - Frontend Config: `apps/web/vitest.config.ts` (Environment: `happy-dom`, timeout: `30000ms`, with `@vitejs/plugin-react`)
  - Shared Packages: Vitest 5.0.0 with Happy-DOM and Node environments
- Playwright 1.63.0 - End-to-end browser and automated network testing (`playwright.config.ts`, `scripts/run-e2e-network.mjs`)

**Assertion Library:**
- Vitest built-in assertions (`expect`, `vi`) conforming to standard Jest/Chai assertion signatures
- Extended DOM matchers available in browser environments

**Run Commands:**

```bash

# Monorepo Orchestration via Turborepo

pnpm test                         # Run all test suites across all packages in parallel
pnpm test:e2e                     # Execute Playwright end-to-end integration tests
pnpm test:e2e:network             # Run dedicated network module end-to-end verification

# App-Specific Testing

pnpm --filter @uims/api test      # Run API unit and integration test suite
pnpm --filter @uims/web test      # Run Web SPA component and service test suite
pnpm --filter @uims/api test:watch# Interactive watch mode during backend development
```

## Test File Organization

**Location:**
- API Unit & Service Tests: Co-located with source code (`apps/api/src/modules/assets/assets.service.spec.ts`, `assets.controller.spec.ts`)
- API End-to-End & Governance: Dedicated test directory (`apps/api/test/e2e/`, `apps/api/test/governance/`)
- Web Component & Page Tests: Co-located with components and pages (`apps/web/src/pages/assets/AssetsPage.test.tsx`, `apps/web/src/components/PageContainer.test.tsx`)
- Specialized Adversarial Suites: `apps/web/src/AppFeedbackSafety.test.tsx`, `apps/web/src/layouts/Milestone1Adversarial.test.tsx`

**Naming:**
- Unit & Service Tests: `[name].spec.ts` or `[name].test.ts`
- UI Component Tests: `[Name].test.tsx`
- Stress / Adversarial Tests: `[Name].stress.test.tsx` or `[Name]-adversarial.spec.ts`
- End-to-End Tests: `[name].e2e-spec.ts`

**Structure:**

```
apps/
├── api/
│   ├── src/modules/assets/
│   │   ├── assets.controller.ts
│   │   ├── assets.controller.spec.ts
│   │   ├── assets.service.ts
│   │   └── assets.service.spec.ts
│   └── test/
│       └── e2e/
│           ├── m1-websocket-gateway-adversarial.spec.ts
│           └── network-modernization.e2e-spec.ts
└── web/
    └── src/
        ├── AppFeedbackSafety.test.tsx
        ├── components/
        │   ├── PageContainer.tsx
        │   └── PageContainer.test.tsx
        └── pages/assets/
            ├── AssetsPage.tsx
            └── AssetsPage.test.tsx
```

## Test Structure

**Suite Organization:**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetsService } from './assets.service';
import type { PrismaService } from '../../database/prisma.service';

describe('AssetsService', () => {
  let service: AssetsService;
  let prismaMock: Partial<PrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = {
      asset: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
      } as unknown as PrismaService['asset'],
    };
    service = new AssetsService(prismaMock as PrismaService);
  });

  it('enforces pagination upper bounds and deterministic ordering', async () => {
    await service.findAll({ page: 1, limit: 200 });

    expect(prismaMock.asset?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100, // Capped to maximum safe limit
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // Deterministic tie-breaker
      }),
    );
  });
});
```

**Clean Component Test Teardown (React 19 / Ant Design):**
Component tests rendering Ant Design trees must unmount cleanly and remove portal root elements in `afterEach` to prevent microtask leaks:

```typescript
let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  container?.remove();
  container = null;
  // Clean up stray Ant Design portal elements from DOM body
  document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover').forEach((el) => el.remove());
});
```

## Mocking

**Framework:**
- Vitest built-in mocking engine (`vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.mocked()`)
- Zero casting to `any` (`as any`) in test mocks. Mocks must use `Partial<T>`, `vi.mocked()`, or strongly typed mock factories.

**Patterns:**

```typescript
// Strongly typed service client mocking
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));
```

**What to Mock:**
- Network transport layers (`api.ts` Axios requests, external HTTP calls)
- Third-party external services (MeiliSearch indexing, SeaweedFS S3 uploaders)
- Live database connections in pure unit tests (`PrismaService`)
- Browser globals not provided by Happy-DOM (e.g. `ResizeObserver`, `window.matchMedia`)

**What NOT to Mock:**
- Business validation schemas (`@uims/shared-validators` Zod schemas)
- Transformation filters, pipes, and utility functions (`@uims/shared-utils`)
- Standard React hooks and core Zustand state logic (test real state transitions)

## Fixtures and Factories

**Test Data:**

```typescript
export function createMockAsset(overrides?: Partial<Asset>): Asset {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    assetTag: 'AST-1001',
    name: 'MacBook Pro 16',
    modelId: '22222222-2222-2222-2222-222222222222',
    serialNumber: 'SN-ABC-12345',
    status: 'ACTIVE',
    condition: 'EXCELLENT',
    purchaseDate: new Date('2025-01-15T00:00:00Z'),
    purchaseCost: 2499.00,
    warrantyExpiry: new Date('2028-01-15T00:00:00Z'),
    createdAt: new Date('2025-01-15T00:00:00Z'),
    updatedAt: new Date('2025-01-15T00:00:00Z'),
    ...overrides,
  };
}
```

**Location:**
- Seed fixtures: `apps/api/prisma/seeders/`
- Mock factories: Co-located with tests or declared in `test/fixtures/`

## Coverage

**Current Test Metrics:**
- Total Test Suites: 85 test files
- Total Tests: 1,062 automated tests across the monorepo (1,061 passing, 1 known UI column text mismatch under review)
- Typecheck Coverage: 100% clean across all 6 workspace packages (`pnpm typecheck` passed with 8/8 cached tasks)

**View Coverage:**

```bash
pnpm --filter @uims/api test -- --coverage
pnpm --filter @uims/web test -- --coverage
```

## Test Types

**Unit Tests:**
- Validate isolated functions, cryptographic hashing, Zod schema validation, and pure domain services.
- Examples: `asset.validator.test.ts`, `license-crypto.spec.ts`, `date.util.test.ts`.

**Integration Tests:**
- Test interactions between controllers, guards, exception filters, and Prisma queries.
- Examples: `http-exception.filter.spec.ts`, `permissions.guard.spec.ts`, `directory.service.test.ts`.

**Adversarial & Governance Tests:**
- Specialized test suites verifying architectural invariants and anti-pattern elimination.
- `apps/web/src/AppFeedbackSafety.test.tsx`: Scans all frontend files for illegal static `message.*` imports.
- `apps/api/test/e2e/m1-websocket-gateway-adversarial.spec.ts`: Tests tamper-resistance, handshake token rejection via URL query parameters, and fail-closed disconnection.

**E2E Tests:**
- Multi-step end-to-end integration tests using Playwright and Docker containers validating network IPAM workflows, CSV import pipelines, and user authentication flows.

## Common Patterns

**Async Testing:**

```typescript
it('handles asynchronous token rotation seamlessly', async () => {
  const result = await authService.rotateRefreshToken('valid-refresh-token');
  expect(result).toHaveProperty('accessToken');
  expect(result).toHaveProperty('refreshToken');
});
```

**Error Testing:**

```typescript
it('fails closed when an unverified role is supplied', async () => {
  await expect(
    guard.canActivate(mockContextWithRole('InvalidRole')),
  ).rejects.toThrow(ForbiddenException);
});
```

---

*Testing analysis: 2026-10-12*

# Testing Patterns

**Analysis Date:** 2026-09-11

## Test Framework

**Runner:**
- Vitest ^5.0.0 — All workspaces
- API config: `apps/api/vitest.config.mts` — `environment: 'node'`, includes `src/**/*.{test,spec}.ts` and `test/**/*.{test,spec,e2e-spec}.ts`
- Web config: `apps/web/vitest.config.ts` — `environment: 'happy-dom'`, `testTimeout: 20000`, `hookTimeout: 20000`
- Both configs: `globals: true`, `passWithNoTests: true`

**Assertion Library:**
- Vitest built-in `expect` — `expect(result).toBeDefined()`, `expect(fn).toHaveBeenCalledWith(...)`

**Run Commands:**
```bash
pnpm test                    # Run all tests across monorepo (via Turborepo)
pnpm --filter @uims/api test # Run API tests only
pnpm --filter @uims/web test # Run Web tests only
vitest                       # Watch mode (per workspace)
vitest run --coverage        # Coverage report
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)

**Naming:**
- API: `*.spec.ts` — `auth.service.spec.ts`, `assets.controller.spec.ts`
- API adversarial: `*.adversarial.spec.ts` — `auth-isolation.adversarial.spec.ts`, `directory.adversarial.spec.ts`
- Web: `*.test.tsx` / `*.test.ts` — `DashboardPage.test.tsx`, `auth.store.test.ts`
- Web stress: `*.stress.test.tsx` — `milestone1-adversarial.stress.test.tsx`
- Packages: `*.test.ts` — `format.test.ts`, `network.test.ts`
- E2E: `test/e2e/*.e2e-spec.ts` (`apps/api/test/e2e/`)

**Structure:**
```
apps/api/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.guard.ts
├── auth.service.spec.ts              # Unit tests
├── auth.guard.spec.ts                # Unit tests
└── auth-isolation.adversarial.spec.ts # Adversarial tests
```

## Test Structure

**Suite Organization (API):**
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: {
    directoryUser: { findFirst: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrismaService = {
      directoryUser: { findFirst: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    };

    service = new AuthService(
      mockPrismaService as unknown as PrismaService,
      // ... other mocks
    );
  });

  it('should reject invalid credentials', async () => {
    mockPrismaService.directoryUser.findFirst.mockResolvedValue(null);
    await expect(service.login({ username: 'bad', password: 'bad' }))
      .rejects.toThrow(UnauthorizedException);
  });
});
```

**Patterns:**
- `beforeEach` resets all mocks and creates fresh service instances
- Manual constructor injection with typed mock objects (no NestJS test module for unit tests)
- `describe/it` blocks with clear, behavior-driven names
- `vi.fn()` for mock functions, `.mockResolvedValue()` for async
- `expect(...).rejects.toThrow()` for async error testing

## Mocking

**Framework:** Vitest built-in `vi` object

**Patterns (API — Manual Constructor Injection):**
```typescript
let mockJwtService: { sign: ReturnType<typeof vi.fn> };
let mockConfigService: { get: ReturnType<typeof vi.fn> };
let mockPrismaService: {
  directoryUser: { findFirst: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  refreshToken: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  mockJwtService = { sign: vi.fn(() => 'mock-jwt-token') };
  mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'test-secret-min-32-chars';
      return undefined;
    }),
  };

  service = new AuthService(
    mockUsersService as unknown as UsersService,
    mockJwtService as unknown as JwtService,
    mockConfigService as unknown as ConfigService,
    mockPrismaService as unknown as PrismaService,
  );
});
```

**What to Mock:**
- External services: `PrismaService`, `JwtService`, `ConfigService`, `RedisService`
- Inter-module services: `NotificationsService`, `UsersService`
- Mock only the methods actually called by the code under test

**What NOT to Mock:**
- Business logic within the service under test
- Shared utility functions (`@uims/shared-utils`)
- Zod validators (`@uims/shared-validators`)
- Pure function helpers within the same module

## Fixtures and Factories

**Test Data (API):**
```typescript
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  password: '$2b$12$hashedpassword...',
  role: { name: 'Admin', permissions: [{ permission: { code: 'asset:read' } }] },
};

const mockAsset = {
  id: 'asset-1',
  assetTag: 'AST-ABC123',
  name: 'Test Laptop',
  status: 'IN_USE',
  category: { id: 'cat-1', name: 'Laptop' },
};
```

**Location:**
- Inline within test files (no shared fixture files)
- Mock data defined in `beforeEach` or at `describe` scope
- Each test constructs its own minimal data set

## Coverage

**Requirements:** No enforced coverage threshold
**Configuration:** Coverage available via `vitest run --coverage`
**View Coverage:**
```bash
vitest run --coverage     # Generate coverage report
```

## Test Inventory

**Total test files:** ~103 across the monorepo

**API Tests (49 files):**
- Unit: `*.spec.ts` — Controllers, services, guards, filters, interceptors, Redis
- Adversarial: `*.adversarial.spec.ts` — Security edge cases, isolation tests
- E2E: `test/e2e/*.e2e-spec.ts` — Integration scenarios

**Web Tests (46 files):**
- Component: `*.test.tsx` — Page rendering, user interactions, form validation
- Hook: `*.test.ts` — Custom hook behavior
- Store: `*.test.ts` — Zustand store state transitions
- Service: `*.test.ts` — API client logic
- Adversarial: `*Adversarial*.test.tsx` — Navigation, access control edge cases
- Stress: `*.stress.test.tsx` — Performance and resilience under load

**Package Tests (9 files):**
- `packages/shared-utils/src/` — `enum.test.ts`, `format.test.ts`, `network.test.ts`, `timezone.test.ts`, `network.stress.test.ts`
- `packages/shared-validators/src/` — `common.validator.test.ts`, `network.validator.test.ts`, `notification.validator.test.ts`, `role.validator.test.ts`

## Test Types

**Unit Tests:**
- Scope: Individual service methods, controller handlers, guard logic
- Approach: Manual constructor injection with typed mocks
- Location: Co-located `*.spec.ts` / `*.test.ts` files

**Integration Tests:**
- Scope: Module-level interactions, Prisma query behavior
- Approach: Some tests use real Prisma queries with test database
- Location: `apps/api/test/e2e/`

**Adversarial Tests:**
- Scope: Security edge cases, input validation, authorization bypass attempts
- Approach: Test malicious inputs, boundary conditions, race conditions
- Location: `*.adversarial.spec.ts` (API), `*Adversarial*.test.tsx` (Web)

**Component Tests:**
- Scope: React component rendering, user interactions
- Environment: happy-dom
- Approach: Render components, simulate events, assert DOM state
- Location: `*.test.tsx` co-located with components

**E2E Tests:**
- Framework: Playwright ^1.63.0 (root devDependencies)
- Location: `apps/api/test/e2e/`

## Common Patterns

**Async Testing:**
```typescript
it('should create asset', async () => {
  mockPrismaService.asset.create.mockResolvedValue(mockAsset);
  const result = await service.create(createDto);
  expect(result).toBeDefined();
  expect(result.assetTag).toBe('AST-ABC123');
});
```

**Error Testing:**
```typescript
it('should throw NotFoundException for missing asset', async () => {
  mockPrismaService.asset.findUnique.mockResolvedValue(null);
  await expect(service.findOne('nonexistent'))
    .rejects.toThrow(NotFoundException);
});
```

**Mock Reset:**
```typescript
beforeEach(() => {
  // All mocks are reconstructed fresh in each beforeEach
  mockPrismaService = {
    asset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});
```

**Guard/Interceptor Testing:**
```typescript
describe('RolesGuard', () => {
  it('should allow access for matching role', () => {
    const context = createMockExecutionContext({ user: { role: 'Admin' } });
    Reflect.defineMetadata('roles', ['Admin'], context.getHandler());
    expect(guard.canActivate(context)).toBe(true);
  });
});
```

---

*Testing analysis: 2026-09-11*

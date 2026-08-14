# Testing Patterns

**Analysis Date:** 2026-08-14

## Test Framework

**Runner:**
- Vitest `^4.1.10`
- Config files:
  - `apps/api/vitest.config.mts` (Node environment, `globals: true`, includes `src/**/*.{test,spec}.ts`)
  - `apps/web/vitest.config.ts` (Happy-DOM environment, `globals: true`, Vite React plugin, `@/` alias)
  - `packages/shared-validators/package.json` (`vitest run`)
  - `packages/shared-utils/package.json` (`vitest run`)

**Assertion Library:**
- Vitest built-in assertion and mocking utilities (`describe`, `it`, `expect`, `beforeEach`, `vi`)

**Run Commands:**
```bash
pnpm test                                 # Run all tests across the monorepo via Turborepo
pnpm --filter @uims/api test              # Run API test suite
pnpm --filter @uims/web test              # Run Web frontend test suite
pnpm --filter @uims/shared-utils test     # Run shared-utils test suite
pnpm --filter @uims/shared-validators test# Run shared-validators test suite
pnpm --filter @uims/api test:watch        # Run API tests in watch mode
pnpm test:e2e                             # Run E2E test task via Turborepo
```

---

## Test File Organization

### Location
All unit tests are co-located directly with the implementation files in the same directory:
- Backend services, controllers, and filters: `apps/api/src/modules/<feature>/<name>.service.spec.ts`
- Frontend stores and services: `apps/web/src/stores/<name>.store.test.ts`, `apps/web/src/services/<name>.test.ts`
- Shared packages: `packages/<package>/src/<name>.test.ts`

### Naming
- Backend API tests: `*.spec.ts` (e.g., `assets.service.spec.ts`, `http-exception.filter.spec.ts`)
- Frontend Web tests: `*.test.ts` or `*.test.tsx` (e.g., `auth.store.test.ts`, `api.test.ts`)
- Shared package tests: `*.test.ts` (e.g., `enum.test.ts`, `format.test.ts`, `common.validator.test.ts`)

### Structure
```
apps/api/src/
├── common/
│   └── filters/
│       ├── http-exception.filter.ts
│       └── http-exception.filter.spec.ts
└── modules/
    ├── assets/
    │   ├── assets.service.ts
    │   └── assets.service.spec.ts
    ├── auth/
    │   ├── auth.service.ts
    │   └── auth.service.spec.ts
    ├── directory/
    │   ├── directory.service.ts
    │   └── directory.service.spec.ts
    ├── health/
    │   ├── health.controller.ts
    │   └── health.controller.spec.ts
    ├── inventory/
    │   ├── inventory.service.ts
    │   └── inventory.service.spec.ts
    ├── licenses/
    │   ├── licenses.service.ts
    │   └── licenses.service.spec.ts
    ├── network/
    │   ├── network.service.ts
    │   └── network.service.spec.ts
    ├── search/
    │   ├── search.service.ts
    │   └── search.service.spec.ts
    └── tickets/
        ├── tickets.service.ts
        └── tickets.service.spec.ts

apps/web/src/
├── services/
│   ├── api.ts
│   └── api.test.ts
└── stores/
    ├── auth.store.ts
    ├── auth.store.test.ts
    ├── theme.store.ts
    └── theme.store.test.ts

packages/
├── shared-utils/src/
│   ├── enum.ts
│   ├── enum.test.ts
│   ├── format.ts
│   └── format.test.ts
└── shared-validators/src/
    ├── common.validator.ts
    └── common.validator.test.ts
```

---

## Test Structure

### Suite Organization
Organize tests using nested `describe` blocks where outer blocks name the class/module under test, and inner blocks match method or feature names:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetsService } from './assets.service';
import { AssetStatus } from '@uims/shared-types';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      asset: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      assetCategory: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      location: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new AssetsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create an asset with atomic category and location lookup within transaction', async () => {
      // 1. Arrange
      mockPrisma.assetCategory.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', name: 'HQ Storage' });
      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-1',
        assetTag: 'AST-1001',
        name: 'MacBook Pro 16',
        status: AssetStatus.IN_USE,
        purchaseCost: 3499,
        category: { name: 'Laptops' },
        location: { name: 'HQ Storage' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
      });

      // 2. Act
      const result = await service.create({
        name: 'MacBook Pro 16',
        category: 'Laptops',
        location: 'HQ Storage',
        status: 'Active',
        purchasePrice: 3499,
      });

      // 3. Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('ast-1');
      expect(result.status).toBe('Active');
      expect(result.assignedTo).toBe('Alex Johnson');
      expect(result.purchasePrice).toBe(3499);
    });
  });
});
```

### Setup Pattern
- Initialize mock repositories/services in a `beforeEach` hook to ensure clean state per test case.
- In Zustand tests (`apps/web/src/stores/auth.store.test.ts`), reset state in `beforeEach` using `useAuthStore.setState({ user: null, token: null })`.

### Teardown Pattern
- Rely on fresh instances constructed in `beforeEach` rather than global teardowns.
- Reset mock call counters and mocked return values per test suite.

### Assertion Pattern
- Verify exact scalar matches using `.toBe(...)`.
- Verify complex nested data with `.toEqual(...)`.
- Verify partial object shapes using `expect.objectContaining(...)`.
- Verify array size using `.toHaveLength(...)`.

---

## Mocking

### Framework
Use Vitest's `vi` namespace for all mocking utilities.

### Mocking Patterns

#### 1. Prisma Client & Transactions Mocking
Mock Prisma models as plain JavaScript objects containing `vi.fn()` methods. Pass a simulated `$transaction` implementation that invokes the callback directly with the mock client:
```ts
mockPrisma = {
  $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
  asset: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};
```

#### 2. Service & Module Dependencies Mocking
Create typed mock objects matching dependent service signatures:
```ts
let mockUsersService: { findByEmail: ReturnType<typeof vi.fn> };
let mockJwtService: { sign: ReturnType<typeof vi.fn> };

beforeEach(() => {
  mockUsersService = { findByEmail: vi.fn() };
  mockJwtService = { sign: vi.fn(() => 'mock-jwt-token') };

  service = new AuthService(
    mockUsersService as unknown as UsersService,
    mockJwtService as unknown as JwtService,
  );
});
```

#### 3. Axios Adapter Mocking in Frontend
Use custom Axios adapters to test request interceptors and token injection without network traffic:
```ts
it('should attach Bearer token to request headers when user is authenticated', async () => {
  useAuthStore.setState({
    token: 'jwt-mock-token-abc',
    user: { id: '1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
  });

  const mockAdapter = vi.fn().mockResolvedValue({
    data: { success: true },
    status: 200,
    headers: {},
    config: {},
  });

  const response = await api.get('/health', { adapter: mockAdapter });
  expect(response.status).toBe(200);
  expect(mockAdapter).toHaveBeenCalledWith(
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer jwt-mock-token-abc',
      }),
    }),
  );
});
```

---

## Fixtures and Factories

### Test Data
- Define literal test objects inline within test cases or setup blocks, ensuring compliance with `@uims/shared-types` interfaces.
- For hashed passwords in authentication tests, use `await bcrypt.hash('secret123', 10)`.

### Location
- Entity and DTO types imported from `@uims/shared-types`.
- Fixture data is scoped locally to each test file.

---

## Coverage

**Requirements:**
- Monorepo coverage outputs configured in `turbo.json` under `"outputs": ["coverage/**"]`.
- All module services, guards, exception filters, utility helpers, and state stores must maintain dedicated unit test suites.
- Total test suites in codebase: 16 active test suites passing across all packages.

---

## Test Types

### Unit Tests
- **Backend Services:** Test business logic, DTO mapping, pagination offsets, and relational lookups (e.g. `assets.service.spec.ts`, `licenses.service.spec.ts`).
- **Controllers & Filters:** Test HTTP status code formatting and payload shape (e.g. `health.controller.spec.ts`, `http-exception.filter.spec.ts`).
- **Shared Utilities & Enums:** Test formatters, sanitizers, and bidirectional enum mappers (e.g. `format.test.ts`, `enum.test.ts`).
- **Shared Validators:** Test Zod schema validation rules and error rejection (e.g. `common.validator.test.ts`).
- **Frontend Stores:** Test Zustand state transitions, actions, and persistence hooks (e.g. `auth.store.test.ts`, `theme.store.test.ts`).

### Integration Tests
- Test transactional boundaries in service methods with multiple relational operations (`$transaction`).
- Test Axios request/response interceptors with custom adapters (`api.test.ts`).

### E2E Tests
- **Framework:** `@playwright/test` and `playwright` (`^1.50.0`) configured in root `package.json` devDependencies and registered as `test:e2e` in `turbo.json`.

---

## Common Patterns

### Async Testing
- Always mark test functions as `async` when awaiting asynchronous services or stores.
- Use `await expect(promise).rejects.toThrow(...)` for testing error paths:
  ```ts
  it('should throw UnauthorizedException on invalid password', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      passwordHash: await bcrypt.hash('secret123', 10),
    });

    await expect(
      service.login({
        email: 'admin@uims.internal',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
  ```

### Error Testing
- Validate that exception filters produce standard error envelopes with matching HTTP status codes:
  ```ts
  it('should format http exception correctly', () => {
    const filter = new HttpExceptionFilter();
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const getResponseMock = vi.fn().mockReturnValue({
      status: statusMock,
      json: jsonMock,
    });

    const hostMock = {
      switchToHttp: () => ({ getResponse: getResponseMock }),
    } as unknown as import('@nestjs/common').ArgumentsHost;

    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        message: 'Forbidden',
      }),
    );
  });
  ```

---
*Testing analysis: 2026-08-14*

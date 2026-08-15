# Testing Patterns

**Analysis Date:** 2026-08-15

## Test Framework

**Runner:**
- Vitest v4.1.10
- Backend Config: `apps/api/vitest.config.mts` (`environment: 'node'`, `include: ['src/**/*.{test,spec}.ts']`)
- Frontend Config: `apps/web/vitest.config.ts` (`environment: 'happy-dom'`, React plugin, `@` alias resolution)
- Packages Config: Vitest running against `packages/shared-utils/src/*.test.ts` and `packages/shared-validators/src/*.test.ts`
- E2E / Browser Automation: Playwright (`@playwright/test` v1.50.0)

**Assertion Library:**
- Vitest built-in assertions (`expect`, `toBe`, `toEqual`, `toHaveBeenCalledWith`, `toThrow`, `rejects`, etc.)

**Run Commands:**
```bash
pnpm test                               # Run all workspace unit tests via Turborepo
pnpm --filter @uims/api test            # Run API unit test suite
pnpm --filter @uims/web test            # Run Web frontend test suite
pnpm --filter @uims/api test:watch      # Run API tests in interactive watch mode
pnpm --filter @uims/shared-utils test   # Run shared utility tests
pnpm --filter @uims/shared-validators test # Run shared validator tests
pnpm test:e2e                           # Run full Playwright browser E2E test suite
node scripts/test-responsive.mjs        # Run responsive viewport breakpoint E2E tests
```

---

## Test File Organization

**Location:**
- **Backend (`apps/api`):** Co-located next to implementation files in `apps/api/src/modules/<feature>/` and `apps/api/src/common/<concern>/`.
- **Frontend (`apps/web`):** Co-located next to hooks, services, layouts, and stores in `apps/web/src/`.
- **Shared Packages (`packages/*`):** Co-located alongside implementations in package `src/` directories.

**Naming:**
- Backend API tests: `<filename>.spec.ts` (e.g., `assets.service.spec.ts`, `assets.controller.spec.ts`, `roles.guard.spec.ts`, `prisma-exception.filter.spec.ts`)
- Frontend Web tests: `<filename>.test.ts` or `<filename>.test.tsx` (e.g., `useSystemHealth.test.ts`, `services.test.ts`, `auth.store.test.ts`, `menuConfig.test.ts`)
- Packages tests: `<filename>.test.ts` (e.g., `enum.test.ts`, `format.test.ts`, `common.validator.test.ts`)

---

## Test Structure

### Suite Organization

Tests are structured using nested `describe` blocks organized by class and method name, with clean dependency instantiation in `beforeEach`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetsController } from './assets.controller';
import type { AssetsService } from './assets.service';
import type { CreateAssetDto } from './dto/create-asset.dto';
import type { UpdateAssetDto } from './dto/update-asset.dto';

describe('AssetsController', () => {
  let controller: AssetsController;
  let mockAssetsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockAssetsService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    controller = new AssetsController(mockAssetsService as unknown as AssetsService);
  });

  describe('findAll', () => {
    it('should call findAll with query filters', async () => {
      const mockAssets = [{ id: 'a1', tag: 'AST-1001', name: 'MacBook Pro' }];
      mockAssetsService.findAll.mockResolvedValue(mockAssets);

      const result = await controller.findAll({ search: 'MacBook', status: 'ACTIVE' });

      expect(mockAssetsService.findAll).toHaveBeenCalledWith({
        search: 'MacBook',
        status: 'ACTIVE',
      });
      expect(result).toBe(mockAssets);
    });
  });

  describe('create', () => {
    it('should call create with CreateAssetDto', async () => {
      const dto: CreateAssetDto = {
        name: 'Dell XPS 15',
        serialNumber: 'SN99281',
        category: 'Laptop',
        status: 'Active',
        purchasePrice: 2000,
      };
      const created = { id: 'a2', ...dto };
      mockAssetsService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(mockAssetsService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });
});
```

---

## Mocking

**Framework:** Vitest (`vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.mocked()`, `vi.clearAllMocks()`)

### 1. Mocking Prisma ORM and Transactions in Service Tests

Prisma methods and transactional clients (`$transaction`) are mocked cleanly with chained `mockResolvedValue`:

```typescript
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

  it('should create an asset with atomic category and location lookup within transaction', async () => {
    mockPrisma.assetCategory.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
    mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', name: 'HQ Storage' });
    mockPrisma.asset.create.mockResolvedValue({
      id: 'ast-1',
      assetTag: 'AST-1001',
      name: 'MacBook Pro 16',
      status: AssetStatus.IN_USE,
      category: { name: 'Laptops' },
      location: { name: 'HQ Storage' },
      assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
      specs: { cpu: 'M3 Max', ram: '64GB' },
    });

    const result = await service.create({
      name: 'MacBook Pro 16',
      category: 'Laptops',
      location: 'HQ Storage',
      status: 'Active',
      purchasePrice: 3499,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(result.id).toBe('ast-1');
    expect(result.status).toBe('Active');
    expect(result.assignedTo).toBe('Alex Johnson');
  });
});
```

### 2. Mocking HTTP Clients in Frontend Services

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { assetsService } from './assets.service';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('assetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query assets with search parameters', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [{ id: 'a1', name: 'Laptop' }] },
    });

    const res = await assetsService.getAssets({ search: 'Laptop' });

    expect(api.get).toHaveBeenCalledWith('/assets', {
      params: { search: 'Laptop' },
    });
    expect(res).toHaveLength(1);
  });
});
```

### 3. Mocking NestJS Contexts in Guards, Filters, and Interceptors

```typescript
const mockResponse = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
};
const mockRequest = {
  url: '/api/v1/assets',
  method: 'POST',
  user: { id: 'usr-1', role: 'ADMIN' },
};

const mockHost = {
  switchToHttp: () => ({
    getResponse: () => mockResponse,
    getRequest: () => mockRequest,
  }),
} as unknown as ArgumentsHost;
```

---

## Fixtures and Factories

### Test Data Fixtures

Test fixtures are created as strongly-typed mock objects replicating database payloads with relationships:

```typescript
// Sample complete asset mock fixture
const mockAssetRecord = {
  id: 'ast-1001',
  assetTag: 'AST-1001',
  name: 'MacBook Pro 16',
  manufacturer: 'Apple',
  model: 'M3 Max',
  serialNumber: 'C02XYZ123',
  status: AssetStatus.IN_USE,
  purchaseDate: new Date('2026-01-15'),
  purchaseCost: 3499,
  warrantyExpiry: new Date('2029-01-15'),
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Laptops' },
  locationId: 'loc-1',
  location: { id: 'loc-1', name: 'HQ Storage' },
  assignedToId: 'usr-1',
  assignedTo: {
    id: 'usr-1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex@company.com',
  },
  specs: { cpu: 'M3 Max', ram: '64GB', storage: '1TB NVMe', os: 'macOS Sequoia' },
  notes: 'Lead engineer workstation',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
};
```

---

## Coverage

**Requirements:**
- Output directory: `coverage/**` (cached via `turbo.json`).
- Current Status: 100% passing across 34 test files (121 total unit tests).
  - `@uims/api`: 24 test suites, 81 tests passing.
  - `@uims/web`: 7 test suites, 30 tests passing.
  - `@uims/shared-utils`: 2 test suites, 8 tests passing.
  - `@uims/shared-validators`: 1 test suite, 2 tests passing.

---

## Test Types

### Unit Tests

- **API Controllers:** Verify route parameter parsing, query filtering, DTO forwarding, and HTTP status handling with mocked services.
- **API Services:** Verify core business logic, database transactions, Prisma queries, data transformation pipelines, role defaulting, and exception triggers (`NotFoundException`, `UnauthorizedException`).
- **Guards & Interceptors:** Verify JWT validation, role authorization, mutating request audit logging, and sensitive payload redaction.
- **Exception Filters:** Verify HTTP and Prisma error handling and standardized JSON response structure.
- **Zustand Stores:** Verify state transitions, persistence configuration, login/logout workflows, and theme setting actions.
- **Custom React Hooks:** Verify state synchronization, lifecycle events, and DOM updates using `happy-dom` and `react-dom/client` `act()`.
- **Shared Utils & Validators:** Verify string manipulation, currency/date/byte formatting, enum bidirectional normalization, and Zod schemas.

### Integration Tests

- **Service Clients (`apps/web/src/services/services.test.ts`):** Verify end-to-end API client contract handling for all 11 frontend service clients (`assets`, `tickets`, `licenses`, `network`, `inventory`, `directory`, `dashboard`, `audit`, `health`, `reports`, `settings`).
- **Health Telemetry (`apps/api/src/modules/health/health.controller.spec.ts`):** Verify live telemetry collection, database heartbeat, uptime calculation, and memory metrics.

### E2E Tests

- **Framework:** Playwright (`@playwright/test` v1.50.0) with Chromium headless execution.
- **Comprehensive Functional Flow (`scripts/test-login.mjs`):**
  - Authenticates via Super Admin credentials on `https://localhost:5679/login`.
  - Verifies dashboard metrics and renders all 13 core views:
    1. `/login` (Authentication)
    2. `/` (Dashboard Overview)
    3. `/assets` (Hardware Fleet Management)
    4. `/licenses` (Software License Governance)
    5. `/inventory` (IT Consumables Stock)
    6. `/directory` (Active Directory & Users)
    7. `/email` (Corporate Mailboxes)
    8. `/network` (Network IPAM & Topology)
    9. `/tickets` (Helpdesk Incident Queue)
    10. `/audit` (Security Audit Trail)
    11. `/reports` (Executive Intelligence)
    12. `/settings` (System Settings & Governance)
- **Responsive Viewport Breakpoints (`scripts/test-responsive.mjs`):**
  - **Mobile (390x844):** Verifies mobile login, header hamburger button, navigation Drawer slide-out, and horizontal table scrolling.
  - **Tablet (768x1024):** Verifies adaptive grid layout and responsive KPI card wrapping.
  - **Desktop (1440x900):** Verifies collapsible sidebar toggle (expanded 280px / collapsed 80px) and full-screen data tables.

---

*Testing analysis: 2026-08-15*

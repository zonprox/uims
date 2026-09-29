# Testing Patterns

**Analysis Date:** 2026-09-28

## Test Framework
**Runner:**
- Vitest v5.0.0
- Config: `apps/web/vitest.config.ts`, `vitest.config.ts` (in packages/node-modules)
**Assertion Library:**
- `expect` from `vitest`
**Run Commands:**
```bash
pnpm run test              # Run all tests via turbo
pnpm run test:watch        # Watch mode (via underlying vitest)
pnpm run test:e2e          # E2E tests via turbo
pnpm run test:e2e:network  # Specific E2E script
```

## Test File Organization
**Location:**
- Co-located with implementation for unit tests (e.g., `apps/api/src/modules/health/health.controller.spec.ts` next to `health.controller.ts`).
- Dedicated `test/e2e/` folder for E2E and integration tests in the backend.
**Naming:**
- Backend: `*.spec.ts`, `*.e2e-spec.ts`, `*.adversarial.spec.ts`
- Frontend: `*.test.tsx`, `*.test.ts`, `*.stress.test.tsx`
**Structure:**
```
apps/api/src/
  modules/
    health/
      health.controller.ts
      health.controller.spec.ts
apps/api/test/
  e2e/
    spatial-locations.e2e-spec.ts
```

## Test Structure
**Suite Organization:**
```typescript
describe('AssetsService', () => {
  let service: AssetsService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    // Setup
  });

  it('should return health status ok', async () => {
    // Assert
  });
});
```
**Patterns:**
- **Setup:** Uses `beforeEach` to initialize services, mock dependencies, and reset DOM/React states.
- **Teardown:** Uses `afterEach` to unmount components, clean up DOM (`container.remove()`), and call `vi.restoreAllMocks()`.
- **Assertion:** Arranges state, performs action, and asserts outcomes using Vitest's `expect`.

## Mocking
**Framework:** `vi` from `vitest`
**Patterns:**
```typescript
const mockRedis = {
  ping: vi.fn().mockResolvedValue('PONG'),
} as unknown as RedisService;

vi.mock('../../hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({
    health: { status: 'ok', uptimePercent: '100%', clientLatencyMs: 12 },
  }),
}));
```
**What to Mock:**
- External services, databases (`PrismaService`), network requests, and external React hooks/stores.
**What NOT to Mock:**
- Pure utility functions, internal logic of the component under test.

## Fixtures and Factories
**Test Data:**
```typescript
interface DbLocation {
  id: string;
  name: string;
  type: LocationType;
  // ...
}
```
**Location:**
- Often defined in-file for E2E tests (e.g., `DbLocation`, `DbAsset` inside `apps/api/test/e2e/spatial-locations.e2e-spec.ts`) or setup blocks.

## Coverage
**Requirements:** None enforced explicitly in primary vitest config, but supported via vitest coverage.
**View Coverage:**
```bash
vitest run --coverage
```

## Test Types
**Unit Tests:**
- Backend: Mocks Prisma and external dependencies to test service/controller logic in isolation.
- Frontend: Uses `react-dom/client` and `act` (or `happy-dom` env) to render components and verify UI state.
**Integration Tests:**
- Connects modules without mocking DB interactions (e.g., in-memory relational fixture DB tests in E2E specs).
**E2E Tests:**
- Custom scripts (e.g., `node scripts/run-e2e-network.mjs`) running vitest suites (`network-modernization.e2e-spec.ts`) that test end-to-end flows.

## Common Patterns
**Async Testing:**
```typescript
it('should throw ServiceUnavailableException', async () => {
  await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
});
```
**Error Testing:**
```typescript
const mockPrisma = {
  $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
} as unknown as PrismaService;
```

---
*Testing analysis: 2026-09-28*

# UIMS Testing Infrastructure & Coverage

## 1. Exact Vitest Configuration & Setup
- **Vitest Version**: `^5.0.0` is uniformly installed across the monorepo workspaces, specifically visible within both `apps/api/package.json` and `apps/web/package.json`.
- **Config Strategy - Backend (`apps/api/vitest.config.mts`)**:
  - Defines the environment strictly as `'node'` to prevent browser polyfills and DOM APIs from leaking into the NestJS server runtime.
  - Paths are mapped explicitly via `resolve.alias` (e.g., mapping `@uims/shared-validators` to the exact workspace root folder `packages/shared-validators/src`).
- **Config Strategy - Frontend (`apps/web/vitest.config.ts`)**:
  - Utilizes `@vitejs/plugin-react` to parse JSX and React semantics correctly.
  - Employs the lightweight `'happy-dom'` environment instead of the heavier `jsdom`, optimizing for performance while still maintaining high fidelity DOM emulation.
- **Thresholds & Tolerances**:
  - `passWithNoTests: true` is universally set. While excellent for preventing CI workflow failures when committing unscaffolded packages, it demands strict manual PR reviews to prevent regressions.
  - Test timeouts are generously extended (`20000ms` for API suites, `30000ms` for Web suites) to easily accommodate backend database mock constructions and initial frontend React tree renders without triggering false-positive timeout failures.

## 2. Coverage Configuration (Current State & Recommendations)
- **Current State**: The coverage configurations (e.g. `coverage: { reporter: ['text'] }`) are completely absent from the local `vitest.config.ts` files across both the Web and API workspaces. Coverage generation currently relies on external pipeline CLI arguments (`vitest run --coverage`).
- **2026 Best Practice Recommendation**:
  Coverage should be explicitly codified within the configuration files to enforce local developer accountability. Below is the recommended implementation format for a robust 2026 application:
  ```typescript
  // Proposed addition to vitest.config.ts / mts:
  export default defineConfig({
    test: {
      coverage: {
        provider: 'v8', // V8 coverage engine is natively faster in Node 20+
        reporter: ['text', 'json-summary', 'html', 'lcov'], // Output types
        exclude: ['src/main.ts', '**/*.dto.ts', '**/*.module.ts'], // Exclude bootstrap and DTO files
        thresholds: {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        }
      }
    }
  });
  ```
  Enforcing these thresholds natively causes the local `vitest` process to fail locally if coverage drops below the limit, preventing pipeline surprises.

## 3. Backend Test Patterns (NestJS)
- **Service Instantiation - Direct vs TestingModule**:
  Unlike standard NestJS testing paradigms which utilize `Test.createTestingModule(...)` to build an IoC container, the repository frequently opts for raw class instantiation:
  ```typescript
  const service = new NotificationsService(mockPrisma, mockGateway);
  ```
  This creates hyper-fast execution speeds by bypassing the Nest container entirely, but sacrifices full integration guarantees that dependency wiring is correct in the actual `Module`.
- **Mocking the Prisma Client**:
  The `PrismaService` is mocked natively via Vitest's `vi.fn()` spies rather than relying on external libraries like `jest-mock-extended`.
  - *Transaction Callbacks*: The `$transaction` wrapper is explicitly stubbed to immediately execute its provided callback payload, simulating a successful transaction without hitting the DB.
  ```typescript
  mockPrisma = {
    notification: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((cb) => (typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb))),
  };
  ```
- **Gateway & WebSocket Interception**:
  Real-time emissions are verified by stubbing `mockGateway`. Instead of spinning up an actual Socket.io server, tests assert that `sendToUser` was called with the correct channel and payload format.

## 4. Frontend Test Patterns (React)
- **Act Wrappers & Asynchrony**:
  Standard test setups enforce the `IS_REACT_ACT_ENVIRONMENT` flag globally to ensure deterministic React queue flushes, avoiding the dreaded "update was not wrapped in act()" warning.
  ```typescript
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => currentRoot?.unmount());
    }
  });
  ```
- **Mocking Custom Hooks**:
  Instead of using `msw` to intercept raw HTTP `fetch` requests, the frontend testing suite actively mocks out entire Custom Hooks using `vi.mock`.
  - *Example Setup*: Mocking `useSystemHealth` to prevent infinite asynchronous polling loops that would otherwise stall test runners:
  ```typescript
  vi.mock('../../hooks/useSystemHealth', () => ({
    useSystemHealth: () => ({
      health: { status: 'ok', uptimePercent: '100%', clientLatencyMs: 12 },
      isLoading: false,
      isOnline: true,
      error: null,
      refresh: vi.fn(),
    }),
  }));
  ```
- **Context & Config Providers**:
  Tests accurately wrap UI components inside Ant Design's `<ConfigProvider>` to ensure that `theme.useToken()` extraction succeeds within the component tree, mimicking real-world mounting conditions.

## 5. Test Utility Patterns & Mock Factories
- **Decentralized Mock Definition**: 
  The codebase intentionally avoids maintaining large centralized mock factories (e.g., `src/tests/factories/UserFactory.ts`). Instead, mock objects are explicitly and verbosely built inside individual `beforeEach` closures. While this improves readability of a single file, it violates DRY principles over time.
- **Adversarial Testing Suite**: 
  The repository introduces an exceptionally mature paradigm: dividing happy-path behavior from malicious edge cases into entirely separate test files.
  - *Example*: Files suffixed with `.adversarial.spec.ts` specifically inject corrupted payloads, simulate rapid race conditions, and test deep boundary limits to ensure the application safely panics without crashing.

## 6. Comprehensive Sample Test Analysis

### A. Backend: `notifications.service.spec.ts`
**Objective**: Validates the core logic surrounding notification creation and database insertion.
1. **Setup Phase**: Initializes `mockPrisma` dictionaries and nested `vi.fn()` instances.
2. **Execution Phase**: Instantiates `NotificationsService` without NestJS IoC dependency injection, pushing the raw mocks into the constructor.
3. **Assertions**: Heavily relies on tracking `toHaveBeenCalledWith` payload structures.
```typescript
it('should create a notification and broadcast it', async () => {
  const result = await service.create(mockDto);
  expect(mockPrisma.notification.create).toHaveBeenCalledWith({ data: mockDto });
  expect(mockGateway.sendToUser).toHaveBeenCalledWith(mockDto.userId, 'new-notification', ...);
});
```

### B. Frontend: `SidebarTheme.test.tsx`
**Objective**: Validates UI element layout shifts and class changes during light/dark theme toggles.
1. **Context Initialization**: Fully mocks out external polling mechanisms (`useSystemHealth`) globally at the top of the file.
2. **Manual Mounting**: Bypasses `@testing-library/react` and relies directly on raw DOM traversal.
```typescript
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
```
3. **State Mutation & Validation**: Directly updates the Zustand store (`useThemeStore.getState().setMode('dark')`), subsequently waiting for the component to rerender via an `act()` wrapper before asserting that the actual `HTMLElement` possesses the newly calculated `antd-css-hash` dark mode class.

## 7. E2E Adversarial Testing Strategy
The presence of explicit adversarial testing files (`apps/api/src/modules/notifications/e2e-adversarial.spec.ts`, `apps/web/src/layouts/Milestone1Adversarial.test.tsx`) is a unique characteristic of this repository.
- **Backend Approach**:
  The backend adversarial E2E files utilize SuperTest over a fully instantiated NestJS application runtime connected to an isolated test database. They deliberately simulate high-velocity traffic (stress testing) and malformed body injections to trigger `ValidationPipe` rejections.
- **Frontend Approach**:
  Frontend adversarial tests evaluate component resistance to prop mutations mid-render, unexpected context drops, and malicious inputs designed to bypass standard validation rules. 

## 8. Test Data Seeding Strategy
- The current test suites rely on manual object construction. For large integration tests, developers map Prisma relations manually within the `vi.mock` returns. 
- **Recommendation**: Integrate `@faker-js/faker` combined with a deterministic seed to generate realistic dummy data efficiently across test suites without hardcoding strings.
- **Database Teardown**: E2E tests should utilize Prisma's `$executeRawUnsafe` to truncate tables between test suites to prevent primary key collision issues, guaranteeing clean isolation.

## 9. Accessibility (A11y) Testing
- The frontend tests currently lack automated accessibility assertions.
- **Recommendation**: Integrate `jest-axe` alongside `@testing-library/react`. This would enforce that all Ant Design components maintain WCAG compliance out-of-the-box when custom props are applied. This is a critical gap for enterprise-grade 2026 applications.
```tsx
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<NotificationDrawer />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 10. Snapshot Testing & Visual Regression
- UI component tests currently do not utilize snapshot testing to freeze the DOM structure. While this prevents brittle tests, it lacks safety against unintended CSS/JSX class omissions.
- **Recommendation**: Limit snapshot testing explicitly to dumb UI presentation components, and rely heavily on Playwright for end-to-end visual regression testing of the Dashboard overviews.

## 11. CI/CD Pipeline Context & Missing Areas
While the application architecture boasts extremely high unit testing fidelity, the following pipeline extensions are highly recommended for the next operational cycle:
1. **Migrate to `@testing-library/react`**: Mounting via manual `document.createElement` and wrapping every tick in `act()` is an outdated practice that scales poorly. Moving to React Testing Library is highly recommended for 2026.
2. **Implement MSW (Mock Service Worker)**: Currently, custom hooks are mocked out entirely. This tests the component's implementation, but completely leaves the actual hook logic untested. Migrating to MSW will intercept the actual network requests, allowing both the UI and the hook to be tested natively.
3. **Dedicated Playwright Suite**: E2E testing locally is heavily NestJS-centric. A dedicated E2E folder containing actual Playwright locators traversing the DOM (e.g. `page.getByRole('button')`) is strongly recommended to finalize the QA safety net and run natively in GitHub Actions.
4. **Mock Builders / Factories**: Transitioning away from decentralized `beforeEach` stubs to a centralized entity-builder library (`mockPrisma.user.createMock()`) will vastly improve code consistency across the 62+ NestJS spec files.

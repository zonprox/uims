# Testing Patterns

**Analysis Date:** 2026-09-09

## 1. Test Framework
The UIMS monorepo uses **Vitest** for all testing across apps and packages.
- **Run Commands (from `package.json`):**
  - `pnpm test` (executes `vitest run`)
  - `pnpm test:watch` (executes `vitest`)
- **Environments:**
  - API: `environment: 'node'` (`apps/api/vitest.config.mts`)
  - Web: `environment: 'happy-dom'` (`apps/web/vitest.config.ts`)
- **Globals:** `globals: true` is enabled, though explicit imports from `vitest` (e.g., `describe`, `it`, `expect`, `vi`) are strongly preferred.

## 2. Test Structure
Tests strictly follow the **Arrange-Act-Assert (AAA)** pattern.
- *Example Structure (`DashboardPage.test.tsx`):*
  ```typescript
  describe('DashboardPage', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      vi.clearAllMocks();
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('renders telemetry data correctly', async () => {
      // Arrange
      const root = createRoot(container);
      
      // Act
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // Assert
      expect(container.textContent).toContain('Hardware Fleet');
      
      // Cleanup
      act(() => {
        root.unmount();
      });
    });
  });
  ```

## 3. Fixtures and Factories
- **Data Fixtures:** Standardized mock objects are instantiated at the top of the test file to ensure consistent state across tests.
- **Service Mocks (Frontend):** Subsystem services are mocked entirely using `vi.mock()`.
  - *Example:*
    ```typescript
    const mockDashboardData: DashboardOverview = { /* ... */ };
    vi.mock('../../services/dashboard.service', () => ({
      dashboardService: {
        getOverview: vi.fn().mockImplementation(() => Promise.resolve(mockDashboardData)),
      },
    }));
    ```
- **Store Mocks (Zustand):** Instead of mocking the module, store state is seeded directly using `.setState()` or the hook itself is mocked to return specific static slices.

## 4. Coverage
- Code coverage is generated via Vitest plugins (usually integrating `v8` or `istanbul`).
- Tests aggressively aim for boundary scenarios (`.boundary.spec.ts`), adversarial inputs (`.adversarial.spec.ts`), and logical edge cases.

## 5. Test Types
- **Unit Tests:** Fine-grained tests for utility functions, hooks, and single components.
- **Integration Tests:** API Controller/Service interaction tests, verifying logic flows without hitting the actual live database (using service mocks).
- **E2E / Functional Tests:** Validates complete frontend rendering cycles against mock API responses, leveraging `happy-dom` to simulate user interactions.

## 6. Common Patterns
- **Async Component Rendering:** All component mounting/unmounting in React 19 must be wrapped in `act()`.
- **Error State Testing:** Testing component fallback renders when an API throws.
  - *Example:*
    ```typescript
    vi.mocked(dashboardService.getOverview).mockRejectedValueOnce(new Error('Network error'));
    await act(async () => { root.render(<DashboardPage />); });
    expect(container.textContent).toContain('Telemetry Data Unavailable');
    ```

## 7. Frontend Test Patterns
- **DOM Container Setup:** Standard setup involves dynamically creating and appending a `div` element to `document.body` in `beforeEach`, and cleaning it up in `afterEach` via `container.remove()`.
- **Ant Design App Context:** Components relying on `App.useApp()` require mocking the global instance to prevent context errors during testing:
  ```typescript
  vi.mock('antd', async () => {
    const actual = await vi.importActual('antd');
    return { ...actual, App: { useApp: () => mockAppInstance } };
  });
  ```

## 8. NestJS Testing Patterns
- **Controller Testing:** Tests often instantiate controllers manually rather than using `Test.createTestingModule` when dependency graphs are shallow, injecting mocked services directly.
  - *Example (`users.controller.spec.ts`):*
    ```typescript
    const mockService = { getStats: vi.fn(), findAll: vi.fn() };
    beforeEach(() => {
      service = mockService as unknown as UsersService;
      controller = new UsersController(service);
      vi.clearAllMocks();
    });
    ```
- **Type Assertion for Mocks:** By double-casting (`as unknown as TargetType`), the strict zero `any` policy is maintained while safely injecting partial mock objects.

## 9. Database Testing
- **Prisma Mocks:** Instead of actual database connections in unit specs, Prisma client delegates (e.g., `this.prisma.appUser.findMany`) are typically bypassed by mocking the service layer, or by using `vitest-mock-extended` for deeper repository testing if required.

*Testing analysis: 2026-09-09*

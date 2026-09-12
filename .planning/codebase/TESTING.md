# Testing Strategy & Infrastructure
> Last Updated: 2026-09-12

## Test Framework
- **Vitest configuration**: Vitest is used across workspaces. `apps/web/vitest.config.ts` configures `@vitejs/plugin-react` and path aliases (`@uims/*`).
- **Environment**: Backend tests run in a Node environment. Web tests use `happy-dom`.
- **Test file naming conventions**: Backend uses `*.spec.ts`. Frontend uses `*.test.ts` for utilities/hooks and `*.test.tsx` for components.

## Backend Testing
### Unit Tests
- **Service test patterns**: Test suites instantiate services with mocked Prisma and Redis dependencies. Dependencies are mocked via `vi.fn()`.
- **Controller test patterns**: Controllers are tested by mocking the underlying service methods.
- **Mock strategies (Prisma, Redis)**:
  - Prisma is mocked by creating a deep object with `vi.fn()` for each model operation (e.g., `findMany: vi.fn().mockResolvedValue([])`), then cast via `as unknown as PrismaService`.
  - Service spies ensure sensitive data is not leaked (e.g., asserting `passwordHash` is undefined in the return payload).

### Integration Tests
- **Database integration patterns**: Separate testing database environments are used. (Need to configure `docker-compose.test.yml` for Prisma test runs).
- **API endpoint testing**: Done via `@nestjs/testing` and `supertest` to validate guard implementations and HTTP filters.

### E2E Tests
- **Playwright configuration**: Currently missing/unverified. E2E pipeline should be configured in `apps/web/playwright.config.ts`.

## Frontend Testing
### Component Tests
- **React Testing Library patterns**: While standard RTL is common, complex Ant Design structures are tested by directly mounting with `react-dom/client` (`createRoot`).
- **Ant Design component testing**: Wrap tested components in `<MemoryRouter>`, `<ConfigProvider>`, and `<App>` to provide necessary contexts.
- **Store testing patterns**: Test Zustand stores by asserting initial states and verifying state mutations after action calls.
- **Mock service patterns**: Replace API service calls using `vi.mock('../../services/...')` with mocked objects containing `vi.fn().mockResolvedValue()`.

### Clean Teardown
- **Root unmounting patterns**: Tests dynamically create a container `div` attached to `document.body`, render the root, and unmount/remove the element in `afterEach()`.
- **Portal cleanup**: Ensures Ant Design modals and tooltips do not leak between tests.

## Test Coverage
### Current Coverage Map
| Module/Area | Unit | Integration | E2E | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `apps/api/users` | High | Moderate | Low | Excellent service mocking. |
| `apps/web/pages` | High | Low | None | Tests ensure backward compatibility and UI state. |
| `packages/shared-*` | Moderate | N/A | N/A | Validator parsing tests. |

### Coverage Gaps
- **E2E Testing**: No Playwright configurations exist. Critical flows like full login and RBAC navigation need automated browser testing.
- **Web Integration**: End-to-end integration between frontend Zustand stores and actual API endpoints (MSW could be introduced).

## Test Infrastructure
- **CI/CD test pipeline**: Tests are run via standard GitHub Actions.
- **Environment configuration**: Test environment variables run with strict isolation.
- **Turborepo**: Test tasks are managed via `turbo run test`. Vitest utilizes `passWithNoTests: true` to prevent workflow failures in packages without tests.

## Test Patterns & Anti-Patterns
- **Approved mock patterns**: Typecasting mocked deep objects safely via `as unknown as MyType`. Using `vi.mock` for frontend API service layers.
- **Prohibited patterns**:
  - Empty `catch {}` blocks.
  - Relying on `any` for test data; explicitly structure partial mock objects.
  - Hardcoded sleep timeouts (`setTimeout`) in tests instead of proper `act()` and wait mechanisms.
- **Assertion best practices**: For sensitive endpoints, specifically assert that secure fields (passwords, tokens) are stripped from responses (`expect(res.passwordHash).toBeUndefined()`).

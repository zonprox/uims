# Testing Infrastructure & Coverage

This document comprehensively outlines the testing architecture, frameworks, configurations, and patterns used across the UIMS (Unified IT Management System) monorepo. The testing suite focuses heavily on security boundary isolation, API routing, and component state management.

## 1. Test Framework Configuration & Setup

The project has completely standardized on **Vitest** for both backend API and frontend web testing, allowing for native ESM support and zero-configuration TypeScript resolution.

### API Vitest Configuration (`apps/api/vitest.config.mts`)
- **Environment**: `'node'`, optimized for fast API execution.
- **Globals**: Enabled (`globals: true`), allowing implicit global test methods like `describe`, `it`, `beforeEach`, `expect`, `vi`.
- **Test Discovery**: Explicitly scoped via `include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec,e2e-spec}.ts']`. Excludes build artifacts in `dist/`.
- **Aliases**: Resolves path aliases using Node's native `path.resolve` relative to `import.meta.dirname`. 
  - E.g., `'@uims/shared-types': path.resolve(import.meta.dirname, '../../packages/shared-types/src')`.
- **Timeouts**: Generous test and hook timeouts are configured at `20000ms`, acknowledging the overhead of Prisma schema resolution or larger mock setups.
- **TypeScript Support**: Native support without requiring `ts-jest`.

### Web Vitest Configuration (`apps/web/vitest.config.ts`)
- **Plugins**: Includes `@vitejs/plugin-react` directly in the test setup.
- **Environment**: Uses `'happy-dom'` instead of `'jsdom'`, which offers faster execution for React component trees and browser API emulation.
- **Timeouts**: Extended to `30000ms`, likely due to the slower initialization of frontend DOM environments.
- **Aliases**: Resolves `@/*` paths mapping to the local `src` folder, plus workspace packages.

## 2. Test Directory Organization & Philosophy

- **Implementation Co-location**: Unit tests strictly live adjacent to their corresponding implementation files. For instance, `users.controller.ts` is immediately tested by `users.controller.spec.ts` inside `apps/api/src/modules/users/`. This pattern prevents test bitrot and ensures structural alignment.
- **Dedicated E2E/Adversarial Scope**: Tests mapping complex boundary crossings or security contexts are suffixed with `.adversarial.spec.ts` and can be co-located or grouped in specific `test` folders.
- **Workspace Tooling**: `package.json` scripts across `api`, `web`, and `packages/*` expose standard `pnpm test` commands. Turborepo handles parallel execution.
- **Test Naming Convention**: Uses the standard `*.spec.ts` pattern for backend tests.

## 3. Backend Unit Testing Patterns

### Mocking Dependencies & Inversion of Control
Vitest's API (`vi.fn()`, `vi.spyOn()`) handles dependency injection mocking. Tests instantiate services manually rather than using NestJS's heavy `Test.createTestingModule` unless integration context is needed.
- **Typing the Mocks**: Due to the zero-`any` strict TypeScript rule, dependencies are coercively typed: 
  ```typescript
  service = mockService as unknown as UsersService;
  ```
- **Prisma Mocking**: Prisma is rarely connected to a live database in unit specs. Instead, nested Prisma delegates are mocked deeply. This means fast test executions but requires detailed mocks:
  ```typescript
  mockPrismaService = {
    directoryUser: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() }
  };
  ```

### Controller Boundary Tests
Controller tests strictly evaluate the transport layer. They do not test business logic.
- They pass mocked DTOs to the methods and assert that the underlying service methods were called precisely once with the correct arguments.
- Responses from the mocked service are passed through and asserted against the controller's return value.
- Example from `UsersController`:
  ```typescript
  it('should create group', async () => {
    const dto = { name: 'GR_Sample', email: 'sample@youngonevn.com' };
    mockService.createGroup.mockResolvedValue({ id: 'g2', ...dto });
    const res = await controller.createGroup(dto);
    expect(res.id).toBe('g2');
  });
  ```

### Service Unit Tests
Service tests aim to cover all business logic paths, error handling, and formatting.
- `beforeEach` usually initializes the service with isolated mocks to ensure test independence.
- Validation of logging and internal data transformation is common.

## 4. Adversarial & Security Testing

A defining characteristic of the UIMS backend is its reliance on "Adversarial Tests" (e.g., `auth-isolation.adversarial.spec.ts`, `directory.adversarial.spec.ts`).
- **Payload Injection**: These tests iterate through arrays of known malicious payloads (SQLi, NoSQL injection, LDAP wildcarding, XSS scripts, Null bytes) and assert that the application throws a generic `UnauthorizedException` while internally recording security audit events.
  ```typescript
  const maliciousPayloads = [
    { name: 'SQL Injection comment', payload: "admin'--" },
    { name: 'LDAP filter wildcard', payload: '*(|(mail=*))' }
  ];
  ```
- **Schema Validation**: Interestingly, these tests programmatically reflect on the Prisma `DMMF` datamodel to enforce invariants. For example, ensuring that the `DirectoryUser` model never accidentally receives a `passwordHash` field, permanently isolating directory entities from application authentication.
- **Stress Handling**: Tests validate large string handling (e.g., passing 10,000-character passwords) to ensure regex or hashing bounds don't cause CPU exhaustion.
- **Audit Trails**: Security tests heavily verify that the correct `auditLog.create` calls are dispatched on failure (e.g., `LOGIN_FAILED`, `LOGIN_REJECTED_DIRECTORY_RECORD`).

## 5. Frontend Unit & State Testing Patterns

The frontend utilizes Vitest with `happy-dom`.
- **Zustand Store Tests**: Store testing focuses on validating state machine transitions (e.g., testing that `login()` properly populates `user`, `token`, and `permissions` while `logout()` resets them).
- **Component Tests**: Driven by React Testing Library, simulating user clicks and validating layout shifts or notification dispatches.
- **Hooks**: Custom hooks can be tested in isolation using `@testing-library/react-hooks` or native React tools.

## 6. Coverage Quality & Strategic Gaps

- **High Fidelity**: Security domains (Authentication, Audit, Directory isolation) are heavily tested, approaching 100% path coverage for negative edge cases. Controllers are 100% covered for correct delegation.
- **Mock-Heavy Tradeoff**: Because almost all tests rely on manual `vi.fn()` mocking rather than spinning up ephemeral Postgres containers via Testcontainers, the tests are extremely fast. However, complex Prisma queries involving nested `include` or intricate `where` clauses might fail in production if the mock diverges from true database behavior.
- **Missing Integration Layers**: There appears to be a gap in full-stack E2E testing (e.g., Playwright/Cypress) covering the React frontend communicating with a live NestJS API.
- **Testing Script Coverage**: All workspace packages run under `turbo run test`. The strict type checking (`skipLibCheck: true`, but `strict: true` locally) ensures that tests themselves are strongly typed and won't compile if APIs shift.

## 7. Mock Patterns in Detail

### Clearing and Restoring Mocks
Vitest provides several ways to manage mock state:
- `vi.clearAllMocks()` is used to clear call history.
- `vi.resetAllMocks()` resets the implementation.
- `vi.restoreAllMocks()` restores the original implementation.
The project standardizes on `vi.clearAllMocks()` in the `beforeEach` block.

### Mocking Network and Dates
- Network requests (e.g., using `fetch` or `axios`) are typically intercepted at the boundary.
- Date and Time are mocked using `vi.useFakeTimers()` when testing time-sensitive business logic, such as token expiration or schedule triggers.

## 8. Test Quality & Coverage Gaps

### What is well-tested
- Authentication and authorization boundary logic.
- User management and roles.
- Controller delegation.

### Under-tested Areas
- Complex database transactions that cannot be accurately simulated by Prisma mocks.
- Edge cases in React component rendering under stress or concurrent mode.
- End-to-end integration across the API and frontend boundary.

### CI Integration
- The Turborepo pipeline executes `lint`, `build`, and `test` in parallel.
- Coverage thresholds could be enforced using Vitest's `coverage.thresholds` configuration, though it is currently not explicitly defined in the provided configs, relying instead on developer discipline.

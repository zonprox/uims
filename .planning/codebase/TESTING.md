# Testing Strategy
> Generated: 2026-09-13 | Focus: Test infrastructure, patterns, and coverage

## Test Frameworks & Versions
- **Unit & Integration Framework**: **Vitest (^5.0.0)** is the unified test runner for both the Web and API workspaces. This provides a fast, ESM-native alternative to Jest.
- **DOM Environment**: **Happy-DOM (^20.14.3)** is utilized for lightweight frontend DOM emulation, drastically improving test speeds compared to JSDOM.
- **E2E Framework**: **Playwright (^1.63.0)** is present in the root `package.json` for end-to-end integration and UI testing.

## Test Organization
- Tests are heavily co-located with their source files using the `*.spec.ts` naming convention (e.g., `users.service.spec.ts` alongside `users.service.ts`).
- Global monorepo execution is managed via Turborepo (`turbo run test`).

## Backend Testing (NestJS + Prisma)
### Unit Tests
- The backend extensively tests services by mocking out dependencies (like `PrismaService`).
- **Mock Patterns**: Vitest's `vi.fn()` is heavily used. `PrismaService` is often mocked as a `Record<string, unknown>` mapping Prisma models to mocked functions (e.g., `findUnique`, `create`, `count`).
- **Example**: In `users.service.spec.ts`, multiple `describe` blocks group tests by method (`create`, `findOne`, `toggleStatus`), and Prisma database calls are stubbed to return specific DTO-like structures.

### Integration Tests
- Integration tests are visible (e.g., `e2e-adversarial.spec.ts`, `m1-adversarial-challenger.spec.ts` inside `apps/api/test/e2e/`), testing API routes against actual or in-memory databases with real NestJS dependency injection using `@nestjs/testing` (^11.2.3).

### Test Patterns
- `beforeEach` is universally used to construct fresh class instances and reset mocks between tests, avoiding state leakage.
- Assertions leverage standard Vitest expect chains (e.g., `expect(...).resolves.toEqual(...)`).

## Frontend Testing (React + Vite)
### Component & Hook Tests
- Web tests are resolved via `apps/web/vitest.config.ts`.
- Path aliases (`@/`, `@uims/*`) are automatically resolved in tests matching the Vite build configuration.
- Tests are executed within the `happy-dom` environment.

### Test Patterns
- `passWithNoTests: true` is configured to prevent failures in modules that lack test coverage temporarily.
- Default timeouts are slightly extended (30,000ms for both `testTimeout` and `hookTimeout`) to accommodate larger rendering or async data fetching scenarios.

## E2E Testing
- Defined via Playwright as `turbo run test:e2e` in the root `package.json`.
- Likely covers full-stack workflows (Web UI to API), though detailed Playwright configurations require further targeted inspection.

## Test Utilities & Mocks
- No singular global mock factory was observed; developers typically create localized objects using `vi.fn()` directly in the `*.spec.ts` files. 

## Coverage Configuration
- No strict coverage threshold configurations (e.g., Istanbul/c8 thresholds in `vitest.config.ts`) were observed.
- The CI pipeline executes tests but does not currently gate on a specific minimum coverage percentage.

## CI Pipeline
- The `.github/workflows/ci.yml` file guarantees tests run on every push and PR to `main`.
- Environment variables (e.g., `DATABASE_URL`, `JWT_SECRET`) are explicitly provided for the test steps.
- The pipeline executes `pnpm run test` strictly after typechecking and linting.

## Test Inventory (Counts)
A comprehensive scan of the workspace (excluding `node_modules`) reveals:
- **Total Test Files**: 84
  - **API Test Files**: 57
  - **Web Test Files**: 15
  - **Workspace Packages Test Files**: 12
- **Total Individual Test Cases** (e.g., `it(...)`, `test(...)`): ~948 test cases.

## Assessment & Gaps
- **Strengths**: 
  - Standardizing on Vitest across both frontend and backend is an excellent 2026 practice, reducing context switching and configuration overhead.
  - Co-locating tests makes discovering and updating them alongside feature changes intuitive.
  - Very high volume of backend service unit tests (~948 total cases indicates solid base coverage).
- **Gaps**: 
  - Lack of explicit test coverage gating in CI. Implementing coverage reporting (e.g., v8 coverage via Vitest) and enforcing baseline thresholds could prevent regressions.
  - Mocking `PrismaService` manually with `Record<string, vi.fn()>` is prone to type drift. Migrating to `vitest-mock-extended` or `@prisma/client/testing` could improve type safety in tests.

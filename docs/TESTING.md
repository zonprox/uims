<!-- generated-by: gsd-doc-writer -->
# Testing

This document outlines the testing strategy, frameworks, and conventions for the UIMS (Unified IT Management System) monorepo.

## Test Frameworks and Setup

We use different testing frameworks optimized for specific layers of the application:

- **Unit & Integration Tests**: [Vitest](https://vitest.dev/) is used across the monorepo for fast, reliable unit and integration testing.
  - **API** (`@uims/api`): Configured with a `node` environment.
  - **Web** (`@uims/web`): Configured with a `happy-dom` environment for React component testing.
  - **Shared Packages** (e.g., `@uims/shared-validators`, `@uims/shared-utils`): Use default Vitest configurations for testing shared logic.
- **End-to-End (E2E) Tests**: [Playwright](https://playwright.dev/) dependencies and scripts are present at the monorepo root, though full E2E test suites and configurations are not yet fully implemented.

Both frameworks are integrated with [Turborepo](https://turbo.build/repo) to ensure efficient, cached test execution.

## Running Tests

Tests can be run from the monorepo root using standard `pnpm` scripts.

### Unit and Integration Tests

Run unit tests across all workspaces:

```bash
pnpm test
```

### End-to-End Tests

Run Playwright E2E tests:

```bash
pnpm test:e2e
```

## Writing New Tests

### File Naming Conventions

- **Unit/Integration**: Name your test files using `.test.ts` or `.spec.ts` (e.g., `UserService.test.ts` or `Button.spec.tsx`).
- **Placement**: Place your test files adjacent to the source files they test, or in a `__tests__` directory if testing a larger module.

### Test Patterns

#### API (Vitest / Node)

The API workspace sets `globals: true`, meaning standard testing functions (`describe`, `it`, `expect`) are available globally. However, explicitly importing them is recommended for better IDE support.

```typescript
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  it('should return a user by id', () => {
    // ...
  });
});
```

#### Web (Vitest / Happy-DOM)

The Web workspace uses `happy-dom` to simulate a browser environment, enabling testing of React components. Path aliases like `@/` and `@uims/*` are configured to match the application code.

### Coverage Requirements

Currently, there are no strict coverage thresholds enforced (e.g., in CI or pre-commit hooks). However, developers are encouraged to write tests for all new business logic and critical UI components. 

<!-- VERIFY: Check if coverage collection should be enabled in vitest configurations in the future. -->

## CI Integration

There are currently no Continuous Integration (CI) pipelines (such as GitHub Actions or GitLab CI) configured in the repository. 

<!-- VERIFY: When CI is configured, ensure that `pnpm test` and `pnpm test:e2e` are added as required build steps. -->

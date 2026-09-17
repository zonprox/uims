---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
# Coding Conventions

**Analysis Date:** 2026-09-17

## Naming Patterns

**Files:**

- React components: PascalCase (e.g., `AssetsPage.tsx`, `AssetTable.tsx`)
- NestJS modules/services: kebab-case with type suffix (e.g., `assets.service.ts`, `assets.controller.ts`)
- Utility/hook files: camelCase (e.g., `useAssetManagement.ts`, `qrDecoder.ts`)

**Functions:**

- `camelCase` for all functions and methods (e.g., `formatAsset`, `handleFilterChange`).
- React hook names must start with `use`.

**Variables:**

- `camelCase` for local variables and instances.
- Acronyms in variable names are treated as words (e.g., `categoryId`, not `categoryID`).

**Types:**

- `PascalCase` for TypeScript interfaces, types, and DTOs (e.g., `AssetStatsDto`, `AssetWithRelations`).

## Code Style

**Formatting:**

- Tool: Biome
- Settings:
  - Indentation: 2 spaces
  - Line width: 100 characters
  - Quotes: Single quotes
  - Trailing commas: All
  - Semicolons: Always

**Linting:**

- Tool: Biome / ESLint
- Key rules:
  - `preset: recommended`
  - `noExcessiveCognitiveComplexity: warn`
  - `noExplicitAny: warn`
  - `noNonNullAssertion: warn`

## Import Organization

**Order:**

1. External libraries (e.g., `react`, `@nestjs/common`, `antd`)
2. Monorepo shared packages (e.g., `@uims/shared-types`, `@uims/shared-utils`)
3. Absolute aliases (e.g., `@/components/...`)
4. Relative imports (e.g., `../../database/prisma.service`)

**Path Aliases:**

- `@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils` for monorepo packages.
- `@/` mapped to `src/` inside apps where applicable.

## Error Handling

**Patterns:**

- In API: Throw appropriate NestJS HTTP exceptions (e.g., `NotFoundException`, `BadRequestException`) for business rule violations. Let the global exception filters format the response.
- In Web: Catch API errors or use hooks that handle loading/error states. Use UI feedback mechanisms (e.g., Ant Design messages/notifications) for user-facing errors.

## Logging

**Framework:** `@nestjs/common` `Logger` (in API) / `pino` (for structured logging in background)

**Patterns:**

- Instantiate a logger per class: `private readonly logger = new Logger(AssetsService.name);`
- Log exceptions with trace details: `this.logger.error('Message', error instanceof Error ? error.stack : String(error))`
- Do not log sensitive user information or raw credentials.

## Comments

**When to Comment:**

- Favor self-documenting code over excessive inline comments.
- Use block comments to explain complex business logic (e.g., `// Lifecycle State Machine:`).
- Document non-obvious workarounds or external integrations.

**JSDoc/TSDoc:**

- Use for exported utilities or shared types to provide context to consumers across the monorepo.
- Rarely used for internal class methods, except for complex calculation functions.

## Function Design

**Size:** Keep functions small. If a function handles multiple database calls, wrap it in a transaction block.

**Parameters:** Use single object parameters (options objects or DTOs) for functions that take more than 2-3 arguments (e.g., `async create(data: CreateAssetDto)`).

**Return Values:** Map raw database entities to clean DTOs/objects before returning (e.g., `this.formatAsset(asset)`). Never return raw Prisma relation objects with sensitive fields directly to controllers.

## Module Design

**Exports:** 

- Use named exports for utilities and hooks.
- Use default exports primarily for React page components (e.g., `export default function AssetsPage()`).

**Barrel Files:**

- Avoid deep nesting barrel files. Export types and utilities directly from their defining files or through shared monorepo packages (`packages/shared-*`).

---

*Convention analysis: 2026-09-17*

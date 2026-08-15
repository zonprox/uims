# Coding Conventions

**Analysis Date:** 2026-08-15

## Naming Patterns

**Files:**
- **NestJS API files:** kebab-case with type suffix (e.g., `users.controller.ts`, `http-exception.filter.ts`)
- **React Hooks:** camelCase (e.g., `useAssetManagement.ts`, `useSystemHealth.ts`)
- **React Components/Pages:** PascalCase (e.g., `OrganizationCanvas.tsx`)
- **Tests:** Co-located with `.test.ts`, `.spec.ts`, or `.test.tsx` extensions.

**Functions:**
- camelCase (e.g., `buildAssetSpecs`, `handleOpenCreateModal`)

**Variables:**
- camelCase (e.g., `modalSubmitting`, `searchQuery`)

**Types:**
- PascalCase for Classes, Interfaces, Types, and DTOs (e.g., `CreateUserDto`, `AssetFormValues`).

## Code Style

**Formatting:**
- **Tool:** Biome (`biome.json`)
- **Settings:** 2 spaces indent, single quotes, trailing commas (all), semicolons always, line width 100.

**Linting:**
- **Tool:** Biome
- **Key Rules:** `preset: recommended`, `noExplicitAny: warn`, `noNonNullAssertion: warn`, `noExcessiveCognitiveComplexity: warn`.

## Import Organization

**Order:**
1. External packages (e.g., `react`, `@nestjs/common`)
2. Path aliases (`@/`)
3. Relative imports (`../`, `./`)
*(Note: Biome's `organizeImports` is globally turned off in `biome.json`)*

**Path Aliases:**
- `@/` maps to `./src` in web workspace (`apps/web/vitest.config.ts`, `tsconfig`).

## Error Handling

**Patterns:**
- **API (NestJS):** Uses centralized Exception Filters (e.g., `HttpExceptionFilter`, `PrismaExceptionFilter`) to normalize responses into a standard shape: `{ success: false, statusCode, message, errors, timestamp }`.
- **Web (React):** Uses `try/catch` with `err: unknown` type casting. Extracts API error messages via `err.response?.data?.message` and displays them to the user via Ant Design's `App.useApp().message.error()`.

## Logging

**Framework:**
- API: NestJS built-in `Logger` (e.g., `import { Logger } from '@nestjs/common'`).
- Web: Standard `console.error` in catch blocks.

**Patterns:**
- Log exceptions in catch blocks before showing user-friendly toast messages.
- Bootstrap logs port configuration via NestJS `Logger`.

## Comments

**When to Comment:**
- Minimal inline comments; code is self-documenting.
- Comments are mainly used for Swagger API documentation generation.

**JSDoc/TSDoc:**
- Primarily used via Decorators in the backend (e.g., `@ApiOperation({ summary: '...' })`) rather than raw JSDoc blocks.

## Function Design

**Size:** Small, focused functions.
**Parameters:** Prefers object payloads/DTOs over multiple arguments (e.g., `findAll(options)` or `createUser(createUserDto)`).
**Return Values:** React hooks return an object of state variables and handlers. API services return promises of raw data or entities.

## Module Design

**Exports:** Named exports are standard across the codebase, except for framework configuration files (e.g., `vite.config.ts`, `vitest.config.ts`) which use `default export`.
**Barrel Files:** Not prominently used; components/services are imported from their specific files.
**Architecture:** NestJS uses Class-based Modules (`AppModule`, `UsersModule`).

---

*Convention analysis: 2026-08-15*

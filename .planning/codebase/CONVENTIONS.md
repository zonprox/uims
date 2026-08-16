# Coding Conventions

**Analysis Date:** 2026-08-16

## Naming Patterns

**Files:**
- Backend / Logic: Kebab-case, typically `[module].[type].ts` (e.g., `users.controller.ts`, `users.service.ts`).
- Frontend Components: PascalCase for React components (e.g., `PageContainer.tsx`, `UsersPage.tsx`).

**Functions:**
- camelCase for functions and methods.

**Variables:**
- camelCase for instances and variables.
- PascalCase for React component definitions.

**Types:**
- PascalCase for interfaces, classes, and types (e.g., `PageStatItem`, `CreateUserDto`).
- Enums: PascalCase.

## Code Style

**Formatting:**
- Tool: Biome
- Key Settings: 
  - Indentation: 2 spaces
  - Line width: 100 characters
  - Quotes: Single quotes (`'`)
  - Trailing commas: `all`
  - Semicolons: `always`

**Linting:**
- Tool: Biome and ESLint (via `turbo run lint`)
- Key Rules:
  - `recommended` preset
  - `noExcessiveCognitiveComplexity: warn`
  - `useConsistentArrayType: generic` (e.g., `Array<{}>` instead of `{}[]`)
  - `noExplicitAny: warn`

## Language & Terminology

**Enterprise English Standard Policy:**
- 100% Professional Enterprise English Mandatory.
- All user-facing UI labels, descriptions, alert messages, toasts/notifications, table columns, modal titles, placeholder text, code identifiers, comments, documentation, test descriptions, API payloads, error messages, and git commits MUST be in clear, standardized Enterprise English.
- No non-English or mixed language text anywhere.

## Import Organization

**Order:**
1. Built-in modules
2. External dependencies (`@nestjs/*`, `antd`, `react`, etc.)
3. Internal workspace packages (`@uims/shared-*`)
4. Local relative imports (`./`, `../`)

**Path Aliases:**
- Monorepo packages use workspace aliases like `@uims/shared-types` or `@uims/shared-validators`.

## Error Handling

**Patterns:**
- Backend relies on NestJS Exception Filters and standard exceptions (e.g., `NotFoundException`).
- Frontend uses standard Error Boundaries (`ErrorBoundary.tsx`).

## Logging

**Framework:** `pino` and `pino-http` in `@uims/api`.

**Patterns:**
- Structured JSON logging for production.

## UI / UX Design (Frontend)

**Ant Design v6+ Guidelines:**
- **Dynamic Context:** Always consume dynamic theme context via `App.useApp()` (e.g., `const { message, modal, notification } = App.useApp();`).
- **Styling:** Use semantic token styling with `styles={{ body: ... }}` and `styles={{ content: ... }}` rather than deprecated `bodyStyle` / `valueStyle`.
- **Layouts:** Use `<PageContainer>` for all views to maintain consistent breadcrumbs, KPI statistics, search controls, and primary action buttons.
- **Tables:** Keep table density high and information readable with dedicated quick actions (e.g., 1-click credential/email copying, status tags, responsive drawers).

## Module Design

**Backend:**
- NestJS modules (e.g., `UsersModule`).
- Controllers handle HTTP routing (`users.controller.ts`).
- Services handle business logic (`users.service.ts`).

---

*Convention analysis: 2026-08-16*

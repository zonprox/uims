---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# Coding Conventions

**Analysis Date:** 2026-10-14

## Naming Patterns

**Files:**
- React Components, Drawers & Pages: PascalCase (`PageContainer.tsx`, `AssetsPage.tsx`, `ActivityTimeline.tsx`, `FieldDiffViewer.tsx`, `HandoverDocumentModal.tsx`)
- NestJS Controllers, Services, Modules & Workers: kebab-case with descriptive suffix (`assets.controller.ts`, `assets.service.ts`, `assets.module.ts`, `scheduled-alerts.worker.ts`)
- Zustand Stores: kebab-case ending in `.store.ts` (`auth.store.ts`, `theme.store.ts`, `timezone.store.ts`, `notification-settings.store.ts`)
- Shared DTOs & Validators: kebab-case ending in `.dto.ts` or `.validator.ts` (`create-asset.dto.ts`, `asset.validator.ts`)
- Test Files: `.spec.ts` for API backend and shared-utils tests; `.test.ts` or `.test.tsx` for web and shared-validators tests

**Functions & Methods:**
- Action-oriented camelCase verbs: `findAll()`, `findAllUsers()`, `recordEntityDiff()`, `computeFieldDiff()`, `buildHandoverDocx()`, `resolveAllowedOrigins()`
- Boolean predicates: prefixed with `is`, `has`, or `should` (`isOriginAllowed()`, `isValidationError()`, `isLicenseKeyEncrypted()`, `isSensitiveFieldKey()`)
- Event Handlers: prefixed with `handle` (`handleSearch()`, `handleStatusChange()`, `handleCopyDiagnostics()`)

**Variables & Properties:**
- Standard identifiers: camelCase (`accessToken`, `costCenterId`, `lastLoginAt`, `handoverRecords`)
- Constants & Environment Variables: UPPER_SNAKE_CASE (`STANDARD_RACK_HEIGHT`, `CLOUDFLARE_DEV_ORIGIN_REGEX`, `JWT_SECRET`, `AUDIT_SIGNING_KEY`)
- Enums: PascalCase enum name with UPPER_SNAKE_CASE members (`AssetStatus.ACTIVE`, `AssetStatus.IN_REPAIR`)

**Types & Interfaces:**
- PascalCase without Hungarian `I` prefixes (`Asset`, `CreateAssetDto`, `HandoverDocumentParams`, `FieldDiffEntry`)
- Discriminated unions narrowed explicitly via runtime type guards (`'scanned' in item`, `result.status === 'fulfilled'`, `error instanceof Error`)

## Code Style & Formatting

**Formatting (Biome 2.5.15):**
- Engine: `@biomejs/biome` (`pnpm format` / `pnpm format:check` configured in `biome.json`)
- Indentation: 2 spaces (zero tabs)
- Quote Style: Single quotes (`'`) for TypeScript/JS; double quotes (`"`) in JSON and JSX attributes
- Line Width: 100 characters
- Pre-Commit & CI Gate: `pnpm run format:check` must pass with 0 discrepancies across all workspace files

**Linting & Strict Type Safety:**
- Linter: ESLint 10.12.0 with `@uims/eslint-config`
- Strict Compiler Flags: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `strictBindCallApply: true`, `noFallthroughCasesInSwitch: true` across all `tsconfig.json` files
- **Zero `any` Policy**: `any` and `as any` are strictly forbidden in production code and test suites; use `unknown`, generics, or Prisma generated types
- **Zero Diagnostic Suppressions**: `@ts-ignore`, `@ts-nocheck`, unindexed `@ts-expect-error`, and `/* eslint-disable */` for type violations are banned

## Import Organization & Module Boundaries

**Import Order:**
1. Node built-in modules (`node:crypto`, `node:fs`, `node:path`)
2. External packages (`@nestjs/common`, `antd`, `react`, `zod`, `docx`)
3. Workspace libraries (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`)
4. Internal relative/aliased modules (`@/components/PageContainer`, `../../database/prisma.service`)
5. Stylesheets (`./styles/global.css`)

**Zero Circular Dependencies:**
- Verified 0 circular call chains across 582 TypeScript files (`cycles_total: 0`).
- Zustand stores (`apps/web/src/stores/*.store.ts`) must never import service clients (`*.service.ts`) or `api.ts`.

## Error Handling & Logging

**Typed Catch & Zero Silent Catch Mandate:**
- Every `catch` block must type the error as `unknown`: `catch (error: unknown)`
- Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly prohibited across backend and frontend
- Every caught error must be:
  1. Logged via structured NestJS logger (`this.logger.error('Context', error instanceof Error ? error.stack : String(error))`),
  2. Re-thrown as an `HttpException` / domain error, or
  3. Surfaced to the user via `App.useApp().message.error(formatErrorMessage(error))` or `notification.error(...)`

**Structured Logging:**
- Backend uses `private readonly logger = new Logger(ContextName.name)` backed by `pino` 10.4.0.
- Raw `console.log`, `console.warn`, `console.error`, `console.info`, and `console.debug` are banned in production code, seeders, and workers.
- Frontend error boundaries (`ErrorBoundary.tsx`, `RouteErrorBoundary.tsx`) guard diagnostic console output behind `if (import.meta.env.DEV)`.

## Database, Audit & Cryptographic Conventions

**Bounded Queries & Deterministic Tie-Breakers:**
- Every `findMany()` call must specify `take: Math.min(limit, 100)` (or `take: 100` cursor batches in background workers) and a deterministic `orderBy` with a unique secondary tie-breaker (`orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`).
- All arithmetic sums, counts, and valuations execute in PostgreSQL via Prisma `_sum`, `_count`, `groupBy`, or `$queryRaw` — never via JavaScript `.reduce()` or `.filter()` over full table loads.

**Cross-Domain Audit Trail & Field Diffing:**
- Domain mutations compute field-level diffs using `computeFieldDiff` / `calculateFieldDiff` from `@uims/shared-utils` (`packages/shared-utils/src/diff.ts`) and persist tamper-evident HMAC-SHA256 records via `AuditService.recordEntityDiff()`.
- Sensitive fields (`password`, `secret`, `token`, `licenseKey`, `adInitialPassword`, `emailInitialPassword`) are automatically redacted in diffs (`[REDACTED]`).

**Ant Design v6 UI/UX & Enterprise English Standards:**
- Consume feedback exclusively via `const { message, modal, notification } = App.useApp()` (enforced by `apps/web/src/AppFeedbackSafety.test.tsx`).
- Use Ant Design v6 semantic `styles={{ body: { ... }, header: { ... }, content: { ... } }}` props; deprecated `bodyStyle`, `headStyle`, and `valueStyle` props are banned.
- All UI copy, labels, buttons, empty states, DTO messages, comments, and commits use 100% concise Enterprise English.

---

*Convention analysis: 2026-10-14*

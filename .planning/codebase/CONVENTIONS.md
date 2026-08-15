# Coding Conventions

**Analysis Date:** 2026-08-15

## Naming Patterns
- **Files**: Use `kebab-case` for file names (e.g., `assets.service.ts`, `auth.store.ts`).
- **Classes/Types/DTOs**: Use `PascalCase` (e.g., `AssetsService`, `CreateAssetDto`).
- **Functions/Variables**: Use `camelCase` (e.g., `resolveCategoryId`, `generateAssetTag`).
- **Unused Variables**: Prefix with `_` to satisfy the ESLint `no-unused-vars` rule.

## Code Style
- **Linter**: ESLint with `@typescript-eslint/recommended` and `eslint-config-prettier` (`packages/eslint-config/index.js`).
- **Formatting**: Prettier is used as the standard code formatter.
- **Types**: Explicit function return types are turned off in ESLint (`@typescript-eslint/explicit-function-return-type: 'off'`). Prefer relying on TypeScript's inference. `any` is warned against; prefer explicit typing or `unknown`.

## Import Organization
Group imports in the following order:
1. Third-party packages (e.g., `@nestjs/common`, `vitest`).
2. Internal monorepo packages (e.g., `@uims/shared-types`, `@uims/shared-utils`).
3. Absolute/Relative internal imports (e.g., `../../database/prisma.service`).
Use `type` imports where appropriate (e.g., `import type { Prisma } from '@prisma/client'`).

## Error Handling
- **API Layer**: Throw standard NestJS HTTP exceptions for client errors (e.g., `throw new NotFoundException('Asset not found')` in `apps/api/src/modules/assets/assets.service.ts`).
- Use database transactions (`prisma.$transaction`) to handle multi-step write operations cleanly.

## Logging
- Rely on framework-provided loggers (e.g., NestJS Logger).
- The system includes an Audit service for tracing actions and tracking state changes (e.g., creating `AssetHistory` records).

## Comments
- Avoid redundant inline comments. Rely on descriptive variable and function names.
- Keep business logic encapsulated into readable helper methods.

## Function Design
- Extract logic into private helper methods to keep main functions clean (e.g., `assignScalarFields` or `resolveCategoryId` in `assets.service.ts`).
- Use default parameters or fallback logic for optional inputs.
- Prefer smaller, pure functions where possible (e.g., `generateAssetTag`).

## Module Design
- **API**: Uses the NestJS modular structure (Controllers, Services, Modules). Use Dependency Injection for services like `PrismaService`.
- **Web**: Uses Zustand for state management. Stores are defined as hooks (e.g., `useAuthStore` in `apps/web/src/stores/auth.store.ts`).

---
*Convention analysis: 2026-08-15*

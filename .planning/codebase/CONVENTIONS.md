# Coding Conventions

**Analysis Date:** 2026-09-10

## Naming Patterns
**Files:**
- Domain logic & infrastructure use kebab-case (`auth.controller.ts`, `prisma-exception.filter.ts`).
- React components use PascalCase (`SidebarBrandHeader.tsx`).
- Tests use `*.spec.ts` for backend and `*.test.tsx` for frontend.

**Functions:**
- camelCase is standard across the codebase (`getProfile`, `findByIdentifier`).

**Variables:**
- camelCase for instances, PascalCase for classes/interfaces.

**Types:**
- Interfaces and DTOs use PascalCase (e.g., `interface AuthRequest`, `class LoginDto`).

## Code Style
**Formatting:**
- Formatted via Biome (`biome.json`).
- Indentation: 2 spaces. Line width: 100 chars.
- Quotes: single quotes. Trailing commas: all. Semicolons: always.

**Linting:**
- Managed via ESLint and Biome.
- `eslint-config-prettier` is used to prevent ESLint from formatting.
- Explicit function return types are disabled (`'@typescript-eslint/explicit-function-return-type': 'off'`).
- Explicit `any` warns instead of errors. Unused variables are ignored if prefixed with `_`.

## Import Organization
**Order:**
- Biome import organization is currently disabled (`organizeImports: "off"`).
- Conventionally, external dependencies are imported first, followed by internal absolute paths, then internal relative paths.

**Path Aliases:**
- Configured in Vite (`vitest.config.ts`) and TypeScript.
- `@/*` maps to internal app `src/` directory.
- `@uims/shared-*` maps to workspace packages (e.g., `packages/shared-types/src`).

## Error Handling
**Patterns:**
- **NestJS Global Filters:** Exceptions are transformed by centralized exception filters (`http-exception.filter.ts`, `prisma-exception.filter.ts`).
- **Prisma Handling:** `PrismaExceptionFilter` maps database codes to HTTP statuses (e.g., `P2002` maps to HTTP 409 Conflict, `P2025` to HTTP 404).
- **HTTP Exceptions:** Errors are standardized into JSON responses with `success: false, statusCode, message, errors, timestamp`.

## Logging
**Framework:**
- NestJS built-in `Logger` (e.g., `new Logger(PrismaExceptionFilter.name)`).

**Patterns:**
- Instantiated per class with class name context. Used for database error tracking and lifecycle events.

## Comments
**When to Comment:**
- Minimal inline comments. Comments are used to explain complex domain logic or test workarounds (e.g., `// Mock useSystemHealth to prevent network polling in test`).

**JSDoc/TSDoc:**
- Swagger decorators are heavily used in controllers (`@ApiOperation({ summary: 'User login' })`) instead of traditional JSDoc.

## Function Design
**Size:**
- Controllers act as thin wrappers delegating to services. E.g., `login` in `AuthController` simply returns `this.authService.login(...)`.

**Parameters:**
- Uses NestJS parameter decorators (`@Body`, `@ClientIP`, `@Headers`).

**Return Values:**
- Controller methods rely on implicit return type inference, passing service responses directly back to the Nest router.

## Module Design
**Exports:**
- Default exports are discouraged for services and controllers; named exports are standard (`export class AuthController`).
- React components use named exports.

**Barrel Files:**
- Not heavily enforced for NestJS modules. Modules export their providers naturally via `module.ts`.

---
*Convention analysis: 2026-09-10*

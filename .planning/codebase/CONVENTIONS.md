# Coding Conventions

**Analysis Date:** 2026-08-14

## Naming Patterns

**Files:**
- Backend components: `kebab-case.module.ts`, `kebab-case.service.ts`, `kebab-case.controller.ts`, `kebab-case.dto.ts`
- Frontend components & views: `PascalCase.tsx` (`MainLayout.tsx`, `AssetsPage.tsx`, `PageContainer.tsx`)
- Shared library modules: `kebab-case.validator.ts`, `format.ts`, `index.ts`
- Test files: `*.spec.ts` for NestJS backend tests, `*.test.ts` or `*.test.tsx` for shared/web packages

**Functions & Methods:**
- camelCase for all standard functions and class methods (`findAll`, `createIp`, `formatAsset`, `toggleMode`)
- React hook functions: prefixed with `use` (`useAuth`, `useThemeStore`, `useBreakpoint`)
- Event handler functions: prefixed with `handle` (`handleOpenEditModal`, `handleDeleteAsset`, `handleLogout`)

**Variables & Constants:**
- Variables and class fields: `camelCase` (`assetTag`, `totalSeats`, `assignedToId`)
- Global configuration constants and enums: `UPPER_SNAKE_CASE` (`DEFAULT_PAGE_SIZE`, `JWT_SECRET`, `AssetStatus.IN_USE`)

**Types & Classes:**
- Classes, interfaces, type aliases: `PascalCase` (`AssetsService`, `MainLayoutProps`, `CreateAssetDto`, `UserStatus`)
- No Hungarian notation / `I` prefix for interfaces (`User`, not `IUser`)

## Code Style

**Formatting:**
- Formatter: Biome (`biome.json`) as root fast formatter + Prettier compatibility
- Indentation: 2 spaces
- Quotes: Single quotes for JavaScript / TypeScript strings (`'single'`)
- Semicolons: Always required
- Line length: 100 characters max limit
- Trailing commas: `all` for multiline objects/arrays

**Linting:**
- Linters: Biome + ESLint (`packages/eslint-config/index.js`) using `@typescript-eslint` recommended rules
- Unused variables: Ignored if prefixed with underscore `_` (`argsIgnorePattern: '^_'`)
- Explicit return types: Recommended on public service APIs, optional on internal handlers

## Import Organization

**Order:**
1. Node.js built-ins and core framework packages (`@nestjs/*`, `react`, `react-router`, `antd`, `@ant-design/*`)
2. Third-party library packages (`axios`, `zod`, `dayjs`, `pino`, `zustand`, `bcrypt`)
3. Workspace package imports (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`)
4. Internal absolute / relative project imports (`../services/api`, `../../database/prisma.service`)
5. Type imports (`import type { MenuProps } from 'antd'`)

**Grouping:**
- Clean single-line separation between external library imports and internal relative modules.
- Named imports sorted and grouped cleanly.

## Error Handling

**Backend Strategy:**
- Throw standard NestJS exceptions (`NotFoundException`, `UnauthorizedException`, `BadRequestException`, `ForbiddenException`).
- Catch and transform uncaught exceptions at the HTTP perimeter via `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`).
- Catch Prisma database constraint failures via `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`).
- Never allow unhandled promise rejections or raw database error stack traces to leak to the client.

**Frontend Strategy:**
- Axios response interceptor (`apps/web/src/services/api.ts`) captures 401 Unauthorized responses to clear token storage and redirect to `/login`.
- Ant Design `message.error()` and `App.useApp().modal` used for human-readable error banners and confirmation alerts.
- Form validation errors displayed directly under relevant inputs via Ant Design `Form.Item` help text.

## Logging

**Framework:**
- Backend: Structured JSON logging via Pino (`pino` and `pino-http`) in `apps/api`.
- Frontend: Dev-time console warnings only; silent in production builds.

**Patterns:**
- Log error context with relevant entity identifiers before throwing.
- Avoid logging sensitive credentials (passwords, tokens, raw secret keys).

## Comments & Documentation

**When to Comment:**
- Explain domain-specific rules (e.g. status mapping transitions, seat allocation formulas, SLA countdown math).
- Document complex queries or multi-step database operations.
- Avoid redundant comments that simply repeat method names.

**Swagger / OpenAPI Annotations:**
- Use `@ApiTags()`, `@ApiOperation({ summary })`, `@ApiBearerAuth()`, and `@ApiPaginatedResponse()` on NestJS controller methods.

## Function & Module Design

**Function Design:**
- Keep single-purpose methods under 50 lines.
- Extract complex payload formatting and transformation logic into private helper methods (`formatAsset`, `formatTicket`, `formatMailbox`).
- Validate incoming arguments using Zod schemas or NestJS validation pipes before executing business logic.

**Module Design:**
- Clean separation between Controller (HTTP routing/input parsing) and Service (business logic and DB access).
- Barrel export pattern (`index.ts`) used across shared packages (`packages/shared-*`) for clean consumer imports.

---

*Convention analysis: 2026-08-14*
*Update when patterns change*

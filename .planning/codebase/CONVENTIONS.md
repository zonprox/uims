# Code Conventions
> Generated: 2026-09-13 | Focus: Standards, patterns, and style enforcement

## TypeScript Configuration
- **Strictness**: TypeScript 7.x is used across the monorepo with strict type-checking enabled.
- **Path Aliases**:
  - Web: `@/` resolves to `apps/web/src`.
  - Packages: `@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils` resolve to their respective workspace package `src` directories.
- **Engine Requirements**: Node.js >=22.0.0, PNPM >=11.0.0.

## Naming Conventions
- **Files**: Kebab-case for standard files (e.g., `users.service.ts`, `app.config.ts`).
- **Classes**: PascalCase (e.g., `UsersService`, `AuditInterceptor`).
- **Functions/Variables**: camelCase (e.g., `generateSecureRandomPassword`).
- **Constants**: UPPER_SNAKE_CASE.

## Code Formatting (Biome)
The monorepo standardizes on **Biome (v2.5.13)** for fast, consistent formatting.
- **Indentation**: 2 spaces (`indentStyle: "space"`, `indentWidth: 2`).
- **Line Width**: 100 characters.
- **Quotes**: Single quotes for JavaScript/TypeScript (`quoteStyle: "single"`).
- **Trailing Commas**: All (`trailingCommas: "all"`) for JS/TS, but `none` for JSON.
- **Semicolons**: Always required (`semicolons: "always"`).

## Linting Rules
Linting is a hybrid of Biome and ESLint (`@uims/eslint-config` workspace package).
- **Biome Linter**:
  - Warns on `noExcessiveCognitiveComplexity` to enforce simpler logic.
  - Warns on `noNonNullAssertion` and `noExplicitAny` for safer TypeScript usage.
  - Enforces generic array types (`useConsistentArrayType` -> `generic`).
- **ESLint**: Utilizes `typescript-eslint` (^8.70.0) alongside Prettier compatibility layers (`eslint-config-prettier` v10.1.8).

## Backend Conventions (NestJS 11)
### Module Pattern
- Strongly structured around NestJS modules (`*.module.ts`, `*.controller.ts`, `*.service.ts`).
- Feature-based directories inside `apps/api/src/modules/` (e.g., `users`, `directory`, `audit`, `auth`).

### DTO & Validation
- Relies heavily on **`class-validator` (^0.15.1)** and **`class-transformer` (^0.5.1)** for payload validation (e.g., `login.dto.ts`, `create-asset.dto.ts`).
- **Zod** (v4.6.1) is also available for complex or functional schema validations where classes are not ideal.

### Error Handling
- Centralized exception filters: `http-exception.filter.ts` and `prisma-exception.filter.ts`.
- These intercept standard HTTP errors and Prisma database errors to return consistent API responses.

### Logging
- Uses **Pino** (`pino` v10.3.1, `pino-http` v11.0.0) for high-performance structured JSON logging.
- Audit trails are automatically intercepted via `AuditInterceptor` (`audit.interceptor.ts`).

### API Response Pattern
- Controllers respond directly with DTOs or entities, which are then shaped by interceptors (`transform.interceptor.ts`) into a consistent response envelope for the frontend.

## Frontend Conventions (React 19)
### Component Patterns
- Functional components authored in `.tsx` files.
- Uses Vite 8 for fast builds and HMR.

### State Management
- Local/Global State: **Zustand** (v5.0.15) is used for lightweight, boilerplate-free state management.
- Server State: **TanStack Query** (v5.102) for data fetching, caching, and synchronization.

### Data Fetching
- Configured with Axios (^1.20.0). Wrapped by TanStack Query for caching and lifecycle management.

### Styling
- **Ant Design** (v6.6.3) and `@ant-design/pro-components` (v2.8.10) form the foundational UI library.

## Database Conventions (Prisma 7.10)
### Schema Patterns
- Managed by `@prisma/adapter-pg` connecting to PostgreSQL 17.
- Models represent domain entities.

### Query Patterns
- Direct injection of `PrismaService` into standard services.
- Examples show strong typing and relationship includes utilized efficiently.

## Git & CI Conventions
- **CI Pipeline**: GitHub Actions (`.github/workflows/ci.yml`).
- Triggers on push to `main` or PRs targeting `main`.
- **Workflow Steps**:
  1. Setup Node 22 & PNPM 11.21.
  2. Install dependencies & generate Prisma Client.
  3. Format Check (`biome format .`).
  4. Lint (`eslint` & Biome).
  5. Typecheck (`tsc --noEmit`).
  6. Test (`vitest`).
  7. Build (`turbo run build`).

## Convention Compliance Assessment
- **Modernity**: Extremely modern (Node 22, React 19, Nest 11, Prisma 7, Vitest 5).
- **Tooling**: Shifting to Biome shows a proactive optimization for 2026 performance standards.
- **Consistency**: High alignment. Turborepo handles monorepo orchestration beautifully.

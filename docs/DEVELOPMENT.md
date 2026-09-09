<!-- generated-by: gsd-doc-writer -->

# UIMS Development Guide

This document outlines the local setup, monorepo architecture, development workflows, build tooling, code style conventions, and contribution processes for the Unified IT Management System (UIMS).

## Prerequisites

Before setting up the project locally, ensure you have the following software installed:

- **Node.js**: `>=22.0.0` (Node.js 22 LTS or higher recommended)
- **pnpm**: `>=11.0.0` (Project configured with `pnpm@11.21.0` via [`package.json`](file:///home/user/projects/uims/package.json))
- **Docker & Docker Compose**: Required for running backing services (PostgreSQL, Redis, Meilisearch, SeaweedFS)
- **TypeScript**: TypeScript 7 (`^7.0.2` compiler standard across monorepo packages)

## Local Setup

Follow these steps to set up and run UIMS in your local development environment:

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd uims
   ```

2. **Install workspace dependencies:**
   UIMS uses `pnpm` (v11.21.0) with workspace protocol support.
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Copy the example environment configuration file to `.env`:
   ```bash
   cp .env.example .env
   ```
   The [`.env.example`](file:///home/user/projects/uims/.env.example) file contains default values for local development, including connection strings for PostgreSQL, Redis, Meilisearch, and SeaweedFS (S3-compatible object store).

4. **Start local backing services:**
   Use Docker Compose to spin up the required backing infrastructure services (PostgreSQL 17, Redis 8, Meilisearch, SeaweedFS) along with development container overlays:
   ```bash
   pnpm run docker:dev
   ```
   > [!NOTE]
   > In local Docker setups, PostgreSQL binds to host port `5433` (mapped from container `5432`) and Redis binds to host port `6381` (mapped from container `6379`) to avoid conflicts with native host services.

5. **Initialize and seed the database:**
   Generate the Prisma 7 client, run schema migrations, and seed the database with initial fixtures:
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   pnpm run db:seed
   ```

6. **Start development servers:**
   Start all applications (API and Web) simultaneously in watch mode:
   ```bash
   pnpm run dev
   ```
   - API server runs at: `http://localhost:3000` (API routes under `/api/v1`, Swagger documentation at `/api/v1/docs`)
   - Web frontend runs at: `http://localhost:5679`

## Monorepo Architecture & Task Orchestration

UIMS uses **Turborepo 2.10** (`turbo ^2.10.12`) to manage monorepo task execution, caching, and build pipelines configured in [`turbo.json`](file:///home/user/projects/uims/turbo.json).

### Turborepo Task Pipeline

The task pipeline defines topological dependencies (`dependsOn`), caching behavior, and environment dependencies:

- **`build`**: Depends on topological upstream builds (`^build`). Emits build outputs into `dist/**` and `.next/**`. Invalidates cache on changes to `NODE_ENV`.
- **`dev`**: Persistent interactive task (`persistent: true`, `cache: false`). Depends on upstream builds (`^build`) to ensure shared packages are compiled before server startup.
- **`lint` & `lint:fix`**: Runs linting tasks across packages, depending on upstream builds (`^build`).
- **`test`**: Runs unit and integration test suites, outputting coverage reports to `coverage/**`.
- **`test:e2e`**: Runs end-to-end test tasks.
- **`typecheck`**: Runs TypeScript type checking across all workspaces with `tsc --noEmit`.
- **`clean`**: Non-cached cleanup task (`cache: false`) that removes build outputs.

### Turborepo Environment & UI

- **UI Mode**: Configured with `"ui": "tui"` for an interactive terminal user interface during task execution.
- **Global Environment Variables**: Turborepo tracks changes to critical environment variables when hashing task cache:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `AUDIT_SIGNING_KEY`
  - `JWT_EXPIRATION`
  - `NODE_ENV`

### TypeScript Standard

The monorepo uses **TypeScript 7** (`^7.0.2` across `apps/api`, `apps/web`, and shared `packages/*`) as the compiler standard. Workspace packages use project references and strict type validation with shared configs.

## Build Commands

The following scripts are defined in the root [`package.json`](file:///home/user/projects/uims/package.json):

| Command | Exact Command Line | Description |
|---|---|---|
| `pnpm run dev` | `turbo run dev` | Starts the development server for all apps concurrently with live reloading. |
| `pnpm run dev:api` | `turbo run dev --filter=@uims/api` | Starts only the API backend development server. |
| `pnpm run dev:web` | `turbo run dev --filter=@uims/web` | Starts only the Vite React frontend development server. |
| `pnpm run build` | `turbo run build` | Builds all apps and packages in topological dependency order. |
| `pnpm run build:api` | `turbo run build --filter=@uims/api` | Builds only the API application. |
| `pnpm run build:web` | `turbo run build --filter=@uims/web` | Builds only the Web frontend application. |
| `pnpm run lint` | `turbo run lint` | Runs linters across all apps and packages. |
| `pnpm run lint:fix` | `turbo run lint:fix` | Runs linters across all packages and automatically applies fixes where possible. |
| `pnpm run format` | `biome format --write .` | Formats all workspace files using Biome. |
| `pnpm run format:check` | `biome format .` | Verifies code formatting across the repository without modifying files. |
| `pnpm run test` | `turbo run test` | Executes unit and integration test suites across all workspaces. |
| `pnpm run test:e2e` | `turbo run test:e2e` | Executes end-to-end test suites. |
| `pnpm run typecheck` | `turbo run typecheck` | Runs TypeScript type checking (`tsc --noEmit`) across all workspaces. |
| `pnpm run db:generate` | `pnpm --filter @uims/api prisma:generate` | Generates the Prisma 7 client from the database schema. |
| `pnpm run db:migrate` | `pnpm --filter @uims/api prisma:migrate` | Runs Prisma development migrations against the database. |
| `pnpm run db:migrate:prod` | `pnpm --filter @uims/api prisma:deploy` | Deploys pending Prisma migrations to a production database. |
| `pnpm run db:seed` | `pnpm --filter @uims/api prisma:seed` | Seeds the database with initial seed fixtures using `tsx prisma/seed.ts`. |
| `pnpm run db:studio` | `pnpm --filter @uims/api prisma:studio` | Opens Prisma Studio in the browser for database inspection and editing. |
| `pnpm run docker:up` | `docker compose up -d` | Starts production Docker services in the background. |
| `pnpm run docker:down` | `docker compose down` | Stops and tears down production Docker containers. |
| `pnpm run docker:build` | `docker compose build` | Builds Docker images for the services. |
| `pnpm run docker:logs` | `docker compose logs -f` | Follows logs from production Docker containers. |
| `pnpm run docker:dev` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d` | Starts development Docker services with volume mounting and hot reload. |
| `pnpm run docker:dev:down` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml down` | Stops development Docker containers. |
| `pnpm run docker:dev:logs` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f` | Follows live logs from development Docker containers. |
| `pnpm run clean` | `turbo run clean && rm -rf node_modules` | Cleans build artifacts and removes root and workspace `node_modules`. |
| `pnpm run prepare` | `echo 'Ready'` | Workspace prepare script hook. |

## Workspace Scripts

### API (`apps/api` - `@uims/api`)

Defined in [`apps/api/package.json`](file:///home/user/projects/uims/apps/api/package.json):

- **`dev`**: `tsc && (tsc --watch --preserveWatchOutput & nodemon --watch dist --delay 1s dist/main.js)`
  Executes an initial TypeScript compile, starts background watch compilation, and restarts the Node runtime via `nodemon` when compiled outputs change with a 1-second delay.
- **`build`**: `tsc`
  Compiles TypeScript source code into `dist/`.
- **`start`** / **`start:prod`**: `node dist/main`
  Executes the compiled production entrypoint.
- **`lint`**: `eslint "src/**/*.ts"`
  Lints backend TypeScript source files using ESLint.
- **`typecheck`**: `tsc --noEmit`
  Typechecks backend code without emitting output.
- **`test`**: `vitest run`
  Runs backend unit and integration tests using Vitest.
- **`test:watch`**: `vitest`
  Runs Vitest in interactive watch mode.
- **`prisma:generate`**: `prisma generate`
  Generates the Prisma client.
- **`prisma:migrate`**: `prisma migrate dev`
  Applies database migrations in development mode.
- **`prisma:deploy`**: `prisma migrate deploy`
  Applies database migrations in non-interactive production environments.
- **`prisma:studio`**: `prisma studio`
  Opens the Prisma Studio database explorer.
- **`prisma:seed`**: `prisma db seed`
  Executes database seeding using `tsx prisma/seed.ts`.
- **`clean`**: `rm -rf dist`
  Removes compiled distribution files.

### Web (`apps/web` - `@uims/web`)

Defined in [`apps/web/package.json`](file:///home/user/projects/uims/apps/web/package.json):

- **`dev`**: `vite`
  Starts the Vite development server with Hot Module Replacement (HMR).
- **`build`**: `tsc && vite build`
  Runs TypeScript type checking before compiling the production web bundle.
- **`preview`**: `vite preview`
  Locally previews the built production frontend application.
- **`lint`**: `eslint "src/**/*.{ts,tsx}"`
  Lints frontend React and TypeScript source files using ESLint.
- **`typecheck`**: `tsc --noEmit`
  Typechecks frontend TypeScript without emitting output.
- **`test`**: `vitest run`
  Runs frontend tests with Vitest and Happy DOM.
- **`clean`**: `rm -rf dist`
  Removes Vite build outputs.

### Shared Packages (`packages/*`)

- **`@uims/shared-types`**: Builds TypeScript type declarations and ESM bundles via `tsdown src/index.ts --dts --format esm`.
- **`@uims/shared-validators`**: Bundles runtime Zod schemas via `tsdown`.
- **`@uims/shared-utils`**: Bundles common utilities via `tsdown`.
- **`@uims/eslint-config`**: Shared ESLint configuration extending `typescript-eslint` and integrating `eslint-config-prettier`.

## Code Style, Formatting & Linting

Code style and formatting are managed using **Biome**, with supplementary linting via **ESLint** for application-specific rules.

### Biome Configuration (`biome.json`)

The project uses Biome (`^2.5.12`, schema `2.5.8`) as the authoritative code formatter and base linter configured in [`biome.json`](file:///home/user/projects/uims/biome.json):

- **Formatting Standards**:
  - `indentStyle`: `"space"`
  - `indentWidth`: `2`
  - `lineWidth`: `100`
  - `lineEnding`: `"lf"`
- **JavaScript & TypeScript Formatting**:
  - `quoteStyle`: `"single"`
  - `trailingCommas`: `"all"`
  - `semicolons`: `"always"`
  - `unsafeParameterDecoratorsEnabled`: `true` (enables NestJS decorator support)
- **JSON Formatting**:
  - `trailingCommas`: `"none"`
- **Biome Linter Rules**:
  - `preset`: `"recommended"`
  - `complexity.noExcessiveCognitiveComplexity`: `"warn"`
  - `style.noNonNullAssertion`: `"warn"`
  - `style.useConsistentArrayType`: `"warn"` (enforcing generic syntax: `Array<T>`)
  - `style.useImportType`: `"off"`
  - `suspicious.noExplicitAny`: `"warn"`
- **VCS & Ignored Directories**:
  - Biome respects git ignore files (`useIgnoreFile: true`).
  - Explicitly excluded: `node_modules`, `dist`, `build`, `.turbo`, `coverage`, `*.generated.*`, `prisma/migrations`, `.agents`, `.planning`.

### Formatter and Editor Configuration Notes

- **Prettier**: There is **no `.prettierrc`** file in the repository. Formatting is handled exclusively by Biome (`pnpm run format` / `pnpm run format:check`).
- **EditorConfig**: There is **no `.editorconfig`** file in the repository. The Biome configuration serves as the single source of truth for indentation, line endings, and width across developer environments.

### ESLint Configuration

Application workspaces (`apps/api` and `apps/web`) use ESLint via [`packages/eslint-config/index.js`](file:///home/user/projects/uims/packages/eslint-config/index.js):

- Integrates `typescript-eslint` recommended presets.
- Integrates `eslint-config-prettier` to ensure ESLint formatting rules never conflict with Biome formatting.
- Configures `@typescript-eslint/no-explicit-any: "warn"`.
- Configures `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }]`.
- Sets `@typescript-eslint/explicit-function-return-type: "off"`.

## Branch Conventions & Git Workflow

### Branch Naming Conventions

- **Default Branch**: `main`
- **Branch Naming**: Branch names should follow standard descriptive prefixes:
  - `feat/` - New feature implementation (e.g., `feat/rbac-audit-logs`)
  - `fix/` - Bug fixes (e.g., `fix/dev-proxy-routing`)
  - `chore/` - Maintenance, dependencies, or tooling tasks (e.g., `chore/refresh-codebase-map`)
  - `docs/` - Documentation additions or updates (e.g., `docs/api-guide`)
  - `refactor/` - Code refactoring without behavioral changes (e.g., `refactor/directory-sync`)
  - `test/` - Adding or improving automated tests (e.g., `test/audit-signing-verification`)
  - `ci/` - Continuous integration or deployment workflow updates (e.g., `ci/github-actions-env`)

### Commit Message Standards

Commit messages must follow the **Conventional Commits** specification:

```
<type>(<optional-scope>): <description in imperative mood>

[optional body]

[optional footer(s)]
```

Common types in the repository include: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, and `ci`.

Examples from repository history:
- `feat(core): resolve technical debt, harden security, bound queries`
- `fix(dev): resolve dev server proxy routing and container startup dependency sync`
- `docs(guidelines): add system startup and cloudflare tunnel hot reload directive to AGENTS.md`
- `test(api): declare AUDIT_SIGNING_KEY in turbo globalEnv and stabilize audit test async wait`
- `ci: inject fail-fast database and secret environment variables in CI workflow`

## Pull Request Process

Follow these steps when contributing code to UIMS:

1. **Create a Feature Branch**:
   Check out `main`, ensure your local copy is up to date, and create a branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```

2. **Develop and Commit**:
   Make focused changes, following the Biome and ESLint guidelines. Commit with Conventional Commit messages:
   ```bash
   git commit -m "feat(module): add new resource management endpoint"
   ```

3. **Validate Locally**:
   Run the full suite of local verification commands before pushing your branch:
   ```bash
   # Check formatting with Biome
   pnpm run format:check

   # Run linters across workspaces
   pnpm run lint

   # Verify TypeScript types across all workspaces
   pnpm run typecheck

   # Run automated test suites
   pnpm run test
   ```

4. **Push and Open a Pull Request**:
   Push your branch to GitHub and open a Pull Request targeting the `main` branch:
   - Provide a clear, descriptive title following Conventional Commit conventions.
   - Summarize the motivation, architectural changes, and testing performed.
   - Reference any relevant issues or tickets.

5. **Code Review & CI Verification**:
   - Automated CI workflows verify formatting, linting, type checks, and tests.
   - Address any review feedback or questions from team members.

6. **Merge**:
   Once all required CI checks pass and reviews are approved, the Pull Request is merged into `main`.

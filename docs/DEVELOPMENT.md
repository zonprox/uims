<!-- generated-by: gsd-doc-writer -->

# UIMS Development Guide

This document outlines the development workflow, setup, and conventions for the UIMS project.

## Local Setup

Follow these steps to set up the UIMS project locally:

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd uims
   ```

2. **Install dependencies:**
   UIMS uses `pnpm` as the package manager (v11.21.0 or higher).
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Copy the example environment file and configure it as needed.
   ```bash
   cp .env.example .env
   ```
   The `.env.example` provides default values for development, including Database (PostgreSQL), Redis, MeiliSearch, and SeaweedFS (S3-compatible) services.

4. **Start local infrastructure:**
   Use Docker Compose to spin up the required local services:
   ```bash
   pnpm run docker:dev
   ```

5. **Initialize the database:**
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   pnpm run db:seed
   ```

6. **Start the development servers:**
   ```bash
   pnpm run dev
   ```

## Build Commands

The project uses Turborepo for monorepo task orchestration. Here are the available scripts in the root `package.json`:

| Command | Description |
|---|---|
| `pnpm run dev` | Starts the development server for all apps using Turborepo. |
| `pnpm run dev:api` | Starts only the API development server. |
| `pnpm run dev:web` | Starts only the Web development server. |
| `pnpm run build` | Builds all apps and packages in the monorepo. |
| `pnpm run build:api` | Builds only the API app. |
| `pnpm run build:web` | Builds only the Web app. |
| `pnpm run lint` | Runs the linter across the project. |
| `pnpm run lint:fix` | Runs the linter and automatically fixes issues. |
| `pnpm run format` | Formats all code using Biome. |
| `pnpm run format:check` | Checks code formatting without modifying files. |
| `pnpm run test` | Runs unit tests across the monorepo. |
| `pnpm run test:e2e` | Runs end-to-end tests. |
| `pnpm run typecheck` | Runs TypeScript type checking without emitting files. |
| `pnpm run db:generate` | Generates the Prisma client. |
| `pnpm run db:migrate` | Runs Prisma database migrations in development. |
| `pnpm run db:migrate:prod` | Deploys Prisma database migrations in production. |
| `pnpm run db:seed` | Seeds the database with initial data. |
| `pnpm run db:studio` | Opens Prisma Studio to view and edit data. |
| `pnpm run docker:up` | Starts Docker services in the background. |
| `pnpm run docker:down` | Stops Docker services. |
| `pnpm run docker:build` | Builds Docker images for the services. |
| `pnpm run docker:logs` | Follows logs for Docker services. |
| `pnpm run docker:dev` | Starts development Docker services (with `docker-compose.dev.yml`). |
| `pnpm run docker:dev:down` | Stops development Docker services. |
| `pnpm run docker:dev:logs` | Follows logs for development Docker services. |
| `pnpm run clean` | Cleans build artifacts and removes `node_modules`. |

### App-Specific Scripts

**API (`@uims/api`)**
- `dev`: Runs TypeScript compilation in watch mode and nodemon.
- `lint`: Uses ESLint for `src/**/*.ts`.
- `test`: Uses Vitest.

**Web (`@uims/web`)**
- `dev`: Starts the Vite development server.
- `build`: Runs `tsc` and `vite build`.
- `preview`: Previews the Vite production build locally.
- `lint`: Uses ESLint for `src/**/*.{ts,tsx}`.
- `test`: Uses Vitest.

## Code Style

UIMS utilizes **Biome** for fast formatting and linting, supplemented by ESLint in the apps.

- **Formatter (Biome)**: Configured to use spaces (width: 2), 100 max line width, single quotes for JavaScript, trailing commas (all), and mandatory semicolons.
- **Linter (Biome)**: The `recommended` preset is enabled, along with warnings for cognitive complexity, missing non-null assertions, and explicit `any` usage.

To format your code:
```bash
pnpm run format
```

To run linting checks:
```bash
pnpm run lint
```

## Branch Conventions

- **Default Branch**: `main`
- **Branch Naming**: Use descriptive prefixes for branch names:
  - `feat/` - For new features
  - `fix/` - For bug fixes
  - `chore/` - For maintenance tasks (e.g., dependency updates)
  - `docs/` - For documentation updates
  - `refactor/` - For code refactoring

## PR Process

1. **Branching**: Create a new branch from `main` following the naming conventions above.
2. **Commit Messages**: Write clear, descriptive commit messages.
3. **Testing**: Ensure all linting checks, type checks, and tests pass locally:
   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm run test
   ```
4. **Pull Request**: Open a Pull Request against the `main` branch. Provide a clear description of the changes.
5. **Review**: Wait for code review from the maintainers. Address any feedback.
6. **Merge**: Once approved, the PR will be merged into `main`.

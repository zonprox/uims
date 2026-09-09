<!-- generated-by: gsd-doc-writer -->
# UIMS — Unified IT Management System

UIMS is a monorepo containing the Unified IT Management System. It consists of a NestJS backend API and a React (Ant Design) web frontend, built with Turborepo and pnpm.

## Tech Stack

- **Runtime:** Node.js 22+ (`engines: >=22.0.0`)
- **Package Manager:** pnpm 11+ (`pnpm@11.21.0`)
- **Monorepo Tooling:** Turborepo (`^2.10.12`)
- **Backend:** NestJS 11, Prisma 7, PostgreSQL 17, Redis 8, BullMQ 6, Pino 10, Helmet 8, Swagger / OpenAPI
- **Frontend:** React 19, Ant Design 6.6, Vite 8, Zustand 5, TanStack Query 5, React Router 8, Socket.io Client 4
- **Shared Libraries & Tooling:** Biome 2.5 (formatting), Vitest 5, Playwright 1.63, TypeScript 7, Zod 4
- **Infrastructure & Storage:** MeiliSearch (Search), SeaweedFS (S3-compatible object storage)

## Modules Overview

### Apps
- **`apps/api`**: NestJS backend application providing the REST API (under `/api/v1`), Swagger documentation (`/api/v1/docs`), and WebSockets.
  - **Modules**: `assets`, `audit`, `auth`, `dashboard`, `directory`, `health`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `roles`, `search`, `settings`, `users`.
- **`apps/web`**: React-based frontend web application using Ant Design and Vite.
  - **Pages**: `access`, `assets`, `audit`, `auth`, `dashboard`, `directory`, `inventory`, `licenses`, `network`, `notifications`, `organization`, `reports`, `settings`, `users`.
  - **State Stores**: `auth.store.ts`, `notification-settings.store.ts`, `theme.store.ts`, `timezone.store.ts`.

### Packages (Shared)
- **`packages/shared-types`**: Shared TypeScript definitions and interfaces.
- **`packages/shared-validators`**: Zod validation schemas.
- **`packages/shared-utils`**: Common utility functions.
- **`packages/eslint-config`**: Shared ESLint configuration for the workspace.

## Installation

Ensure you have Node.js 22+ and pnpm 11+ installed.

```bash
# Clone the repository
git clone <repository-url> uims
cd uims

# Install dependencies
pnpm install
```

## Quick Start

The quickest way to get the full stack running locally is using Docker Compose.

### 1. Configure Environment Variables

```bash
# Setup environment variables
cp .env.example .env
```

> [!NOTE]
> - By default, `.env.example` specifies `APP_PORT=3000` for the API and `WEB_PORT=5679` for the web frontend.
> - In `docker-compose.yml`, PostgreSQL maps to host port `${DATABASE_PORT:-5433}:5432` to avoid conflicts with local PostgreSQL instances. If running the backend locally against Docker backing services, ensure your `DATABASE_URL` in `.env` connects via port `5433` (e.g. `DATABASE_PORT=5433`).
> - Redis host port defaults to `6381` in `docker-compose.yml` (`${REDIS_PORT:-6381}:6379`).

### 2. Start Services

#### Option A: Run Full Stack via Docker

```bash
# Start infrastructure, API, and Web frontend in Docker dev mode
pnpm run docker:dev
```

#### Option B: Run Backing Infrastructure in Docker, Applications Locally

```bash
# 1. Start backing services (PostgreSQL, Redis, MeiliSearch, SeaweedFS)
pnpm run docker:up

# 2. Generate Prisma client and run database migrations
pnpm run db:generate
pnpm run db:migrate

# 3. (Optional) Seed initial database data
pnpm run db:seed

# 4. Start all applications in development mode
pnpm run dev
```

### Application URLs

Once running, the services are available at:
- **Web App**: `http://localhost:5679`
- **API**: `http://localhost:3000` (or configured `APP_PORT`)
- **API Documentation (Swagger)**: `http://localhost:3000/api/v1/docs`
- **MeiliSearch**: `http://localhost:7700`
- **SeaweedFS S3 Gateway**: `http://localhost:8333`

### Common Commands

From the root directory, you can run the following Turborepo and workspace commands:

| Command | Description |
| --- | --- |
| `pnpm run dev` | Starts all applications in development mode |
| `pnpm run dev:api` | Starts only the API in development mode |
| `pnpm run dev:web` | Starts only the Web frontend in development mode |
| `pnpm run build` | Builds all apps and packages |
| `pnpm run build:api` | Builds the API package |
| `pnpm run build:web` | Builds the Web application |
| `pnpm run lint` | Lints the codebase |
| `pnpm run lint:fix` | Lints and automatically fixes issues |
| `pnpm run format` | Formats code using Biome |
| `pnpm run format:check` | Checks formatting with Biome |
| `pnpm run test` | Runs unit and integration tests across the monorepo |
| `pnpm run test:e2e` | Runs Playwright end-to-end tests |
| `pnpm run typecheck` | Type-checks TypeScript across all workspaces |
| `pnpm run db:generate` | Generates Prisma client |
| `pnpm run db:migrate` | Runs database migrations for development |
| `pnpm run db:migrate:prod` | Applies database migrations in production (`prisma migrate deploy`) |
| `pnpm run db:seed` | Seeds database with initial data |
| `pnpm run db:studio` | Opens Prisma Studio GUI |
| `pnpm run docker:up` | Starts backing services in the background |
| `pnpm run docker:down` | Stops backing services |
| `pnpm run docker:build` | Builds Docker images |
| `pnpm run docker:logs` | Follows Docker service logs |
| `pnpm run docker:dev` | Starts full development stack in Docker |
| `pnpm run docker:dev:down` | Stops the Docker development environment |
| `pnpm run docker:dev:logs` | Follows Docker development environment logs |
| `pnpm run clean` | Cleans build artifacts and removes root `node_modules` |

## Usage Examples

Once the application is running, you can access the frontend via the provided Web App URL to manage IT assets, inventory, licenses, network infrastructure, and system configurations. The API provides endpoints for external integrations and background task management.

- **Frontend Dashboard:** Navigate to `http://localhost:5679` and log in with your credentials to access the IT management dashboard.
- **API Documentation (Swagger):** Navigate to `http://localhost:3000/api/v1/docs` (or your configured `APP_PORT`) to view and test available REST API endpoints interactively.

## Contributing

We welcome contributions to UIMS! Please ensure all code changes pass the standard build, formatting, and linting checks (`pnpm run format` and `pnpm run lint`) prior to submitting a pull request. If you are fixing a bug or adding a feature, please provide appropriate documentation updates.

## License

UNLICENSED

<!-- generated-by: gsd-doc-writer -->
# UIMS — Unified IT Management System

UIMS is a monorepo containing the Unified IT Management System. It consists of a NestJS backend API and a React (Ant Design) web frontend, built with Turborepo and pnpm.

## Tech Stack

- **Runtime:** Node.js 22+
- **Package Manager:** pnpm
- **Monorepo Tooling:** Turborepo
- **Backend:** NestJS, Prisma, PostgreSQL, Redis, BullMQ
- **Frontend:** React 19, Ant Design 6, Vite
- **Infrastructure:** MeiliSearch (Search), SeaweedFS (S3-compatible storage)

## Modules Overview

### Apps
- **`apps/api`**: NestJS backend application providing the REST and WebSockets API.
- **`apps/web`**: React-based frontend web application using Ant Design.

### Packages (Shared)
- **`packages/shared-types`**: Shared TypeScript definitions.
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

```bash
# 1. Setup environment variables
cp .env.example .env

# 2. Start the infrastructure and development servers via Docker
pnpm run docker:dev

# Alternatively, run infrastructure only and servers locally:
pnpm run docker:up
pnpm run db:generate
pnpm run db:migrate
pnpm run dev
```

The applications will be available at:
- **Web App**: `http://localhost:5679`
- **API**: `http://localhost:3000` (or `http://localhost:3002` based on `.env`)

### Common Commands

From the root directory, you can run the following Turborepo commands:

- `pnpm run dev`: Starts all applications in development mode.
- `pnpm run build`: Builds all apps and packages.
- `pnpm run lint`: Lints the codebase.
- `pnpm run format`: Formats code using Biome.
- `pnpm run test`: Runs tests across the monorepo.
- `pnpm run docker:dev:down`: Stops the Docker development environment.

## Usage Examples

Once the application is running, you can access the frontend via the provided Web App URL to manage IT assets, tickets, and configurations. The API provides endpoints for external integrations and background task management.

- **Frontend Dashboard:** Navigate to `http://localhost:5679` and log in with your credentials to access the IT management dashboard.
- **API Documentation (Swagger):** Navigate to `http://localhost:3000/api/v1/docs` (or your configured API port) to view and test available REST API endpoints interactively.

## Contributing

We welcome contributions to UIMS! Please ensure all code changes pass the standard build, formatting, and linting checks (`pnpm run format` and `pnpm run lint`) prior to submitting a pull request. If you are fixing a bug or adding a feature, please provide appropriate documentation updates.

## License

UNLICENSED

# Technology Stack

**Analysis Date:** 2026-09-09

## Platform Requirements

### Development Environment
The monorepo enforces a strict development environment to ensure consistency across all developer machines and CI pipelines.
- **Node.js**: The system strictly requires Node.js `>=22.0.0`. This is strictly enforced in the `engines` field of the root `package.json`. Developers should use `nvm` or `fnm` to manage this.
- **Package Manager**: The project exclusively uses `pnpm` (version `>=11.0.0`, specifically testing against `11.21.0`). npm and yarn are discouraged and will fail the engine check.
- **Monorepo Tool**: Turborepo (`turbo` v2.10.12) is utilized to manage the workspace, providing caching and pipeline execution. It drastically speeds up build times by utilizing local caching.
- **Docker**: Local development relies heavily on Docker and Docker Compose. `docker-compose.yml` and `docker-compose.dev.yml` must be used to spin up the backing services (PostgreSQL, Redis, Meilisearch, SeaweedFS) before running the applications locally.

### Production Environment
- **Node.js Environment**: The production runtime targets Node 22+ for server-side execution.
- **Containers**: Production deployment relies entirely on Docker containers for both the API and Web applications. See `apps/api/Dockerfile` and `apps/web/Dockerfile` for the multi-stage build processes that minimize the final image size.
- **Database**: PostgreSQL 17 (alpine image in Docker).
- **Cache/Broker**: Redis 8 (alpine image in Docker).

## Runtime

- **Node.js Environment**: Configured dynamically. `NODE_ENV=production` is used in the `docker-compose.yml` for API containers to ensure optimized execution (disabling debug logs, enabling prod mode in React, etc).
- **Lockfile Status**: The lockfile `pnpm-lock.yaml` (lockfileVersion: '9.0') is present at the root of the repository. It manages exact dependency trees and ensures deterministic builds across all workspaces. This file should never be manually edited.
- **Workspace Tooling**: `pnpm-workspace.yaml` maps the monorepo structure, specifically including the `apps/*` and `packages/*` directories.

## Configuration

### Environment Variables
- **Loading Mechanism**: The NestJS application uses the `@nestjs/config` `ConfigModule` to parse and validate environment variables dynamically at startup.
- **Key Variables**: Standard variables include `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `S3_ENDPOINT`, and `MEILISEARCH_API_KEY`.
- **Locations**: Stored in `.env` and `.env.example` at the repository root, as well as `apps/api/.env`. These files are explicitly ignored by `.gitignore`.

### Build Configurations
- **TypeScript**: The root `tsconfig.json` provides the baseline configuration. Each application and shared package extends this or implements its own (e.g., `apps/api/tsconfig.json`, `packages/shared-types/tsconfig.json`). Shared packages build using the standard `tsc` compiler.
- **NestJS**: The API leverages `nest-cli.json` and standard `tsc` for building the production artifacts into the `dist/` directory.
- **Vite**: The frontend web application is bundled using `vite.config.ts` powered by Vite v8.2.2. It utilizes `@vitejs/plugin-react` for React support.

### Turborepo Pipeline
- **Definition**: The pipeline is defined in `turbo.json` at the root.
- **Tasks**: It contains optimized tasks for `build`, `dev`, `lint`, `test`, and `typecheck`. Each task defines its outputs and inputs for maximum caching efficiency.
- **Usage**: npm scripts heavily utilize turbo filters. For example, `turbo run dev --filter=@uims/api` scopes execution to only the API application and its internal dependencies.

## Key Dependencies

### Infrastructure & Framework
- **Backend Framework**: NestJS v11.2.3 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`). Used for robust, structured backend architecture.
- **Object Relational Mapper**: Prisma ORM v7.10.0 (`@prisma/client`, `@prisma/adapter-pg`). Provides type-safe database access.
- **Frontend Framework**: React v19.2.8 (with `react-dom`).
- **Frontend Build Tool**: Vite v8.2.2 (`@vitejs/plugin-react` v6.1.1).

### Critical Utilities
- **Validation & Transformation**:
  - `zod` (v4.5.4) is used for robust runtime schema validation across both frontend and backend.
  - `class-validator` (v0.15.1) and `class-transformer` (v0.5.1) are used heavily in NestJS for DTO class validation and transformation, parsing incoming HTTP requests.
- **Security & Headers**:
  - `helmet` (v8.3.0) secures the Express application by setting various HTTP response headers.
  - `bcrypt` (v6.0.0) is utilized for secure password hashing.
  - `passport` (v0.7.0) and `passport-jwt` (v4.0.1) provide the core authentication strategies.
- **Performance & Optimization**:
  - `compression` (v1.8.1) is implemented for HTTP response compression, reducing payload sizes.
  - `@nestjs/throttler` (v6.5.0) provides rate limiting capabilities to protect API endpoints against abuse and brute-force attacks.
- **Logging & Monitoring**:
  - `pino` (v10.3.1) and `pino-http` (v11.0.0) handle structured, highly performant logging. While `nestjs-pino` is omitted from the `package.json`, `pino-http` directly integrates with the NestJS middleware chain.
- **Task Queues**:
  - `bullmq` (v6.3.4) and `@nestjs/bullmq` (v11.0.5) manage background job processing, recurring tasks, and delayed job execution using Redis.
- **Real-time Communication**:
  - `socket.io` (v4.8.3) and `@nestjs/platform-socket.io` / `@nestjs/websockets` facilitate bidirectional communication between the client and server.
- **Ecosystem Gaps (Notes)**: As of the current `package.json` state, `ldapjs`, `sharp`, `exceljs`, and `nodemailer` are conspicuously missing. While database schemas (like `DirectorySource.LDAP`) imply these features exist or are planned, their dependencies are not yet installed in the current environment snapshot.

## Shared Packages

The monorepo contains a set of internal shared packages used by both the `api` and `web` applications to ensure consistency and code reuse across the stack:
- **`@uims/eslint-config`** (Version `1.0.0`): Provides shared ESLint configuration rules enforced across all workspaces to maintain code consistency.
- **`@uims/shared-types`** (Version `1.0.0`): Contains shared TypeScript interfaces, types, and enums, ensuring the frontend and backend agree on data structures (e.g., API response types).
- **`@uims/shared-validators`** (Version `1.0.0`): Houses shared Zod validation schemas to unify validation logic on the client and server, preventing duplication.
- **`@uims/shared-utils`** (Version `1.0.0`): Contains shared helper functions, date formatters, string manipulators, and standard utilities.

## Frontend Stack Specifics

- **UI Component Library**: Ant Design v6.6.3 (`antd`), supplemented heavily by `@ant-design/pro-components` v2.8.10 for complex data tables, forms, and enterprise layouts.
- **State Management**: `zustand` v5.0.15 is used for global state management, replacing older Redux patterns with a simpler, hook-based approach.
- **Data Fetching**: `@tanstack/react-query` v5.102.8 provides robust async state management, caching, and polling, communicating with the backend via `axios` v1.20.0.
- **Routing**: Client-side routing is handled by `react-router` v8.3.1.
- **Icons & Typography**: Visuals are powered by `@ant-design/icons` v6.3.4 and the `@fontsource/inter` / `@fontsource-variable/inter` v5.3.0 font packages.
- **Utilities**: `dayjs` v1.11.23 handles all complex date manipulations, while `jsqr` v1.4.0 is present for QR code processing within the UI.

## Quality Assurance & Testing

- **Linting**: ESLint v10.10.0 is utilized across all packages to maintain strict code quality standards.
- **Formatting**: Biome v2.5.12 (`@biomejs/biome`) is used exclusively for lightning-fast code formatting. Prettier has been completely removed in favor of Biome.
- **Unit Testing**: Vitest v5.0.0 acts as the primary test runner for unit and integration tests across both the frontend and backend, providing high speed and native TypeScript support.
- **E2E Testing**: Playwright v1.63.0 (`@playwright/test`) is configured for comprehensive end-to-end browser testing, simulating real user interactions against the fully built application.

*Stack analysis: 2026-09-09*

### Core API Dependencies (Snapshot)
```json
{
  "dependencies": {
    "@nestjs/bullmq": "^11.0.5",
    "@nestjs/common": "^11.2.3",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.2.3",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.2.3",
    "@nestjs/platform-socket.io": "^11.2.3",
    "@nestjs/schedule": "^6.1.3",
    "@nestjs/swagger": "^11.4.7",
    "@nestjs/throttler": "^6.5.0",
    "@nestjs/websockets": "^11.2.3",
    "@prisma/adapter-pg": "^7.10.0",
    "bcrypt": "^6.0.0",
    "bullmq": "^6.3.4",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "compression": "^1.8.1",
    "cookie-parser": "^1.4.7",
    "helmet": "^8.3.0",
    "ioredis": "^6.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "pg": "^8.23.0",
    "pino": "^10.3.1",
    "pino-http": "^11.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "socket.io": "^4.8.3",
    "zod": "^4.5.4"
  }
}
```

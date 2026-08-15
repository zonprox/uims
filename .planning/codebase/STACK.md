# Technology Stack

**Analysis Date:** 2026-08-15

## Languages

**Primary:**
- TypeScript 7.0.2 / 5.9.3 - Used for full-stack codebase including backend API (`apps/api/src/`), frontend web application (`apps/web/src/`), and shared workspace libraries (`packages/shared-types/src/`, `packages/shared-validators/src/`, `packages/shared-utils/src/`). Strict typing enabled across all packages.

**Secondary:**
- JavaScript (ESM / CJS) - Used for workspace configuration, ESLint rules, and end-to-end testing scripts (`packages/eslint-config/index.js`, `scripts/test-login.mjs`, `scripts/test-responsive.mjs`).
- SQL (PostgreSQL Dialect) - Used for database bootstrap scripts, database migrations, and schema extensions (`docker/postgres/init.sql`, `apps/api/prisma/migrations/`).
- HTML / CSS - Application entry point and global layout styles (`apps/web/index.html`, `apps/web/src/styles/`).

## Runtime

**Environment:**
- Node.js >= 22.0.0 (Node 22 LTS in `apps/api/Dockerfile` and `apps/web/Dockerfile`, Node 24 LTS target specified in `README.md`, verified via `package.json` engines field).

**Package Manager:**
- pnpm 11.21.0 - Configured monorepo package manager using workspace protocol (`package.json`, `pnpm-workspace.yaml`).
- Lockfile: Present (`pnpm-lock.yaml`).

## Frameworks

**Core:**
- NestJS 11.1.29 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) - Enterprise backend application framework implementing modular architecture, dependency injection, and REST controllers (`apps/api/src/app.module.ts`, `apps/api/src/main.ts`).
- React 19.2.8 (`react`, `react-dom`) - Frontend UI rendering engine (`apps/web/src/main.tsx`).
- React Router 8.3.0 (`react-router`) - Client-side SPA routing, lazy route loading, and route protection (`apps/web/src/app/App.tsx`).
- Ant Design 6.6.0 (`antd`, `@ant-design/icons`, `@ant-design/pro-components`) - Enterprise UI component suite providing forms, data tables, modals, navigation menus, and themes (`apps/web/src/layouts/`, `apps/web/src/pages/`).
- TanStack Query 5.101.4 (`@tanstack/react-query`, `@tanstack/react-query-devtools`) - Asynchronous server-state management, query caching, background polling, and mutation hooks (`apps/web/src/hooks/`, `apps/web/src/services/`).
- Zustand 5.0.15 (`zustand`) - Lightweight client-side state store for user authentication session and UI theme mode (`apps/web/src/stores/auth.store.ts`, `apps/web/src/stores/theme.store.ts`).

**Testing:**
- Vitest 4.1.10 (`vitest`) - High-speed unit and integration test runner for backend (`apps/api/vitest.config.mts`), frontend (`apps/web/vitest.config.ts`), and shared packages (`packages/shared-validators/`, `packages/shared-utils/`).
- Happy DOM 20.11.2 (`happy-dom`) - Lightweight DOM environment for React frontend unit tests (`apps/web/vitest.config.ts`).
- @nestjs/testing 11.1.29 (`@nestjs/testing`) - Mocking and testing utilities for NestJS modules, controllers, and services (`apps/api/src/**/*.spec.ts`).
- Playwright 1.50.0 (`@playwright/test`, `playwright`) - Cross-browser end-to-end integration and smoke testing (`package.json`).

**Build/Dev:**
- Turborepo 2.10.9 (`turbo`) - High-performance monorepo build system and task pipeline orchestrator (`turbo.json`).
- Vite 8.2.1 (`vite`, `@vitejs/plugin-react`) - Frontend development server with instant Hot Module Replacement (HMR) and optimized Rollup production bundler with vendor chunk splitting (`apps/web/vite.config.ts`).
- tsdown 0.22.14 (`tsdown`) - Fast ESBuild-powered bundler generating ESM and TypeScript definition (.d.mts) bundles for internal workspace packages (`packages/shared-types/package.json`, `packages/shared-validators/package.json`, `packages/shared-utils/package.json`).
- @nestjs/cli 11.0.24 (`@nestjs/cli`) - NestJS compiler and scaffolding CLI (`apps/api/nest-cli.json`).
- tsx 4.19.3 (`tsx`) - TypeScript execution engine used for Prisma seed execution and database scripting (`apps/api/prisma.config.ts`).
- Biome 2.5.8 (`@biomejs/biome`) - Fast Rust-based linter and code formatter (`biome.json`).
- ESLint 10.8.1 (`eslint`, `@uims/eslint-config`) - Static analysis rules for TypeScript and React (`packages/eslint-config/index.js`).

## Key Dependencies

**Critical:**
- `@prisma/client` ^7.9.1 & `prisma` ^7.9.1 - Type-safe database ORM and migration tool (`apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`).
- `@prisma/adapter-pg` ^7.9.1 & `pg` ^8.13.3 - PostgreSQL adapter and connection pool driver for Prisma 7 (`apps/api/src/database/prisma.service.ts`).
- `zod` ^3.25.76 - Runtime schema declaration and data validation shared across frontend, backend, and validation packages (`packages/shared-validators/src/`).
- `passport` ^0.7.0 & `passport-jwt` ^4.0.1 - Authentication middleware and JWT validation strategy (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`).
- `@nestjs/jwt` ^11.0.2 - JSON Web Token generation, signing, and verification (`apps/api/src/modules/auth/auth.module.ts`).
- `bcrypt` ^6.0.0 - Cryptographic password hashing for user accounts (`apps/api/src/modules/auth/auth.service.ts`).
- `axios` ^1.19.0 - HTTP client with request interceptors for auth headers and response interceptors for silent token refresh (`apps/web/src/services/api.ts`).
- `dayjs` ^1.11.21 - Date and time parsing, formatting, and duration utilities (`packages/shared-utils/src/format.ts`).

**Infrastructure:**
- `bullmq` ^6.1.1 & `@nestjs/bullmq` ^11.0.5 - Redis-backed job queue for background tasks and asynchronous operations (`apps/api/package.json`).
- `ioredis` ^6.0.0 - High-performance Redis client for caching and session state (`apps/api/package.json`).
- `@nestjs/websockets` ^11.1.29 & `@nestjs/platform-socket.io` ^11.1.29 - Real-time WebSocket gateway communication (`apps/api/package.json`).
- `@nestjs/throttler` ^6.5.0 - Rate limiting guard protecting API routes against abuse (`apps/api/src/app.module.ts`).
- `helmet` ^8.3.0 - Security middleware setting HTTP response headers (`apps/api/src/main.ts`).
- `compression` ^1.8.1 - Gzip HTTP response compression (`apps/api/src/main.ts`).
- `cookie-parser` ^1.4.7 - Cookie header parsing middleware (`apps/api/src/main.ts`).
- `@nestjs/swagger` ^11.4.6 - Automatic OpenAPI 3.0 documentation and Swagger UI at `/api/v1/docs` (`apps/api/src/main.ts`).
- `pino` ^10.3.1 & `pino-http` ^11.0.0 - High-performance structured JSON logger (`apps/api/package.json`).
- `@fontsource/inter` ^5.3.0 & `@fontsource-variable/inter` ^5.3.0 - Self-hosted Inter font package for frontend UI typography (`apps/web/src/styles/`).

## Configuration

**Environment:**
- Monorepo root `.env` (derived from `.env.example`) supplies configuration for all services and Docker containers.
- Backend configuration parsed and validated at startup using Zod schema in `apps/api/src/config/app.config.ts`.
- Required environment variables include: `NODE_ENV`, `PORT`, `APP_PORT`, `WEB_PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.

**Build:**
- Monorepo orchestration: `turbo.json`, `pnpm-workspace.yaml`, `package.json`.
- Backend build: `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/prisma.config.ts`.
- Frontend build: `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`.
- Shared packages build: `packages/shared-types/package.json`, `packages/shared-validators/package.json`, `packages/shared-utils/package.json`.
- Code standard configs: `biome.json`, `packages/eslint-config/index.js`, `apps/api/eslint.config.mjs`, `apps/web/eslint.config.mjs`.

## Platform Requirements

**Development:**
- Operating System: Linux, macOS, or Windows with WSL2.
- Node.js >= 22.0.0 (Node 22 LTS or Node 24 LTS).
- pnpm >= 11.0.0.
- Docker Engine & Docker Compose (v2) for backing services (`docker-compose.yml`, `docker-compose.dev.yml`).
- Port allocations:
  - `3002`: API Server (`apps/api`)
  - `5679`: Web Frontend (`apps/web`)
  - `5433`: PostgreSQL Database (`postgres`)
  - `6381`: Redis Cache (`redis`)
  - `7700`: MeiliSearch Search Engine (`meilisearch`)
  - `8333`: SeaweedFS S3 Filer Gateway (`seaweedfs-filer`)
  - `8888` / `9333` / `8080`: SeaweedFS Filer / Master / Volume

**Production:**
- Deployment target: Multi-container Docker deployment orchestrated via Docker Compose (`docker-compose.yml`) or Kubernetes.
- Reverse proxy / Web server: Nginx Alpine container (`docker/nginx/nginx.conf`) providing TLS 1.2/1.3 SSL termination, gzip compression, security headers, static asset caching, and `/api/` reverse proxy to API container.
- Backend API runner: Lightweight Alpine Node.js 22 container running unprivileged under user `node` (`apps/api/Dockerfile`).
- Database: PostgreSQL 17+ with `uuid-ossp`, `pg_trgm`, and `citext` extensions initialized via `docker/postgres/init.sql`.

---

*Stack analysis: 2026-08-15*

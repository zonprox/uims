# Technology Stack

**Analysis Date:** 2026-08-14

## Languages

**Primary:**
- TypeScript 5.9.3 / 7.0.2 - All backend (`apps/api`), frontend (`apps/web`), and shared packages (`packages/*`)

**Secondary:**
- SQL - PostgreSQL init scripts and Prisma migrations (`docker/postgres/init.sql`, `apps/api/prisma/migrations/`)
- JavaScript (Node.js ESM/CJS) - Build tools, ESLint configs, helper scripts (`scripts/*.mjs`, `packages/eslint-config/index.js`)
- HTML5 / CSS3 - Web shell and global CSS tokens (`apps/web/index.html`, `apps/web/src/styles/global.css`)
- YAML - Docker Compose definitions (`docker-compose.yml`, `docker-compose.dev.yml`), pnpm workspace (`pnpm-workspace.yaml`), CI workflows

## Runtime

**Environment:**
- Node.js >= 22.0.0 (LTS)
- Browser runtime (Modern evergreen browsers supporting ES2022+ and Web Storage API)

**Package Manager:**
- pnpm 11.21.0 in workspace monorepo layout
- Lockfile: `pnpm-lock.yaml` present and enforced

## Frameworks

**Core:**
- NestJS 11.1.29 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) - Enterprise modular backend framework for `apps/api`
- React 19.2.8 (`react`, `react-dom`) - UI library for `apps/web`
- React Router 8.3.0 (`react-router`) - Client-side SPA routing and navigation
- Ant Design 6.6.0 (`antd`, `@ant-design/pro-components`, `@ant-design/icons`) - Enterprise UI design system and components

**Testing:**
- Vitest 4.1.10 - Fast unit and integration test runner across all monorepo workspaces (`apps/api`, `apps/web`, `packages/shared-validators`, `packages/shared-utils`)
- happy-dom 20.11.2 - Lightweight DOM implementation for frontend React component unit tests
- Playwright 1.50.0 (`@playwright/test`) - End-to-end browser automation and testing harness

**Build/Dev:**
- Turborepo 2.10.9 (`turbo`) - High-performance build system and monorepo task orchestrator
- Vite 8.2.1 (`@vitejs/plugin-react`) - Next-generation frontend bundler and HMR dev server
- tsdown 0.22.14 (powered by Rolldown 1.2.4) - Ultra-fast library bundler for shared packages (`packages/shared-types`, `packages/shared-validators`, `packages/shared-utils`)
- Biome 2.5.8 (`@biomejs/biome`) - High-speed formatter and linter
- ESLint 10.8.1 (`typescript-eslint`) - Static TypeScript linting and code quality analysis

## Key Dependencies

**Critical:**
- Prisma ORM 7.9.1 (`@prisma/client`, `@prisma/adapter-pg`, `prisma`) - Type-safe database ORM and migrations
- Zustand 5.0.15 (`zustand`, `zustand/middleware`) - Lightweight client-side state management with persistence
- TanStack Query 5.101.4 (`@tanstack/react-query`) - Server state caching, asynchronous query synchronization
- Zod 3.25.76 (`zod`) - Schema declaration and validation across frontend and backend boundaries
- BullMQ 6.1.1 (`bullmq`, `@nestjs/bullmq`) - Redis-backed job queue for background tasks and asynchronous processing

**Infrastructure & Security:**
- ioredis 6.0.0 (`ioredis`) - Redis client for caching, rate limiting, and queues
- pg 8.13.3 (`pg`) - PostgreSQL database driver
- passport-jwt 4.0.1 & @nestjs/jwt 11.0.2 - JWT authentication strategy and token management
- bcrypt 6.0.0 (`bcrypt`) - Cryptographic hashing for user credentials
- helmet 8.3.0 (`helmet`) & compression 1.8.1 - HTTP security headers and response compression
- pino 10.3.1 (`pino`, `pino-http`) - Low-overhead structured JSON logging
- @nestjs/swagger 11.4.6 (`@nestjs/swagger`) - OpenAPI (Swagger) documentation generator

## Configuration

**Environment:**
- `.env` file at root loaded via dotenv / Docker Compose
- `.env.example` template with full defaults for all services
- Backend configuration validated and centralized via `apps/api/src/config/app.config.ts`

**Build:**
- `turbo.json` - Pipeline dependency graph (`build`, `dev`, `lint`, `test`, `test:e2e`)
- `pnpm-workspace.yaml` - Monorepo package boundaries (`apps/*`, `packages/*`)
- `biome.json` - Formatting and linting rules
- `tsconfig.json` across workspaces for TypeScript compilation

## Platform Requirements

**Development:**
- Linux, macOS, or Windows WSL2
- Node.js >= 22.0.0 and pnpm >= 11.0.0
- Docker & Docker Compose v2 for local services (PostgreSQL 17, Redis 8, Meilisearch, SeaweedFS)

**Production:**
- Multi-container Docker deployment (`docker-compose.yml`)
- Nginx reverse proxy with SSL termination (`docker/nginx/nginx.conf`)
- Node.js alpine container for API (`apps/api/Dockerfile`)
- Nginx static asset container for Web SPA (`apps/web/Dockerfile`)

---

*Stack analysis: 2026-08-14*
*Update after major dependency changes*

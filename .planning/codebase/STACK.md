# Technology Stack

**Analysis Date:** 2026-08-14

## Languages
**Primary:**
- TypeScript 7.0.2 / 5.9.3 - Core language across all monorepo workspaces: NestJS backend in `apps/api/`, React SPA in `apps/web/`, and shared packages in `packages/shared-types/`, `packages/shared-validators/`, `packages/shared-utils/`, and `packages/eslint-config/`.
**Secondary:**
- SQL - PostgreSQL relational schema definition, indexes, and initialization in `docker/postgres/init.sql` and `apps/api/prisma/schema.prisma`.
- HTML5 / CSS3 - Base web template in `apps/web/index.html` and Ant Design theme token styling in `apps/web/src/app/theme.ts`.
- Shell / Dockerfile - Multi-stage container builds in `apps/api/Dockerfile`, `apps/api/Dockerfile.dev`, `apps/web/Dockerfile`, `apps/web/Dockerfile.dev`, and orchestration in `docker-compose.yml`.

## Runtime
**Environment:**
- Node.js >= 22.0.0 (Target: Node 24 LTS, Docker containers run `node:22-alpine` in `apps/api/Dockerfile` and `apps/web/Dockerfile`).
**Package Manager:**
- pnpm 11.21.0 - Strict workspace dependency management configured via `package.json` (`packageManager: "pnpm@11.21.0"`) and `pnpm-workspace.yaml`.
- Lockfile: present (`pnpm-lock.yaml`).
**Monorepo Engine:**
- Turborepo 2.10.9 - Build caching and task pipeline orchestration configured in `turbo.json`.

## Frameworks
**Core:**
- NestJS 11.1.29 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) - Enterprise modular backend framework in `apps/api/src/app.module.ts`.
- React 19.2.8 (`react`, `react-dom`) - Frontend component UI library in `apps/web/src/app/App.tsx`.
- React Router 8.3.0 (`react-router`) - Client-side declarative routing in `apps/web/src/app/router.tsx`.
- Ant Design 6.6.0 (`antd`, `@ant-design/icons`, `@ant-design/pro-components`) - Design system and enterprise component library in `apps/web/src/`.
**Testing:**
- Vitest 4.1.10 (`vitest`) - Unit and integration testing runner across `apps/api/vitest.config.mts`, `apps/web/vitest.config.ts`, `packages/shared-utils/`, and `packages/shared-validators/`.
- Playwright 1.50.0 (`@playwright/test`, `playwright`) - Cross-browser end-to-end testing suite in root `package.json`.
- Happy DOM 20.11.2 (`happy-dom`) - Lightweight DOM simulator for React unit testing in `apps/web/`.
- NestJS Testing 11.1.29 (`@nestjs/testing`) - Dependency injection mocking and backend unit test harness in `apps/api/`.
**Build/Dev:**
- Vite 8.2.1 (`vite`, `@vitejs/plugin-react`) - Fast frontend dev server and production bundler in `apps/web/vite.config.ts`.
- tsdown 0.22.14 (`tsdown`) - ESM and TypeScript declaration bundler for `packages/shared-types/`, `packages/shared-validators/`, and `packages/shared-utils/`.
- Nest CLI 11.0.24 (`@nestjs/cli`) - Backend build and code generation tool in `apps/api/nest-cli.json`.
- Biome 2.5.8 (`@biomejs/biome`) - Fast code formatting and linting configured in `biome.json`.
- ESLint 10.8.1 (`eslint`, `typescript-eslint`) - Monorepo static analysis configured in `packages/eslint-config/index.js`, `apps/api/eslint.config.mjs`, and `apps/web/eslint.config.mjs`.

## Key Dependencies
**Critical:**
- Prisma ORM 7.9.1 (`@prisma/client`, `prisma`, `@prisma/adapter-pg`, `@prisma/config`) - Database access layer, schema modeling, and type-safe query generation in `apps/api/src/database/prisma.service.ts` and `apps/api/prisma/schema.prisma`.
- TanStack React Query 5.101.4 (`@tanstack/react-query`, `@tanstack/react-query-devtools`) - Asynchronous server-state management and caching in `apps/web/src/app/query-client.ts`.
- Zustand 5.0.15 (`zustand`) - Client state store for user authentication and session management in `apps/web/src/stores/auth.store.ts`.
- Zod 3.25.76 (`zod`) - Runtime schema validation across `packages/shared-validators/src/`, `apps/api/src/config/app.config.ts`, and frontend forms.
- Passport & Passport JWT 0.7.0 / 4.0.1 (`@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`) - JWT authentication guard and token strategy in `apps/api/src/modules/auth/strategies/jwt.strategy.ts`.
- Bcrypt 6.0.0 (`bcrypt`, `@types/bcrypt`) - Secure salt hashing for user passwords in `apps/api/src/modules/auth/auth.service.ts`.
- Axios 1.19.0 (`axios`) - HTTP client with request/response interceptors and automated 401 token refresh queue in `apps/web/src/services/api.ts`.
- Dayjs 1.11.21 (`dayjs`) - Lightweight date parsing, formatting, and manipulation in `packages/shared-utils/` and `apps/web/`.
**Infrastructure:**
- BullMQ 6.1.1 (`bullmq`, `@nestjs/bullmq`) - Distributed Redis-backed background job queue processor in `apps/api/package.json`.
- ioredis 6.0.0 (`ioredis`) - Redis connection driver and high-performance in-memory cache client in `apps/api/package.json`.
- Socket.IO 11.1.29 (`@nestjs/websockets`, `@nestjs/platform-socket.io`) - Real-time WebSocket communications gateway in `apps/api/package.json`.
- Pino & Pino HTTP 10.3.1 / 11.0.0 (`pino`, `pino-http`) - High-performance structured JSON logging in `apps/api/package.json`.
- Helmet 8.3.0 (`helmet`) - HTTP security headers middleware in `apps/api/src/main.ts`.
- Compression 1.8.1 (`compression`) - Gzip HTTP response payload compression middleware in `apps/api/src/main.ts`.
- Cookie Parser 1.4.7 (`cookie-parser`) - HTTP cookie parsing middleware in `apps/api/src/main.ts`.
- Swagger / OpenAPI 11.4.6 (`@nestjs/swagger`) - Automated API documentation serving at `/api/v1/docs` in `apps/api/src/main.ts`.
- Throttler 6.5.0 (`@nestjs/throttler`) - Rate limiting middleware protecting backend endpoints in `apps/api/src/app.module.ts`.

## Configuration
**Environment:**
- Environment variable schemas declared in `.env.example` and validated at API startup via Zod in `apps/api/src/config/app.config.ts`.
- Frontend environment variables loaded at build/dev time via Vite in `apps/web/vite.config.ts` from root `.env`.
- Required configurations:
  - `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public`).
  - `REDIS_URL`: Redis connection URL (e.g. `redis://:uims_redis_2026@localhost:6381`).
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`: Secrets for signing and validating JWT tokens (minimum 32 characters).
  - `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`: Token validity durations (e.g. `15m`, `7d`).
  - `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`: MeiliSearch service endpoint and master key.
  - `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`: S3-compatible object storage configuration.
  - `APP_PORT` / `PORT`: API server port (default `3000` / host `3002`).
  - `WEB_PORT`: Web application port (default `5679`).
  - `VITE_API_URL`: Frontend API proxy target / base path (`/api/v1`).
**Build:**
- Monorepo orchestration: `turbo.json` defines task pipeline dependencies (`dependsOn: ["^build"]`), cache outputs, and global environment variables.
- Package manager workspace: `pnpm-workspace.yaml` links `apps/*` and `packages/*` and allows build scripts for native modules (`@prisma/client`, `bcrypt`, `prisma`).
- Code style: `biome.json` configures 2-space indentation, 100 character line width, and single quotes.
- TypeScript configurations: Root `tsconfig.json`, `apps/api/tsconfig.json`, `apps/web/tsconfig.json`.
- Database configurations: `apps/api/prisma.config.ts` and `apps/api/prisma/schema.prisma`.
- Frontend bundler: `apps/web/vite.config.ts` with React plugin, workspace path aliases, SSL certificate support, and `/api` reverse proxy.
- Reverse proxy: `docker/nginx/nginx.conf` handles SSL/TLS termination, HTTP/2, gzip compression, security headers, and static SPA file serving.

## Platform Requirements
**Development:**
- OS: Linux, macOS, or Windows with WSL2.
- Node.js >= 22.0.0 (Node 24 LTS recommended).
- pnpm >= 11.0.0.
- Docker & Docker Compose v2 for local infrastructure services (`postgres:17-alpine`, `redis:8-alpine`, `getmeili/meilisearch`, `chrislusf/seaweedfs`).
- SSL certificates for local HTTPS development placed in `apps/web/certs/` or mounted via `docker/nginx/ssl/`.
**Production:**
- Deployment Target: Containerized multi-service architecture running on Docker Compose, Docker Swarm, or Kubernetes (OCI compliant images).
- Reverse Proxy: Nginx or Cloud Ingress controller terminating TLS 1.2/1.3 and proxying `/api/` traffic to the NestJS container.
- Database: Managed PostgreSQL 17 or 18 instance with `uuid-ossp`, `pg_trgm`, and `citext` extensions enabled.
- Cache & Queue: Redis 8 instance or cluster.
- Search Engine: MeiliSearch 1.12+ cluster.
- Object Storage: S3-compatible storage cluster (SeaweedFS, AWS S3, MinIO, or Cloudflare R2).

---
*Stack analysis: 2026-08-14*

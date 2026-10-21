---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# Technology Stack

**Analysis Date:** 2026-10-14

## Languages

**Primary:**
- TypeScript 7.0.2 - Monorepo-wide language across API, Web SPA, and shared packages (`apps/api`, `apps/web`, `packages/shared-types`, `packages/shared-validators`, `packages/shared-utils`, `packages/eslint-config`) comprising 582 TypeScript/TSX source files.

**Secondary:**
- SQL (PostgreSQL 17 Dialect) - Database schema, migrations, constraints, and composite indexes (`apps/api/prisma/migrations/`)
- Bash / Shell Scripting - Universal developer daemon orchestration and stack lifecycle management (`scripts/dev.sh`)
- Node.js ESM Scripts - Automated test orchestration and network verification runner (`scripts/run-e2e-network.mjs`)
- CSS - Global design system tokens, print stylesheet rules, typography resets, and Ant Design v6 theme variables (`apps/web/src/styles/global.css`)

## Runtime

**Environment:**
- Node.js >= 22.0.0 (Native ESM execution, Node 22+ LTS APIs, `@types/node` 26.6.5)
- Docker & Docker Compose v2+ - Containerized PostgreSQL 17, Redis 8, MeiliSearch, and SeaweedFS storage cluster (`docker-compose.yml`, `docker-compose.dev.yml`)

**Package Manager:**
- pnpm 11.21.0 - Strict workspace dependency isolation and deduplicated symlinks (`package.json`)
- Lockfile: `pnpm-lock.yaml` (synchronized and deduplicated via `pnpm dedupe`)
- Workspace Configuration: `pnpm-workspace.yaml` with build script authorization for `@prisma/client`, `bcrypt`, and `esbuild`

## Frameworks

**Core:**
- NestJS 11.2.7 - Enterprise modular monolith backend framework (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/platform-socket.io`, `@nestjs/websockets`, `@nestjs/config` 4.0.4, `@nestjs/schedule` 6.1.3, `@nestjs/throttler` 6.7.1)
- React 19.3.0 - Modern UI component library with concurrent rendering and action transitions (`react`, `react-dom`)
- Ant Design 6.6.7 - Enterprise UI component library strictly following Ant Design v6 semantic tokens (`antd` 6.6.7, `@ant-design/icons` 6.3.4, `@ant-design/cli` 6.6.7)
- React Router 8.4.0 - Declarative client-side routing with route-level code splitting and isolated leaf `RouteErrorBoundary` (`react-router`)
- Zustand 5.0.15 - Minimalist reactive client state management (`zustand`)
- TanStack React Query 5.104.1 - Asynchronous server state caching, background invalidation, and data synchronization (`@tanstack/react-query`, `@tanstack/react-query-devtools`)
- Prisma ORM 7.10.0 - Schema modeling and query engine with `@prisma/adapter-pg` driver adapter (`apps/api/prisma/schema.prisma`)

**Testing:**
- Vitest 5.0.3 - Unified high-speed test runner for Node (`apps/api/vitest.config.mts`) and Happy-DOM (`apps/web/vitest.config.ts`) across 215 test suites
- Happy-DOM 20.14.6 - Browser environment simulation for React 19 + Ant Design v6 component and adversarial tests
- Playwright 1.64.0 - End-to-end browser automation and network workflow verification (`@playwright/test`, `playwright.config.ts`)

**Build & Tooling:**
- Turborepo 2.11.7 - Build orchestrator with dependency-aware pipeline caching (`turbo.json`)
- Vite 8.3.4 - Frontend development server with native TLS/HTTPS termination on port 5679 and Hot Module Replacement (`apps/web/vite.config.ts`, `@vitejs/plugin-react` 6.1.2)
- tsdown 0.23.1 - Rolldown-powered dual-output ESM + DTS compiler for shared workspace packages (`packages/*/package.json`)
- Biome 2.5.15 - Unified code formatting engine (`@biomejs/biome`, `biome.json`)
- ESLint 10.12.0 - Static code analysis and AST linting (`packages/eslint-config`)

## Key Dependencies

**Critical:**
- `zod` 4.6.5 - Runtime schema validation across frontend forms, shared validators (`@uims/shared-validators`), environment startup checks, and backend DTOs
- `ioredis` 6.0.0 - Redis 8 client for caching, session state, and token blacklisting (`apps/api/src/common/redis/redis.service.ts`)
- `socket.io` 4.8.4 & `socket.io-client` 4.8.4 - Real-time WebSocket notifications and deep-linked system alerts (`apps/api/src/modules/notifications/notifications.gateway.ts`)
- `bcrypt` 6.0.0 - Salted multi-round cryptographic password hashing (12 rounds)
- `passport` 0.7.0 & `passport-jwt` 4.0.1 - Authentication strategies and JWT payload verification
- `@nestjs/jwt` 11.0.2 - Access and refresh token generation, verification, and rotation
- `pino` 10.4.0 & `pino-http` 11.0.0 - Low-overhead structured JSON logging
- `helmet` 8.3.0 - HTTP security header hardening
- `compression` 1.8.2 - Gzip HTTP response payload compression
- `cookie-parser` 1.4.7 - Secure HTTP cookie parsing for auth tokens
- `docx` 9.10.0 - Programmatic Microsoft Word (`.docx`) document builder for hardware asset custody handover and return minutes (`apps/api/src/modules/assets/utils/handover-document.builder.ts`)
- `exceljs` 4.4.0 - Streaming XLSX spreadsheet import and operational report export pipelines (`apps/api/src/modules/reports/reports.service.ts`)
- `axios` 1.20.0 - Frontend HTTP client with automatic JWT refresh queueing (`apps/web/src/services/api.ts`)
- `dayjs` 1.11.23 - Immutable date, relative time, and timezone manipulation library
- `jsqr` 1.4.0 - Pure TypeScript QR code decoding for camera-based and image-based asset scanning (`apps/web/src/pages/assets/utils/qrDecoder.ts`)

**Infrastructure:**
- `@prisma/adapter-pg` 7.10.0 - Direct PostgreSQL wire protocol adapter for Prisma 7 (`apps/api/src/database/prisma.service.ts`)
- `pg` 8.23.1 - PostgreSQL connection pool driver
- `@nestjs/swagger` 11.4.7 - Automated OpenAPI 3.0 documentation generator (`/api/v1/docs`)

## Configuration

**Environment:**
- Validated at startup via Zod `envSchema` (`apps/api/src/config/app.config.ts`) and NestJS `ConfigService.getOrThrow<string>()`
- Conditional production validation: `REDIS_URL` is strictly required when `NODE_ENV === 'production'` via `.superRefine()`
- Strict parameterization: Zero plaintext fallback secrets permitted in source code, `docker-compose.yml`, or `docker-compose.dev.yml`

**Build:**
- `turbo.json`: Task pipelines (`build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`) with strict dependency ordering
- `tsconfig.json`: Strict TypeScript settings (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noFallthroughCasesInSwitch: true`)
- `biome.json`: Unified formatter configuration with 2-space indentation, single quotes, and 100-character line width

## Platform Requirements

**Development:**
- Linux / macOS / WSL2 environment
- Node.js >= 22.0.0, pnpm >= 11.0.0
- Docker Engine >= 24.0.0 and Docker Compose v2+
- Port allocations: Web (5679 HTTPS), API (3002), PostgreSQL 17 (5433), Redis 8 (6381), MeiliSearch (7700), SeaweedFS (8333/8888/9333/8080)

**Production:**
- Multi-stage Docker containerization (`apps/api/Dockerfile`, `apps/web/Dockerfile`)
- Nginx reverse proxy (`docker/nginx/nginx.conf`) terminating TLS 1.2/1.3 on port 443 and proxying `/api/` and `/socket.io/` to the API service
- Orchestration: Docker Compose / Kubernetes with automated container healthcheck validation (`/api/v1/health`)

---

*Stack analysis: 2026-10-14*

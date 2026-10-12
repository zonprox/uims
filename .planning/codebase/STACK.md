---
last_mapped_commit: 513c003639d98df385b56ab541797a216524064b
last_mapped_at: 2026-10-12
---
# Technology Stack

**Analysis Date:** 2026-10-12

## Languages

**Primary:**
- TypeScript 7.0.2 - Monorepo-wide language across API, Web SPA, and shared packages (`apps/api`, `apps/web`, `packages/shared-types`, `packages/shared-validators`, `packages/shared-utils`, `packages/eslint-config`)

**Secondary:**
- SQL (PostgreSQL 17 Dialect) - Database schema, migrations, constraints, and optimized relational views (`apps/api/prisma/migrations/`)
- Bash / Shell Scripting - Universal developer daemon orchestration and stack lifecycle management (`scripts/dev.sh`)
- Node.js ESM Scripts - Automated test orchestration and network verification runner (`scripts/run-e2e-network.mjs`)
- CSS - Minimal global design system tokens, typography resets, and Ant Design v6 theme variables (`apps/web/src/styles/global.css`)

## Runtime

**Environment:**
- Node.js >= 22.0.0 (Native ESM execution, Node 22+ LTS APIs)
- Docker & Docker Compose v2+ - Containerized PostgreSQL 17, Redis 8, MeiliSearch, and SeaweedFS storage cluster

**Package Manager:**
- pnpm 11.21.0 - Strict workspace dependency isolation and deduplicated symlinks
- Lockfile: `pnpm-lock.yaml` (present, synchronized, and deduplicated)
- Workspace Configuration: `pnpm-workspace.yaml` with build script authorization for `@prisma/client`, `bcrypt`, and `esbuild`

## Frameworks

**Core:**
- NestJS 11.2.7 - Enterprise modular monolith backend framework (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`)
- React 19.3.0 - Modern UI component library with concurrent rendering and action transitions (`react`, `react-dom`)
- Ant Design 6.6.5 - Enterprise UI component library strictly following Ant Design v6 semantic tokens (`antd`, `@ant-design/icons`, `@ant-design/pro-components`)
- React Router 8.4.0 - Declarative client-side routing with route-level code splitting (`react-router`)
- Zustand 5.0.15 - Minimalist reactive client state management (`zustand`)
- TanStack React Query 5.104.1 - Asynchronous server state caching, background invalidation, and data synchronization (`@tanstack/react-query`)
- Prisma ORM 7.10.0 - Next-generation schema modeling and query engine with `@prisma/adapter-pg` driver adapter

**Testing:**
- Vitest 5.0.3 - Unified lightning-fast test runner for Node (API) and Happy-DOM (Web)
- Happy-DOM 20.14.6 - High-performance browser environment simulation for React 19 component tests
- Playwright 1.64.0 - End-to-end browser automation and network workflow test verification (`@playwright/test`)

**Build & Tooling:**
- Turborepo 2.11.7 - High-performance build orchestrator with remote-capable pipeline caching (`turbo.json`)
- Vite 8.3.4 - Frontend development server with HTTPS termination and Hot Module Replacement (HMR)
- tsdown 0.23.1 - Rolldown-powered rapid dual-output ESM + DTS compiler for shared packages
- Biome 2.5.15 - Blazing-fast code formatting engine (`@biomejs/biome`)
- ESLint 10.12.0 - Comprehensive static code analysis and AST linting (`typescript-eslint` 8.71.1)

## Key Dependencies

**Critical:**
- `zod` 4.6.5 - Runtime schema validation across frontend forms, shared validators, and backend DTOs
- `ioredis` 6.0.0 - High-performance Redis client for caching and session management
- `socket.io` 4.8.4 & `socket.io-client` 4.8.4 - Real-time WebSocket notifications and system alerts
- `bcrypt` 6.0.0 - Salted multi-round cryptographic password hashing (12 rounds)
- `passport` 0.7.0 & `passport-jwt` 4.0.1 - Decoupled authentication strategies and JWT validation
- `@nestjs/jwt` 11.0.2 - Access and refresh token generation, verification, and rotation
- `pino` 10.4.0 & `pino-http` 11.0.0 - Low-overhead structured JSON logging
- `helmet` 8.3.0 - HTTP security header hardening
- `compression` 1.8.2 - Gzip HTTP response payload compression
- `cookie-parser` 1.4.7 - Secure HTTP cookie parsing for auth tokens
- `exceljs` 4.4.0 - High-capacity XLSX spreadsheet importing and export pipelines
- `dayjs` 1.11.23 - Lightweight immutable date and timezone manipulation library
- `jsqr` 1.4.0 - Pure TypeScript QR code decoding for camera-based asset inventory scanning

**Infrastructure:**
- `@prisma/adapter-pg` 7.10.0 - Direct PostgreSQL wire protocol adapter for Prisma 7
- `pg` 8.23.1 - Low-level PostgreSQL connection pool driver
- `@nestjs/swagger` 11.4.7 - Automated OpenAPI 3.0 documentation generator

## Configuration

**Environment:**
- Validated at startup via NestJS `ConfigService.getOrThrow<string>()` and fail-fast assertions
- Root `.env` loads configuration for dev stack daemon, Docker Compose, and localized processes
- Strict parameterization: Zero plaintext fallback secrets permitted in source code or compose manifests

**Build:**
- `turbo.json`: Task pipelines (`build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`) with strict dependency ordering and environment hashing
- `tsconfig.json`: Strict TypeScript settings (`strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: bundler` / `node16`)
- `biome.json`: Unified formatter configuration with 2-space indentation and single quotes

## Platform Requirements

**Development:**
- Linux / macOS / WSL2 environment
- Node.js >= 22.0.0, pnpm >= 11.0.0
- Docker Engine >= 24.0.0 and Docker Compose v2+
- Port allocations: Web (5679 HTTPS), API (3002), PostgreSQL (5433), Redis (6381), MeiliSearch (7700), SeaweedFS (8333/8888/9333/8080)

**Production:**
- Multi-stage Docker containerization (`apps/api/Dockerfile`, `apps/web/Dockerfile`)
- Nginx reverse proxy terminating TLS on port 443 with HSTS and proxying `/api/v1` to API service
- Orchestration: Docker Compose / Kubernetes cluster with automated container healthcheck validation (`/api/v1/health`)

---

*Stack analysis: 2026-10-12*

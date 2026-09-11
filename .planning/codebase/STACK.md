# Technology Stack

**Analysis Date:** 2026-09-11

## Languages

**Primary:**
- TypeScript ^7.0.2 — All application code across API, Web, and shared packages

**Secondary:**
- SQL (PostgreSQL 17) — Database migrations and raw queries (`apps/api/prisma/migrations/`)
- Shell (Bash) — Dev stack daemon scripts (`scripts/dev.sh`)

## Runtime

**Environment:**
- Node.js >=22.0.0 (root `package.json` engines field)
- Target: ES2022 (both `apps/api/tsconfig.json` and `apps/web/tsconfig.json`)

**Package Manager:**
- pnpm 11.21.0 (`package.json` `packageManager` field)
- Lockfile: `pnpm-lock.yaml` present

**Build Orchestrator:**
- Turborepo ^2.10.12 — Monorepo pipeline orchestration (`turbo.json`)
- Tasks: `build`, `dev`, `lint`, `lint:fix`, `test`, `test:e2e`, `typecheck`, `clean`

## Frameworks

**Core:**
- NestJS ^11.2.3 — Backend REST API + WebSocket gateway (`apps/api/`)
- React ^19.2.8 — Frontend SPA framework (`apps/web/`)
- Ant Design ^6.6.3 — Enterprise UI component library (`apps/web/`)
- Ant Design Pro Components ^2.8.10 — Extended data-entry and layout components (`apps/web/`)

**Data & State:**
- Prisma ^7.10.0 — ORM with `@prisma/adapter-pg` PostgreSQL adapter (`apps/api/prisma/schema.prisma`)
- TanStack Query ^5.102.8 — Server state caching and synchronization (`apps/web/`)
- Zustand ^5.0.15 — Client-side state management (`apps/web/src/stores/`)
- Zod ^4.5.4 — Runtime schema validation (`packages/shared-validators/`)

**Testing:**
- Vitest ^5.0.0 — Unit/integration test runner (all workspaces)
- Playwright ^1.63.0 — E2E browser testing (root devDependencies)
- happy-dom ^20.14.0 — Lightweight DOM environment for component tests (`apps/web/`)
- @nestjs/testing ^11.2.3 — NestJS test module builder (`apps/api/`)

**Build/Dev:**
- Vite ^8.2.2 — Frontend bundler + HTTPS dev server (`apps/web/vite.config.ts`)
- tsc (TypeScript ^7.0.2) — API TypeScript compiler (`apps/api/`)
- tsdown ^0.23.0 — Shared package bundler (`packages/shared-types/`, `packages/shared-utils/`, `packages/shared-validators/`)
- tsx ^4.23.13 — TypeScript script execution for seeding/scripts (`apps/api/`)
- nodemon ^3.1.14 — API dev server hot reload (`apps/api/`)

**Linting/Formatting:**
- Biome ^2.5.12 — Code formatter (root `biome.json`) — indent: 2 spaces, line width: 100, single quotes, trailing commas, semicolons always
- ESLint ^10.10.0 + typescript-eslint ^8.70.0 — TypeScript linting (`packages/eslint-config/index.js`)
- eslint-config-prettier ^10.1.8 — Disables formatting rules that conflict with Biome

## Key Dependencies

**Critical (API):**
- `@nestjs/jwt` ^11.0.2 — JWT token generation/validation
- `@nestjs/passport` ^11.0.5 + `passport-jwt` ^4.0.1 — Passport JWT auth strategy
- `bcrypt` ^6.0.0 — Password hashing (salted bcrypt)
- `ioredis` ^6.0.0 — Redis client with in-memory fallback (`apps/api/src/common/redis/redis.service.ts`)
- `pg` ^8.23.0 + `@prisma/adapter-pg` ^7.10.0 — PostgreSQL native driver
- `socket.io` ^4.8.3 — WebSocket real-time notifications
- `@nestjs/schedule` ^6.1.3 — Cron-based scheduled tasks
- `@nestjs/throttler` ^6.5.0 — Rate limiting (1000 req/60s)
- `@nestjs/swagger` ^11.4.7 — OpenAPI documentation
- `bullmq` ^6.3.4 — Background job queue (via `@nestjs/bullmq` ^11.0.5)

**Critical (Web):**
- `react-router` ^8.3.1 — Client-side SPA routing
- `axios` ^1.20.0 — HTTP client for API calls
- `socket.io-client` ^4.8.3 — WebSocket client
- `dayjs` ^1.11.23 — Date manipulation
- `@ant-design/icons` ^6.3.4 — Icon library
- `jsqr` ^1.4.0 — QR code scanning

**Infrastructure (API):**
- `helmet` ^8.3.0 — Security HTTP headers (HSTS, CSP)
- `compression` ^1.8.1 — Response compression middleware
- `cookie-parser` ^1.4.7 — Cookie parsing for auth tokens
- `class-validator` ^0.15.1 + `class-transformer` ^0.5.1 — DTO validation decorators
- `exceljs` ^4.4.0 — Excel file import/export
- `rxjs` ^7.8.2 — Reactive programming (NestJS core)

## Monorepo Workspace Structure

| Workspace | Package Name | Purpose |
|-----------|-------------|---------|
| `apps/api` | `@uims/api` | NestJS 11 REST API backend |
| `apps/web` | `@uims/web` | React 19 + Ant Design v6 SPA |
| `packages/shared-types` | `@uims/shared-types` | Common TypeScript DTOs, entities, enums |
| `packages/shared-validators` | `@uims/shared-validators` | Shared Zod validation schemas |
| `packages/shared-utils` | `@uims/shared-utils` | String, date, currency, network utilities |
| `packages/eslint-config` | `@uims/eslint-config` | Shared ESLint configuration |

## Configuration

**Environment:**
- Root `.env` + `.env.example` — Parameterized environment variables
- API `.env` at `apps/api/.env` — Database, Redis, JWT, service configuration
- Required: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `AUDIT_SIGNING_KEY`
- Startup validation via Zod in `apps/api/src/config/app.config.ts`
- CORS via `CORS_ORIGIN` / `ALLOWED_ORIGINS` env vars

**Build:**
- `turbo.json` — Pipeline with dependency ordering, caching, env forwarding
- `biome.json` — Formatter + linter with recommended preset
- `apps/api/tsconfig.json` — CommonJS module, decorators, ES2022
- `apps/web/tsconfig.json` — ESNext module, bundler resolution, path aliases
- `apps/web/vite.config.ts` — HTTPS, API proxy, manual chunk splitting

**Path Aliases (Web):**
- `@/*` → `apps/web/src/*`
- `@uims/shared-types` → `packages/shared-types/src`
- `@uims/shared-validators` → `packages/shared-validators/src`
- `@uims/shared-utils` → `packages/shared-utils/src`

## Platform Requirements

**Development:**
- Node.js >=22.0.0
- pnpm >=11.0.0
- Docker + Docker Compose (PostgreSQL 17, Redis 8, MeiliSearch, SeaweedFS)
- Self-signed TLS certs in `apps/web/certs/` for HTTPS dev server on port 5679
- Cloudflare Tunnel (`cloudflared`) for public URL exposure

**Production:**
- Docker Compose containerized deployment
- PostgreSQL 17, Redis 8, MeiliSearch, SeaweedFS
- Nginx TLS termination (`docker/nginx/`)

---

*Stack analysis: 2026-09-11*

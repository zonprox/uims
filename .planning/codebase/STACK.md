# Technology Stack

**Analysis Date:** 2026-09-28

## Languages
**Primary:**
- TypeScript 7.0.2 — API (`@uims/api`), Web (`@uims/web`), Shared Packages
**Secondary:**
- JavaScript / Node.js — Build scripts, tooling

## Runtime
**Environment:**
- Node.js >=22.0.0
**Package Manager:**
- pnpm 11.21.0
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks
**Core:**
- NestJS 11.2.3 — Backend API framework (`apps/api`)
- React 19.3.0 — Frontend UI library (`apps/web`)
- Vite 8.3.0 — Frontend build tool/bundler
**Testing:**
- Vitest 5.0.0 — Unit testing
- Playwright 1.63.0 — End-to-end testing
**Build/Dev:**
- Turbo 2.10.12 — Monorepo task orchestration
- Biome 2.5.13 — Formatting and linting
- ESLint 10.10.0 — Linting

## Key Dependencies
**Critical:**
- Prisma 7.10.0 — Database ORM (`@prisma/client`)
- Socket.io 4.8.3 — Real-time WebSockets
- Zustand 5.0.15 — Frontend state management
- TanStack React Query 5.102.8 — Data fetching and caching
- Ant Design 6.6.3 — Frontend UI component library
**Infrastructure:**
- pg 8.23.0 — PostgreSQL client
- ioredis 6.0.0 — Redis client

## Configuration
**Environment:**
- Configured via `.env` files (e.g., `.env.example`), loaded via `dotenv` and NestJS ConfigModule.
- Key configs required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `MEILISEARCH_HOST`, `S3_ENDPOINT`
**Build:**
- Monorepo: `turbo.json`, `pnpm-workspace.yaml`
- Apps: `vite.config.ts`, `tsconfig.json`

## Platform Requirements
**Development:**
- Node.js >=22.0.0, pnpm >=11.0.0, Docker Desktop (for `docker-compose.dev.yml`)
**Production:**
- Node.js environment, PostgreSQL DB, Redis instance, MeiliSearch, S3-compatible storage.

---
*Stack analysis: 2026-09-28*

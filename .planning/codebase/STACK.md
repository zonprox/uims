---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
# Technology Stack

**Analysis Date:** 2026-09-17

## Languages

**Primary:**

- TypeScript 7.0.2 - Full stack application logic (API, Web, Shared Packages)

**Secondary:**

- JavaScript - Configuration files (Node.js ecosystem)
- SQL - Prisma initial migrations, Postgres initialization scripts
- HTML/CSS - Web frontend scaffolding and styling

## Runtime

**Environment:**

- Node.js >=22.0.0

**Package Manager:**

- pnpm 11.21.0
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**

- NestJS 11.2.3 - Backend REST API, WebSockets, Dependency Injection (`apps/api`)
- React 19.3.0 - Frontend web framework (`apps/web`)

**Testing:**

- Vitest 5.0.0 - Unit and integration testing across workspaces
- Playwright 1.63.0 - End-to-end (e2e) testing

**Build/Dev:**

- Turborepo 2.10.12 - Monorepo build system and task orchestration
- Vite 8.3.0 - Web frontend bundler
- Biome 2.5.13 - Extremely fast formatter and linter

## Key Dependencies

**Critical:**

- Prisma 7.10.0 - Database ORM (schema modeling, migrations, type-safe queries)
- Zod 4.6.4 - Schema validation for environment variables, API inputs, and shared boundaries
- Zustand 5.0.15 - Lightweight frontend state management
- TanStack React Query 5 - Frontend data fetching, caching, and synchronization
- Socket.io 4.8.3 - Real-time bidirectional event-based communication (Notifications)
- Ant Design 6.6.3 - Comprehensive React UI component library

**Infrastructure:**

- ioredis 6.0.0 - Robust Redis client for NestJS caching and possible background queues
- pg 8.23.0 - PostgreSQL client (used with Prisma's `@prisma/adapter-pg`)

## Configuration

**Environment:**

- Configured via `.env` files.
- Validated at runtime in the backend using Zod (`apps/api/src/config/app.config.ts`), ensuring fail-fast behavior on missing configs.
- Key configs required: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY`, `MEILISEARCH_HOST`, `MEILI_API_KEY` (or `MEILISEARCH_API_KEY`).

**Build:**

- `turbo.json` (Monorepo pipeline configuration)
- `pnpm-workspace.yaml` (Workspace package definitions)
- `tsconfig.json` (TypeScript compilation rules across packages)
- `biome.json` (Linting and formatting rules)

## Platform Requirements

**Development:**

- Docker and Docker Compose (to run backing services: PostgreSQL, Redis, Meilisearch, SeaweedFS)
- Node.js 22+ & pnpm 11+ (for local application execution)

**Production:**

- Linux container environment capable of running Docker Compose (images built via provided Dockerfiles)
- PostgreSQL 17
- Redis 8
- Meilisearch (Search Engine)
- SeaweedFS (S3-compatible object storage)

---

*Stack analysis: 2026-09-17*

# Technology Stack

## Runtime & Language
- Node.js: >=22.0.0 — Primary JavaScript runtime for backend and tooling.
- TypeScript: 7.0.2 — Authoritative monorepo standard for type-safe code.
- pnpm: 11.21.0 — Fast, disk space efficient package manager.

## Backend Framework & Libraries
- NestJS: 11.2.3 — Progressive Node.js framework for building efficient, reliable and scalable server-side applications.
- Prisma: 7.10.0 — Next-generation ORM for Node.js & TypeScript (@prisma/adapter-pg, @prisma/client).
- BullMQ: 6.3.4 (via @nestjs/bullmq 11.0.5) — Message queue and background job processing.
- Socket.io: 4.8.3 (via @nestjs/websockets, @nestjs/platform-socket.io) — Real-time bidirectional event-based communication.
- Zod: 4.5.4 — TypeScript-first schema declaration and validation.
- Pino: 10.3.1 (via pino-http 11.0.0) — Super fast, all natural json logger.
- Passport: 0.7.0 (via @nestjs/passport 11.0.5) — Express-compatible authentication middleware for Node.js.

## Frontend Framework & Libraries
- React: 19.2.8 — A JavaScript library for building user interfaces.
- React Router: 8.3.1 — Declarative routing for React.
- Zustand: 5.0.15 — A small, fast and scalable bearbones state-management solution.
- TanStack React Query: 5.102.8 — Powerful asynchronous state management.
- Ant Design: 6.6.3 — An enterprise-class UI design language and React UI library.
- Vite: 8.2.2 — Next generation frontend tooling.

## Database & Storage
- PostgreSQL: 17 (via Docker alpine) — Relational database for core application data.
- Redis: 8 (via Docker alpine) — In-memory data structure store, used as a database, cache, and message broker (via ioredis 6.0.0).
- MeiliSearch: latest (via Docker) — Lightning-fast, ultra-relevant, and typo-tolerant search engine.
- SeaweedFS: latest (via Docker) — Distributed S3-compatible object storage for file uploads.

## Build & Development Tools
- Turborepo: 2.10.12 — High-performance build system for JavaScript and TypeScript codebases.
- Biome: 2.5.12 — Fast formatter and linter for web projects.
- Vitest: 5.0.0 — Blazing fast unit test framework powered by Vite.
- Playwright: 1.63.0 — Fast and reliable end-to-end testing for modern web apps.

## Shared Packages
- @uims/shared-types: 1.0.0 — Type definitions shared across apps.
- @uims/shared-validators: 1.0.0 — Zod schemas and validation logic.
- @uims/shared-utils: 1.0.0 — Utility functions shared across apps (includes dayjs 1.11.23).
- @uims/eslint-config: 1.0.0 — Shared ESLint configuration.

## Key Version Constraints
- Strict Zero-Downgrade Policy: TypeScript must remain on 7.x (7.0.2). Modifying manifests requires `pnpm install --no-frozen-lockfile && pnpm dedupe`.
- Production Stability: Unstable release candidates are not permitted for mission-critical packages (e.g., Prisma remains on latest stable 7.x).


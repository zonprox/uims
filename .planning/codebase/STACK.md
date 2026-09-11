# Technology Stack Profile

## 1. Runtime & Language Standards

| Component | Standard / Version | Configuration & Manifest Source | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>=22.0.0` (Active LTS) | [package.json](file:///home/user/projects/uims/package.json#L9), [@types/node: ^26.5.0](file:///home/user/projects/uims/apps/api/package.json#L67) | Server runtime engine with native fetch, Web Crypto, and modern ECMAScript support |
| **TypeScript** | `7.0.2` (Monorepo standard) | [apps/api/package.json](file:///home/user/projects/uims/apps/api/package.json#L76), [apps/web/package.json](file:///home/user/projects/uims/apps/web/package.json#L43) | Strict type verification; enforced monorepo-wide without downgrades |
| **Package Manager** | `pnpm 11.21.0` | [package.json](file:///home/user/projects/uims/package.json#L7) (`packageManager`) | Workspace dependency management, content-addressable storage, symlinked isolation |

---

## 2. Monorepo & Build Toolchain

- **Monorepo Orchestrator**: **Turborepo 2.10.12** ([package.json](file:///home/user/projects/uims/package.json#L51)). Task caching pipeline defined in [turbo.json](file:///home/user/projects/uims/turbo.json) coordinates `build`, `dev`, `lint`, `test`, and `typecheck` with topology dependencies (`^build`).
- **Frontend Bundler**: **Vite 8.2.2** with `@vitejs/plugin-react 6.1.1` ([apps/web/package.json](file:///home/user/projects/uims/apps/web/package.json#L40-L44)). Includes HTTP/2 SSL dev server on port `5679`, path aliasing for monorepo packages, and vendor chunk splitting ([apps/web/vite.config.ts](file:///home/user/projects/uims/apps/web/vite.config.ts#L6-L24)).
- **Package Bundler**: **tsdown 0.23.0** ([packages/shared-types/package.json](file:///home/user/projects/uims/packages/shared-types/package.json#L22)). Rapidly emits ESM bundles (`.mjs`) and declaration files (`.d.mts`) for shared workspace libraries.
- **Code Style & Linting**:
  - **Biome 2.5.12** ([package.json](file:///home/user/projects/uims/package.json#L48), [biome.json](file:///home/user/projects/uims/biome.json)): Zero-overhead formatting (2-space, single-quote, trailing-commas) and fast AST linting.
  - **ESLint 10.10.0** with `typescript-eslint 8.70.0` ([packages/eslint-config/package.json](file:///home/user/projects/uims/packages/eslint-config/package.json#L9-L12)): Enterprise linting rules with `@typescript-eslint/parser`.

---

## 3. Backend Framework & Services (`apps/api`)

| Package / Module | Version | Concrete File Reference | Architectural Role |
| :--- | :--- | :--- | :--- |
| `@nestjs/core`, `common`, `platform-express` | `^11.2.3` | [apps/api/package.json](file:///home/user/projects/uims/apps/api/package.json#L24-L29) | Modular monolith architecture, dependency injection container |
| `@nestjs/config` & `zod` | Config `^4.0.4`, Zod `^4.5.4` | [apps/api/src/config/app.config.ts](file:///home/user/projects/uims/apps/api/src/config/app.config.ts#L1-L22) | Environment schema parsing and startup validation |
| `@prisma/client`, `@prisma/adapter-pg`, `prisma` | `^7.10.0` | [apps/api/src/database/prisma.service.ts](file:///home/user/projects/uims/apps/api/src/database/prisma.service.ts#L3-L27) | Prisma 7 ORM with PostgreSQL driver adapter and connection pooling |
| `pg` & `@types/pg` | `^8.23.0` | [apps/api/src/database/prisma.service.ts](file:///home/user/projects/uims/apps/api/src/database/prisma.service.ts#L5-L25) | Native PostgreSQL connection pool (`Pool` instance, max 20 connections) |
| `ioredis` | `^6.0.0` | [apps/api/src/common/redis/redis.service.ts](file:///home/user/projects/uims/apps/api/src/common/redis/redis.service.ts#L3-L31) | Redis client featuring auto-reconnect and in-memory map fallback |
| `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` | JWT `^11.0.2`, Passport `^11.0.5` | [apps/api/src/modules/auth/auth.service.ts](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.service.ts#L3-L21) | Dual JWT grant (15m access, 7d refresh) with passport bearer strategy |
| `bcrypt` | `^6.0.0` | [apps/api/src/modules/auth/auth.service.ts](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.service.ts#L5-L106) | Salted password hashing and verification |
| `@nestjs/websockets`, `socket.io` | NestJS `^11.2.3`, Socket.io `^4.8.3` | [apps/api/src/modules/notifications/notifications.gateway.ts](file:///home/user/projects/uims/apps/api/src/modules/notifications/notifications.gateway.ts#L9-L60) | Real-time event gateway (`/notifications`) with room-based broadcast |
| `@nestjs/bullmq`, `bullmq` | NestJS `^11.0.5`, BullMQ `^6.3.4` | [apps/api/package.json](file:///home/user/projects/uims/apps/api/package.json#L23-L40) | Redis-backed asynchronous queue and distributed jobs pipeline |
| `@nestjs/schedule` | `^6.1.3` | [apps/api/src/modules/notifications/scheduled-alerts.worker.ts](file:///home/user/projects/uims/apps/api/src/modules/notifications/scheduled-alerts.worker.ts#L2-L36) | Background cron task runner (`@Cron('0 0 * * *')`) |
| `@nestjs/swagger` | `^11.4.7` | [apps/api/src/main.ts](file:///home/user/projects/uims/apps/api/src/main.ts#L3-L91) | OpenAPI 3.0 documentation served at `/api/v1/docs` |
| `pino`, `pino-http` | Pino `^10.3.1`, HTTP `^11.0.0` | [apps/api/package.json](file:///home/user/projects/uims/apps/api/package.json#L51-L52) | High-performance structured JSON logging |
| `helmet`, `@nestjs/throttler` | Helmet `^8.3.0`, Throttler `^6.5.0` | [apps/api/src/main.ts](file:///home/user/projects/uims/apps/api/src/main.ts#L21-L30) | Security headers (HSTS 1 yr) and IP rate limiting (1000 req/min) |
| `exceljs` | `^4.4.0` | [apps/api/prisma/scripts/import-network-excel.ts](file:///home/user/projects/uims/apps/api/prisma/scripts/import-network-excel.ts#L6) | Streaming spreadsheet ingestion for IPAM, subnets, and credentials |

---

## 4. Frontend Framework & Client Stack (`apps/web`)

| Package / Module | Version | Concrete File Reference | Architectural Role |
| :--- | :--- | :--- | :--- |
| `react`, `react-dom` | `^19.2.8` | [apps/web/package.json](file:///home/user/projects/uims/apps/web/package.json#L28-L29) | React 19 concurrent component tree and DOM renderer |
| `react-router` | `^8.3.1` | [apps/web/src/app/router.tsx](file:///home/user/projects/uims/apps/web/src/app/router.tsx) | Declarative client-side routing with nested layout trees |
| `antd` | `^6.6.3` | [apps/web/src/app/theme.ts](file:///home/user/projects/uims/apps/web/src/app/theme.ts) | Enterprise UI design system and component library |
| `@ant-design/pro-components` | `^2.8.10` | [apps/web/package.json](file:///home/user/projects/uims/apps/web/package.json#L17) | Enterprise data layouts, ProTable, and ProForm scaffolding |
| `@ant-design/icons` | `^6.3.4` | [apps/web/src/layouts/menuConfig.tsx](file:///home/user/projects/uims/apps/web/src/layouts/menuConfig.tsx) | SVG iconography for navigation, tables, and status badges |
| `@tanstack/react-query` | `^5.102.8` | [apps/web/src/app/query-client.ts](file:///home/user/projects/uims/apps/web/src/app/query-client.ts) | Server state synchronization, caching, and background refetching |
| `zustand` | `^5.0.15` | [apps/web/src/stores/auth.store.ts](file:///home/user/projects/uims/apps/web/src/stores/auth.store.ts) | Lightweight client state stores (auth, theme, timezone, alerts) |
| `axios` | `^1.20.0` | [apps/web/src/services/api.ts](file:///home/user/projects/uims/apps/web/src/services/api.ts) | HTTP client configured with bearer token interceptors |
| `socket.io-client` | `^4.8.3` | [apps/web/src/hooks/useRealtimeNotifications.ts](file:///home/user/projects/uims/apps/web/src/hooks/useRealtimeNotifications.ts) | Real-time WebSocket connection to `/notifications` namespace |
| `dayjs` | `^1.11.23` | [packages/shared-utils/package.json](file:///home/user/projects/uims/packages/shared-utils/package.json#L24) | Immutable date parsing, timezone offsets, and formatting |
| `jsqr` | `^1.4.0` | [apps/web/package.json](file:///home/user/projects/uims/apps/web/package.json#L27) | Client-side camera QR code decoder for hardware asset tagging |

---

## 5. Testing & Quality Assurance Stack

- **Unit & Integration Runner**: **Vitest 5.0.0** ([apps/api/vitest.config.mts](file:///home/user/projects/uims/apps/api/vitest.config.mts), [apps/web/vitest.config.ts](file:///home/user/projects/uims/apps/web/vitest.config.ts)). Native Vite execution with TypeScript transform.
- **Frontend DOM Mock**: **happy-dom 20.14.0** ([apps/web/package.json](file:///home/user/projects/uims/apps/web/package.json#L42)). High-speed headless browser environment for React testing.
- **End-to-End Suite**: **Playwright 1.63.0** (`@playwright/test ^1.63.0` in [package.json](file:///home/user/projects/uims/package.json#L49)). Cross-browser testing pipeline for automated verification.

---

## 6. Infrastructure & Deployment Topology

- **Container Engine**: **Docker Compose v2** ([docker-compose.yml](file:///home/user/projects/uims/docker-compose.yml)).
  - PostgreSQL 17-alpine (`uims-postgres`, port `5433:5432`)
  - Redis 8-alpine (`uims-redis`, port `6381:6379`)
  - MeiliSearch latest (`uims-meilisearch`, port `7700:7700`)
  - SeaweedFS S3 cluster (`master:9333`, `volume:8080`, `filer:8888/8333`)
  - NestJS API container (`uims-api`, port `3002:3000`)
  - Nginx HTTPS reverse proxy container (`uims-web`, port `5679:443`)
- **Remote Access & Ingress**: **Cloudflare Quick Tunnel** (`cloudflared`, [scripts/dev.sh](file:///home/user/projects/uims/scripts/dev.sh#L343)) publishing local HTTPS dev server onto temporary `.trycloudflare.com` endpoints.

---

## 7. Key Architectural Decisions

| Decision Area | Selected Technology | Rationale & Pattern Evidence |
| :--- | :--- | :--- |
| **Backend Architecture** | NestJS 11 Modular Monolith | Preserves strict module boundaries (`Auth`, `Assets`, `Audit`, `Network`) while avoiding microservice network overhead ([apps/api/src/app.module.ts](file:///home/user/projects/uims/apps/api/src/app.module.ts#L30-L57)). |
| **Database Access** | Prisma 7 + Driver Adapter (`@prisma/adapter-pg`) | Decouples ORM schema from database engine driver; utilizes standard `pg.Pool` for robust connection pooling and transaction safety ([apps/api/src/database/prisma.service.ts](file:///home/user/projects/uims/apps/api/src/database/prisma.service.ts#L20-L28)). |
| **Search Strategy** | MeiliSearch with DB Fallback | Fast full-text search via MeiliSearch REST multi-search API; automatically degrades to PostgreSQL `ILIKE` queries when MeiliSearch is offline ([apps/api/src/modules/search/search.service.ts](file:///home/user/projects/uims/apps/api/src/modules/search/search.service.ts#L94-L112)). |
| **Cache Resilience** | Redis 8 with Memory Fallback | `RedisService` wraps `ioredis` with an in-memory `Map` fallback; local dev or Redis downtime does not crash the server ([apps/api/src/common/redis/redis.service.ts](file:///home/user/projects/uims/apps/api/src/common/redis/redis.service.ts#L21-L54)). |
| **Audit Integrity** | HMAC-SHA256 Signed Auditing | `AuditInterceptor` hashes `timestamp|userId|action|entity|status|ip|payload` with `AUDIT_SIGNING_KEY` before writing to PostgreSQL, ensuring tamper evidence ([apps/api/src/common/interceptors/audit.interceptor.ts](file:///home/user/projects/uims/apps/api/src/common/interceptors/audit.interceptor.ts#L72-L89)). |
| **Shared Monorepo Packages** | ESM + `tsdown` Bundling | Shared libraries (`@uims/shared-types`, `shared-validators`, `shared-utils`) compile to `.mjs` + `.d.mts`, ensuring strict type sharing without code duplication ([packages/shared-types/package.json](file:///home/user/projects/uims/packages/shared-types/package.json#L8-L17)). |
| **Client Code Splitting** | Vite 8 `manualChunks` | Explicit vendor splitting separates React, Ant Design, ProComponents, TanStack Query, and utility libraries to optimize initial bundle delivery ([apps/web/vite.config.ts](file:///home/user/projects/uims/apps/web/vite.config.ts#L6-L24)). |

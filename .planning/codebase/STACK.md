# Technology Stack
**Analysis Date:** 2026-09-09

## Languages
- **TypeScript**: `7.0.2` (`^7.0.2` across `apps/api`, `apps/web`, `packages/shared-types`, `packages/shared-validators`, `packages/shared-utils`). Target: `ES2022` across all packages.
- **JavaScript / Node.js**: Node.js `>=22.0.0` engine requirement in root `package.json` (active runtime: `v22.23.2`).
- **SQL**: PostgreSQL 17 dialect with extensions `uuid-ossp`, `pg_trgm`, and `citext` initialized via `docker/postgres/init.sql`.

## Runtime & Build
- **Package Manager**: `pnpm` `11.21.0` (configured via root `package.json` `"packageManager": "pnpm@11.21.0"`, workspaces enabled in `pnpm-workspace.yaml`).
- **Monorepo Build System**: Turborepo `turbo` `^2.10.12` (installed: `2.10.12`), configured in `turbo.json` with pipeline dependency tracking, build caching (`dist/**`), and environment variable pass-through.
- **Frontend Bundler**: Vite `^8.2.2` (installed: `8.2.2`, `@vitejs/plugin-react` `^6.1.1`) with custom vendor chunk splitting (`vendor-react`, `vendor-antd-icons`, `vendor-rc`, `vendor-antd-pro`, `vendor-antd-core`, `vendor-query`, `vendor-utils`), path aliases (`@/*`, `@uims/*`), and development HTTPS/proxy settings.
- **Shared Packages Bundler**: `tsdown` `^0.23.0` compiling `packages/*` to Dual ESM output (`dist/index.mjs` and declarations `dist/index.d.mts`).
- **Backend Compiler / Execution**: TypeScript compiler `tsc` (`7.0.2`) with `nodemon` `^3.1.14` in dev, `tsx` `^4.23.13` for database seeding (`prisma/seed.ts`).

## Frameworks
### Backend (`apps/api`)
- **Framework**: NestJS 11.2.3 (`@nestjs/core` `^11.2.3`, `@nestjs/common` `^11.2.3`, `@nestjs/platform-express` `^11.2.3`, `@nestjs/cli` `^11.0.24`).
- **ORM**: Prisma 7.10.0 (`@prisma/client` `^7.10.0`, `prisma` `^7.10.0`, `@prisma/config` `^7.10.0`) using the PostgreSQL driver adapter `@prisma/adapter-pg` `^7.10.0` with `pg` `^8.23.0`.
- **WebSocket Engine**: `@nestjs/websockets` `^11.2.3`, `@nestjs/platform-socket.io` `^11.2.3`, `socket.io` `^4.8.3`.
- **Task Scheduling**: `@nestjs/schedule` `^6.1.3` (cron worker for alert scans).
- **Rate Limiting**: `@nestjs/throttler` `^6.5.0` (global throttler `ttl: 60000, limit: 1000`, route-specific overrides).
- **API Documentation**: `@nestjs/swagger` `^11.4.7` (OpenAPI specification mounted at `/api/v1/docs`).
- **Validation Libraries**:
  - `class-validator` `^0.15.1` and `class-transformer` `^0.5.1` powering global NestJS `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`.
  - `zod` `^4.5.4` validating environment configuration in `apps/api/src/config/app.config.ts`.

### Frontend (`apps/web`)
- **Framework**: React 19.2.8 (`react` `^19.2.8`, `react-dom` `^19.2.8`, `@types/react` `^19.2.18`, `@types/react-dom` `^19.2.7`).
- **Routing**: React Router 8.3.1 (`react-router` `^8.3.1`).
- **UI Library**: Ant Design 6.6.2 (`antd` `^6.6.2`) and Ant Design Pro Components 2.8.10 (`@ant-design/pro-components` `^2.8.10`).
- **State Management**: Zustand 5.0.15 (`zustand` `^5.0.15`).
- **Data Fetching & Server State**: TanStack React Query 5.102.8 (`@tanstack/react-query` `^5.102.8`, `@tanstack/react-query-devtools` `^5.102.8`).
- **HTTP Client**: Axios 1.20.0 (`axios` `^1.20.0`).
- **Real-Time Client**: Socket.IO Client 4.8.3 (`socket.io-client` `^4.8.3`).

## Key Dependencies
### Shared Packages
- `packages/shared-types`: Shared TypeScript domain types, DTOs, enums, and entity interfaces (`ApiResponse`, `AuthDto`, `LoginDto`, `PaginationDto`, `AssetDto`, `LicenseDto`, `DirectoryDto`, `NetworkDto`, `InventoryDto`, `AuditDto`, `SearchQueryDto`, `SearchResponseDto`, `SearchResultItem`, `DashboardDto`, `HealthDto`, `OrganizationDto`, `UserDto`, `RoleDto`, `NotificationItem`, `NotificationListResponseDto`, `Asset`, `AuditLog`, `DirectoryUser`, `DirectoryGroup`, `License`, `NetworkDevice`, `AppUser`).
- `packages/shared-validators`: Reusable Zod schemas for runtime request validation and form validation (`asset.validator`, `auth.validator`, `common.validator`, `directory.validator`, `license.validator`, `notification.validator`, `organization.validator`, `pagination.validator`, `role.validator`, `user.validator`).
- `packages/shared-utils`: Shared runtime utilities including brand typing helpers (`Brand<T, B>`), enum inspection, number/currency/date formatting, string helpers, and timezone manipulation using `dayjs` `^1.11.23`.
- `packages/eslint-config`: Shared flat ESLint configuration module exporting `@typescript-eslint/eslint-plugin` `^8.69.0`, `@typescript-eslint/parser` `^8.69.0`, and `eslint-config-prettier` `^10.1.8`.

### API Dependencies
- **Security & Headers**: `helmet` `^8.3.0` (configured with strict HSTS `maxAge: 31536000`), `compression` `^1.8.1`, `cookie-parser` `^1.4.7`.
- **Authentication**: `bcrypt` `^6.0.0` (password hashing), `@nestjs/jwt` `^11.0.2`, `passport` `^0.7.0`, `passport-jwt` `^4.0.1`, `@nestjs/passport` `^11.0.5`.
- **Queue / Cache**:
  - `ioredis` `^6.0.0` (direct Redis client in `RedisService` with in-memory resilient fallback).
  - `bullmq` `^6.3.4` and `@nestjs/bullmq` `^11.0.5` (queue framework dependencies installed).
- **Logging**: `pino` `^10.3.1`, `pino-http` `^11.0.0`, NestJS `Logger`.
- **Audit Signing**: Native Node.js `crypto` module implementing HMAC-SHA256 tamper-evident audit record hashing using `AUDIT_SIGNING_KEY`.
- **Mail**: No external SMTP library installed in `@uims/api`; notifications are maintained in-app and pushed over WebSocket.
- **File Storage**: SeaweedFS S3-compatible service (endpoint `http://seaweedfs-filer:8333` configured via `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`).

### Web Dependencies
- **Icons**: `@ant-design/icons` `^6.3.4`.
- **Typography & Styling**: `@fontsource-variable/inter` `^5.3.0`, `@fontsource/inter` `^5.3.0`, Ant Design v6 dynamic design tokens.
- **Charts**: Custom Canvas / SVG visualization (`apps/web/src/pages/organization/OrganizationCanvas.tsx` using HTML5 Canvas, Ant Design `Progress` and `Statistic` components; no external chart package installed).
- **Rich Text**: None installed (standard Ant Design `Input.TextArea` used for multi-line inputs).
- **Date Handling**: `dayjs` `^1.11.23`.
- **Barcode / QR Scanning**: `jsqr` `^1.4.0`.
- **Form / Schema Validation**: `zod` `^4.5.4`.

## Infrastructure
- **Database**: PostgreSQL 17 (`postgres:17-alpine`, container: `uims-postgres`, port `5433:5432`). Includes tuned database parameters (`max_connections=200`, `shared_buffers=256MB`, `effective_cache_size=768MB`, `maintenance_work_mem=64MB`) and initialization script `docker/postgres/init.sql`.
- **Cache & Key-Value Store**: Redis 8 (`redis:8-alpine`, container: `uims-redis`, port `6381:6379`, command: `redis-server --requirepass --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru`).
- **Search Engine**: Meilisearch (`getmeili/meilisearch:latest`, container: `uims-meilisearch`, port `7700:7700`, healthcheck on `/health`).
- **Distributed Object / File Storage**: SeaweedFS (`chrislusf/seaweedfs:latest`):
  - Master node: `uims-seaweedfs-master` (port `9333:9333`).
  - Volume server: `uims-seaweedfs-volume` (port `8080:8080`).
  - Filer / S3 Gateway: `uims-seaweedfs-filer` (ports `8888:8888` for filer HTTP, `8333:8333` for S3 API).
- **Reverse Proxy & Gateway**: Nginx Alpine (`docker/nginx/nginx.conf`, container: `uims-web`, port `5679:443`, TLS 1.2/1.3, HTTP/2, Gzip, reverse proxying `/api/` and `/socket.io/` to backend `uims-api:3000`).

## Dev & Testing
- **Linter & Formatter**:
  - Biome `^2.5.12` (`@biomejs/biome` `^2.5.12`, configured in `biome.json` with recommended rules, 2-space indentation, single quotes, 100 character line length).
  - ESLint `^10.10.0` with `typescript-eslint` `^8.69.0` and `eslint-config-prettier` `^10.1.8` (`packages/eslint-config`).
- **Unit & Integration Test Runner**: Vitest `^5.0.0` (`vitest` installed in root and workspace packages):
  - Backend configuration: `apps/api/vitest.config.mts` (`environment: 'node'`, matching `src/**/*.{test,spec}.ts`).
  - Frontend configuration: `apps/web/vitest.config.ts` (`environment: 'happy-dom'` `^20.14.0`, test timeout: 20000ms).
- **End-to-End (E2E) Testing**: Playwright `^1.63.0` (`@playwright/test` `^1.63.0`, `playwright` `^1.63.0`).

## Configuration
- **Monorepo Pipeline (`turbo.json`)**: Configured with tasks `build`, `dev`, `lint`, `lint:fix`, `test`, `test:e2e`, `typecheck`, and `clean`. Tracks inputs, outputs (`dist/**`), and defines `globalEnv` variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY`, `JWT_EXPIRATION`, `NODE_ENV`.
- **Environment Variable Validation (`apps/api/src/config/app.config.ts`)**: Validated via Zod `envSchema` at application startup. Enforces required `DATABASE_URL`, minimum 32-character strings for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `AUDIT_SIGNING_KEY`.
- **TypeScript Compilers (`tsconfig.json`)**:
  - `apps/api/tsconfig.json`: CommonJS module, ES2022 target, `emitDecoratorMetadata: true`, `experimentalDecorators: true`, `strictNullChecks: true`.
  - `apps/web/tsconfig.json`: ESNext module, `bundler` resolution, ES2022 target, `jsx: react-jsx`, path alias mapping (`@/*`, `@uims/*`).
  - `packages/*/tsconfig.json`: Bundler resolution, declaration generation enabled.
- **Docker Compose Profiles**:
  - `docker-compose.yml`: Production deployment definition with container healthchecks, internal networks, and named local volumes.
  - `docker-compose.dev.yml`: Development overrides enabling hot reloading with volume binding, Chokidar polling (`CHOKIDAR_USEPOLLING=true`), and port bindings.

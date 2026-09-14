# Technology Stack Analysis (UIMS)

## 1. Runtime & Language
- **Node.js**: >= 22.0.0
- **TypeScript**: v7.0.2
- **Configuration**: 
  - **API (`apps/api/tsconfig.json`)**: `ES2022`, `commonjs` module, `strict: true`.
  - **Web (`apps/web/tsconfig.json`)**: `ES2022`, `ESNext` module, `bundler` resolution, `strict: true`.
- **Assessment (2026)**: Excellent. Using the absolute latest standard Node.js and TypeScript builds. Modern module resolutions are appropriately split between frontend and backend.

## 2. Monorepo Tooling
- **Package Manager**: pnpm v11.21.0
- **Turborepo**: v2.10.12
- **Workspace**: Configured via `pnpm-workspace.yaml` to include `apps/*` and `packages/*`.
- **Assessment (2026)**: State-of-the-art. Combining pnpm v11 with Turborepo 2 ensures maximal caching efficiency and strict package hoist boundary definitions.

## 3. Backend Framework
- **Framework**: NestJS v11.2.3
- **Architecture**: Modular structure (`app.module.ts`, `assets.module.ts`, `search.module.ts`, etc.).
- **Components**:
  - *Interceptors*: `AuditInterceptor`, `TransformInterceptor`.
  - *Guards*: `JwtAuthGuard`, `PermissionsGuard`, `RolesGuard`.
  - *Filters*: `HttpExceptionFilter`, `PrismaExceptionFilter`.
- **Versioning**: REST API versioning implemented (e.g., `/api/v1/health`).
- **Assessment (2026)**: Very modern NestJS setup. Using v11 is bleeding-edge and guarantees long-term support. The strict boundary separations using custom decorators and guards demonstrate mature enterprise design.

## 4. ORM & Database
- **ORM**: Prisma v7.10.0
- **Database**: PostgreSQL 17 (via `postgres:17-alpine` Docker image)
- **Features**: Connection pooling explicitly defined in the URL (`connection_limit=20&pool_timeout=30`).
- **Schema Count**: At least 7 primary models (Assets, DirectoryUsers, Licenses, InventoryItems, AuditLogs, Subnets, Settings).
- **Assessment (2026)**: Highly optimized. Postgres 17 is heavily performant, and Prisma 7 provides robust type-safe database access.

## 5. Frontend Framework
- **Framework**: React v19.3.0
- **Bundler**: Vite v8.3.0
- **UI Library**: Ant Design v6.6.3 (`@ant-design/pro-components` v2.8.10)
- **Bundler Config**: Custom chunking strategy in `vite.config.ts` isolating `vendor-react`, `vendor-antd-core`, `vendor-query`, etc., to prevent bloated single-file bundles.
- **Assessment (2026)**: Exceptional frontend stack. React 19 concurrent features paired with Vite 8 provides instant HMR and optimized builds.

## 6. State Management
- **Local State**: Zustand v5.0.15
- **Server State / Caching**: TanStack Query v5.102.8
- **Assessment (2026)**: Standard and most effective combination for React apps in 2026. Zustand is vastly preferred over Redux for boilerplate reduction.

## 7. Authentication
- **Strategy**: JWT via Passport (`@nestjs/jwt` v11.0.2, `passport-jwt` v4.0.1).
- **Security**: `bcrypt` v6.0.0 for hashing. Access tokens expire in 15m, refresh tokens in 7d.
- **Enforcement**: Deep integration with Socket.io (forbidding URL query tokens) and `JwtAuthGuard` applied across endpoints.

## 8. Caching
- **Engine**: Redis 8 (`redis:8-alpine`)
- **Usage Patterns**:
  - Cache TTLs set to 300s (5 minutes).
  - High availability lookups for configuration (e.g., `uims:cache:settings:all` in `SettingsService`).
- **Assessment (2026)**: Solid integration. Redis 8 handles high-throughput operations smoothly.

## 9. Search
- **Engine**: MeiliSearch (latest)
- **Integration**: Batched synchronization (100 records at a time) for `assets`, `licenses`, and `users` indexes. Custom mapping layer in `SearchService`. Fallback to Postgres `OR` matching when Meilisearch is offline.
- **Assessment (2026)**: Smart, resilient design. MeiliSearch offers superior typo-tolerance compared to native Postgres pg_trgm.

## 10. Storage
- **Engine**: SeaweedFS (latest) exposing an S3-compatible gateway (`seaweedfs-filer`).
- **Integration**: Used for backing up database snapshots (`s3://uims-vault/backups/`) and file assets.
- **Assessment (2026)**: SeaweedFS provides much faster distributed I/O than MinIO for large numbers of small files.

## 11. Code Quality Tools
- **Formatter**: Biome v2.5.13 (replaces Prettier; 100 char width, space indent, LF line endings).
- **Linter**: ESLint v10.10.0.
- **Assessment (2026)**: Biome is the de-facto standard in 2026 for rust-based, ultra-fast formatting.

## 12. Testing Tools
- **Unit/Integration**: Vitest v5.0.0.
- **E2E**: Playwright v1.63.0 (`test:e2e` turbo script).
- **Assessment (2026)**: Vitest seamlessly runs in the Vite ecosystem and is much faster than Jest. Playwright is industry standard.

## 13. DevOps & Tooling
- **Docker Compose**: Dedicated `docker-compose.yml` for data layer (Postgres, Redis, Meili, SeaweedFS) and application layer (API, Web via Nginx).
- **Tunneling**: Cloudflare `cloudflared` tunnel script (`scripts/dev.sh`) exposes the local environment publicly for easy webhooks/testing.
- **Assessment (2026)**: The `dev.sh` script is extremely mature, combining health checks, port collision prevention, and automatic HTTPS tunneling.

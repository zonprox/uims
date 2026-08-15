# UIMS — AI Agent Memory & Development Guide

> **UIMS (Unified IT Management System)** — Enterprise-grade Centralized IT Operations Platform (Best Practice 2026).

---

## 1. System Overview & Architecture

- **Architecture**: Modular Monolith, REST API, Single-Page Application (SPA), Containerized via Docker Compose.
- **Language Policy**: 100% English across all UI, API responses, code, comments, documentation, and commit messages.
- **Package Manager & Workspace**: `pnpm` workspaces (v11.21+) + Turborepo (v2.10+).

### Monorepo Structure:
- `apps/api`: NestJS 11 + Prisma 7 ORM + PostgreSQL 17 + Redis 8 + BullMQ.
- `apps/web`: React 19 + Ant Design 6.6+ + Vite 8 + Zustand 5 + TanStack Query 5.
- `packages/shared-types`: Common TypeScript entities, DTOs, Enums, and API Response envelopes.
- `packages/shared-validators`: Shared runtime Zod schemas.
- `packages/shared-utils`: String, format, date, and validation utilities.
- `docker/`: Nginx proxy configuration, Postgres initialization scripts, multi-stage Dockerfiles.

---

## 2. Docker & Infrastructure Ports

| Service | Container Name | Internal Port | Host / Exposed Port | Notes |
|:---|:---|:---|:---|:---|
| **Web UI (Nginx HTTPS)** | `uims-web` | `443` (SSL) / `80` | `5679` | Serves SPA + Proxies `/api/` over HTTPS |
| **API Backend (NestJS)** | `uims-api` | `3000` | `3002` | Health endpoint: `/api/v1/health` |
| **PostgreSQL** | `uims-postgres` | `5432` | `5433` | User: `uims`, DB: `uims_db` |
| **Redis** | `uims-redis` | `6379` | `6381` | Cache, sessions, queue |
| **MeiliSearch** | `uims-meilisearch` | `7700` | `7700` | Full-text search engine |
| **SeaweedFS Filer** | `uims-seaweedfs-filer` | `8333` / `8888` | `8333` / `8888` | S3-compatible Object Storage |
| **SeaweedFS Master** | `uims-seaweedfs-master` | `9333` | `9333` | Storage cluster coordination |
| **SeaweedFS Volume** | `uims-seaweedfs-volume` | `8080` | `8080` | File volume storage |

---

## 3. Direct Public HTTPS Access on Port 5679

UIMS serves direct native **HTTPS with TLS 1.2 / TLS 1.3** on public port **5679** through Nginx:

### HTTPS Architecture:
- **Direct SSL Termination**: Handled by containerized Nginx with certificates in `docker/nginx/ssl`.
- **Single Public Port**: Port `5679` serves both the React Web Application and reverse-proxies `/api/` requests to the NestJS backend with `X-Forwarded-Proto https`.
- **HTTP2 Enabled**: Fast multiplexing and optimized asset transfer.
- **Access URL**: `https://<server-ip-or-domain>:5679` or `https://localhost:5679`

---

## 4. UI & Frontend Guidelines (Ant Design v6 Standards)

- **Dynamic Theme & Feedback**: Always use `const { message, modal, notification } = App.useApp();` instead of static `message.xxx()` to consume dynamic theme context properly without console warnings.
- **Semantic Styles**:
  - `Statistic`: Use `styles={{ content: { ... } }}` instead of deprecated `valueStyle`.
  - `Card`: Use `styles={{ body: { ... } }}` instead of deprecated `bodyStyle`.
  - `Drawer`: Use `styles={{ body: { ... } }}` instead of deprecated `bodyStyle`.
- **Layout & Sider Standards**:
  - Desktop Sider width is `280px` (expanded) and `80px` (collapsed).
  - Mobile Drawer navigation width is `290px`.
  - Menu items must provide `style={{ width: '100%', minWidth: 0, gap: 8 }}` for flex labels with `overflow: hidden` on text and `flexShrink: 0` on badges/tags to prevent content trimming.
- **Form Controls**: Use Ant Design Form with Zod validation adapters for unified validation across frontend and backend.
- **Page Container Standard**: Wrap all views with `<PageContainer>` to preserve consistent headers, breadcrumbs, action toolbars, and KPI stat bars.

---

## 5. Coding & Workflow Standards

- **Biome Enforcement**: Run `pnpm format` and `pnpm lint` before submitting changes.
- **Response Format Invariant**: All NestJS API endpoints must return `{ success: true, data: T, timestamp: string }`.
- **Database Schema**: Modify database entities in `apps/api/prisma/schema.prisma` and run `pnpm db:migrate`.
- **Reference Docs**: For full API schemas, entity models, and UI guidelines, refer to [ant-design-guide.md](file:///home/user/projects/uims/ant-design-guide.md).

# Project: Unified IT Management System (UIMS)

## Architecture Overview
- **Monorepo Structure**:
  - `apps/api`: NestJS 11 + Prisma 7 ORM + PostgreSQL 17 + Redis 8 + BullMQ, Socket.IO Gateway, `@nestjs/schedule`
  - `apps/web`: React 19 + Vite 8 + Ant Design v6+ + Zustand 5 + TanStack Query 5 + Socket.IO client
  - `packages/shared-types`: Shared TypeScript entities, DTOs, Enums, and WebSocket contracts
  - `packages/shared-validators`: Shared runtime Zod validation schemas
  - `packages/shared-utils`: Shared helper utilities (string, date formatting, error handling)
  - `packages/eslint-config`: Shared linting configurations across monorepo packages
- **Data Flow & Communication**:
  - Domain events in `apps/api` (assets, inventory, licenses, audit) invoke `NotificationsService`.
  - `NotificationsService` persists records to PostgreSQL via Prisma and invokes `NotificationsGateway`.
  - `NotificationsGateway` broadcasts real-time events over `/notifications` Socket.IO namespace to authenticated user (`user:<userId>`) and role (`role:<role>`) rooms.
  - Background alert workers (`ScheduledAlertsWorker`) run periodic cron sweeps for upcoming license/warranty expirations and low stock conditions.
  - `apps/web` connects to Socket.IO `/notifications` with JWT credentials, updates unread counts, displays toasts, plays chimes according to persistent user settings, and provides both a slide-out drawer and a full-page notification center at `/notifications`.

## Architectural Invariants & Refactoring Scope (2026-09-08)
- **Zero Hardcoded Secrets**: Fail-fast environment variable validation for `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, and `AUDIT_HMAC_SECRET`.
- **Strict Network & CORS Controls**: Validated origin whitelist with zero wildcard (`*`) access in credentialed endpoints.
- **Principle of Least Privilege**: Explicit denial on unresolvable roles; no implicit `'Employee'` fallback.
- **Sensitive Field Sanitization**: Sensitive credentials (e.g. `adInitialPassword`) removed from relational storage; strict salted bcrypt hashing.
- **Bounded Database Queries**: Explicit `take` limits and pagination (`skip`/`take`) on all Prisma `findMany()` queries monorepo-wide.
- **Performance Indexing**: Query performance backed by indexes on `DirectoryGroup.name`, `ReportSchedule`, foreign keys, and search predicates.
- **Structured NestJS Logging**: Elimination of raw `console.log` statements in seeders and background workers in favor of NestJS `Logger`.
- **Strict Type Safety**: Zero `any` policy, typed catch clauses (`catch (error: unknown)`), and no compiler diagnostics suppressions.
- **Modernized Dependencies**: Upgrades across all workspaces with strict zero downgrades.
- **Continuous Integration**: Automated GitHub Actions CI workflow covering lint, formatting, typecheck, tests, and build.

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | Notification Schema & Persistence | Notification model with types (INFO, WARNING, ALERT), indexing, and Prisma persistence | M1 (Notifications) | Complete |
| 2 | REST API Endpoints | Paginated listing with filtering (category, status, type, date, search), unread count, mark read, mark all read, delete single & clear all | M1 (Notifications) | Complete |
| 3 | Authenticated WebSocket Gateway | Socket.IO gateway with JWT authentication, tenant/user/role room routing, and event dispatchers (`notification:new`, `notification:count`, `notification:read`, `notification:cleared`) | M1 (Notifications) | Complete |
| 4 | Shared Types & Validators | Notification DTOs, query parameters, Zod schemas in `shared-types` and `shared-validators` | M1 (Notifications) | Complete |
| 5 | Inventory Domain Triggers | Low stock alerts (<= minThreshold), out of stock alerts (0 units), and restock event notifications | M2 (Notifications) | Complete |
| 6 | Asset Domain Triggers | Asset assignment alerts, critical status transition alerts (MAINTENANCE, LOST), and audit logging | M2 (Notifications) | Complete |
| 7 | License Domain Triggers | Seat allocation alerts (90% capacity, 100% capacity), status transitions (EXPIRING_SOON, EXPIRED) | M2 (Notifications) | Complete |
| 8 | Scheduled Alert Worker | Daily cron sweeps for expiring licenses (30/15/7/1 days), expiring warranties, overdue maintenance, with Redis/in-memory deduplication & throttling | M2 (Notifications) | Complete |
| 9 | Top Navigation & Badge Counter | Real-time badge counter on bell icon in top header reflecting live unread count | M3 (Notifications) | Complete |
| 10 | Quick-Access Notification Drawer | Responsive drawer with tabs, search, item mark read/delete, clear all, and link to full notification center | M3 (Notifications) | Complete |
| 11 | Dedicated Notification Center Page | Full page at `/notifications` with `<PageContainer>`, KPI cards, multi-criteria filtering, batch action toolbar, high-density AntD v6 table, and pagination | M3 (Notifications) | Complete |
| 12 | Real-Time Client Experience & Audio Settings | Real-time WebSocket hook with toasts, Web Audio API chimes, persistent sound/toast settings store, and "Notifications" settings tab | M3 (Notifications) | Complete |
| 13 | Target Entity Deep Linking | Round-trip deep linking from notification item click to asset, license, and inventory detail drawers | M3 (Notifications) | Complete |
| 14 | E2E Verification & Quality Hardening | Monorepo typecheck, build, test suite execution, adversarial coverage check, and forensic audit | M4 (Notifications) | Complete |
| 15 | Hardcoded Credentials & Secret Elimination | Secure environment variable configuration for Prisma, JWT secrets, and HMAC keys with fail-fast validation | Refactoring (R1) | Complete |
| 16 | CORS Policy Hardening & Least Privilege | Explicit allowed origin checking and strict role enforcement without arbitrary fallbacks | Refactoring (R1) | Complete |
| 17 | Database Query Bounding & Schema Optimization | Bounded pagination on all service queries, schema indexing (`DirectoryGroup.name`, `ReportSchedule`), and password sanitization | Refactoring (R1) | Complete |
| 18 | Structured Seeder Logging & IP Decorator | NestJS `Logger` adoption in Prisma seeders and reusable `@ClientIP()` custom parameter decorator | Refactoring (R1) | Complete |
| 19 | Test Suite Typing Hardening | Elimination of `any` / `as any` casts in adversarial test suites with strict mock typing | Refactoring (R1) | Complete |
| 20 | Monorepo Dependency Modernization | Zero-downgrade package upgrades across root, API, Web, and shared libraries with updated lockfile | Refactoring (R2) | Complete |
| 21 | Authoritative Engineering Directives (`GEMINI.md`) | Formalized architecture contracts, type safety, credential handling, query limits, and UI copy directives | Refactoring (R3) | Complete |
| 22 | Automated GitHub Actions CI Pipeline | Complete CI workflow in `.github/workflows/ci.yml` verifying format, lint, typecheck, test, and build | Refactoring (R4) | Complete |

## Milestones & Status
| Milestone | Scope | Dependencies | Status |
|-----------|-------|-------------|--------|
| **M1: Real-Time Notification Engine** | Schema, shared packages, REST endpoints, Socket.IO gateway, backend unit tests | None | COMPLETE |
| **M2: Domain Triggers & Alert Workers** | Inventory/Asset/License triggers, scheduled alert worker, expiration sweeps | M1 | COMPLETE |
| **M3: Notification Center UI** | Notification center page, drawer, navbar badge, audio settings, deep links | M1, M2 | COMPLETE |
| **M4: Monorepo Verification & Audit** | Full test execution, adversarial tests, build verification | M1, M2, M3 | COMPLETE |
| **Refactoring Phase 1: Dependency Modernization (R2)** | Monorepo dependency upgrades across 7 package manifests, zero downgrades, `pnpm-lock.yaml` generation | None | COMPLETE |
| **Refactoring Phase 2: Authoritative Guidelines (R3)** | Root `GEMINI.md` creation establishing strict behavioral and defect-prevention directives | None | COMPLETE |
| **Refactoring Phase 3: CI/CD Pipeline (R4)** | `.github/workflows/ci.yml` creation with comprehensive monorepo verification jobs | R2, R3 | COMPLETE |
| **Refactoring Phase 4: Code Refactoring & Security (R1)** | Resolve CONCERNS.md defects (secrets, CORS, unbounded queries, indexing, seeder logger, @ClientIP) | None | COMPLETE |
| **Refactoring Phase 5: Remote Push & CI Verification (R4)** | Commit all changes, push to `origin/main`, monitor CI run via `gh` CLI until green | R1, R2, R3, R4 | COMPLETE |

## Interface Contracts
### API ↔ Frontend WebSocket Protocol
- Namespace: `/notifications`
- Auth: `handshake.auth.token` or `handshake.headers.authorization` = `Bearer <jwt_token>`
- Rooms: `user:<userId>`, `role:<role>`
- Inbound Events: `notification:new` (NotificationItem), `notification:count` ({ unreadCount: number }), `notification:read` ({ id: string }), `notification:cleared` ()

### API REST Endpoints
- `GET /notifications`: Query `{ page?, limit?, category?, type?, isRead?, search?, startDate?, endDate? }` -> `{ data: NotificationItem[], total: number, page: number, limit: number, unreadCount: number }`
- `GET /notifications/unread-count`: -> `{ count: number }`
- `PATCH /notifications/:id/read`: -> `NotificationItem`
- `POST /notifications/mark-all-read`: -> `{ count: number }`
- `DELETE /notifications/:id`: -> `{ success: true }`
- `DELETE /notifications`: -> `{ count: number }`

## Code Layout
- Root:
  - `package.json` — Monorepo scripts, toolchain dependencies
  - `GEMINI.md` — Authoritative engineering & defect prevention directives
  - `PROJECT.md` — Architecture, feature inventory, and milestone tracking
  - `.github/workflows/ci.yml` — GitHub Actions CI pipeline
- `packages/shared-types` — DTOs, enums, API envelopes, and WebSocket event types
- `packages/shared-validators` — Zod runtime schemas
- `packages/shared-utils` — Common helper functions
- `packages/eslint-config` — Monorepo linting configurations
- `apps/api` — NestJS REST API, Prisma ORM, background workers, and Socket.IO gateway
- `apps/web` — React 19 SPA, Ant Design v6 UI, Zustand stores, and Vite build configuration

# Project: UIMS Real-Time Notification System

## Architecture
- **Monorepo Structure**:
  - `apps/api`: NestJS, Prisma ORM, PostgreSQL, Socket.IO Gateway, `@nestjs/schedule`
  - `apps/web`: React 19, Vite, Ant Design v6+, Zustand, Socket.IO client
  - `packages/shared-types`: Common TypeScript models, DTOs, and WebSocket event types
  - `packages/shared-validators`: Zod validation schemas
  - `packages/shared-utils`: Common helper utilities
- **Data Flow & Communication**:
  - Domain events in `apps/api` (assets, inventory, licenses, audit) invoke `NotificationsService`.
  - `NotificationsService` persists records to PostgreSQL via Prisma and invokes `NotificationsGateway`.
  - `NotificationsGateway` broadcasts real-time events over `/notifications` Socket.IO namespace to authenticated user (`user:<userId>`) and role (`role:<role>`) rooms.
  - Background alert workers (`ScheduledAlertsWorker`) run periodic cron sweeps for upcoming license/warranty expirations and low stock conditions.
  - `apps/web` connects to Socket.IO `/notifications` with JWT credentials, updates unread counts, displays toasts, plays chimes according to persistent user settings, and provides both a slide-out drawer and a full-page notification center at `/notifications`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Notification Schema & Persistence | Notification model with types (INFO, WARNING, ALERT), indexing, and Prisma persistence | M1 | ORIGINAL_REQUEST §R1 |
| 2 | REST API Endpoints | Paginated listing with filtering (category, status, type, date, search), unread count, mark read, mark all read, delete single & clear all | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Authenticated WebSocket Gateway | Socket.IO gateway with JWT authentication, tenant/user/role room routing, and event dispatchers (`notification:new`, `notification:count`, `notification:read`, `notification:cleared`) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Shared Types & Validators | Notification DTOs, query parameters, Zod schemas in `shared-types` and `shared-validators` | M1 | Codebase Survey |
| 5 | Inventory Domain Triggers | Low stock alerts (<= minThreshold), out of stock alerts (0 units), and restock event notifications | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Asset Domain Triggers | Asset assignment alerts, critical status transition alerts (MAINTENANCE, LOST), and audit logging | M2 | ORIGINAL_REQUEST §R2 |
| 7 | License Domain Triggers | Seat allocation alerts (90% capacity, 100% capacity), status transitions (EXPIRING_SOON, EXPIRED) | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Scheduled Alert Worker | Daily cron sweeps for expiring licenses (30/15/7/1 days), expiring warranties, overdue maintenance, with Redis/in-memory deduplication & throttling | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Top Navigation & Badge Counter | Real-time badge counter on bell icon in top header reflecting live unread count | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Quick-Access Notification Drawer | Responsive drawer with tabs, search, item mark read/delete, clear all, and link to full notification center | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Dedicated Notification Center Page | Full page at `/notifications` with `<PageContainer>`, KPI cards, multi-criteria filtering, batch action toolbar, high-density AntD v6 table, and pagination | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Real-Time Client Experience & Audio Settings | Real-time WebSocket hook with toasts, Web Audio API chimes, persistent sound/toast settings store, and "Notifications" settings tab | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Target Entity Deep Linking | Round-trip deep linking from notification item click to asset, license, and inventory detail drawers | M3 | ORIGINAL_REQUEST §R3 |
| 14 | E2E Verification & Quality Hardening | Monorepo typecheck, build, test suite execution, adversarial coverage check, and forensic audit | M4 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Real-Time Notification & Persistence Engine | Schema, shared types/validators, REST API, WebSocket gateway, backend tests | none | DONE |
| 2 | M2: Domain Event Triggers & Scheduled Alert Workers | Domain event hooks in services, ScheduledAlertsWorker cron sweeps, tests | M1 | DONE |
| 3 | M3: Enterprise Notification Center UI & Client Experience | `/notifications` page, drawer, navbar badge, sound settings store, deep linking, frontend tests | M1 | DONE |
| 4 | M4: E2E Integration, Verification & Hardening | Full monorepo typecheck, build, test suites, adversarial testing, forensic audit | M1, M2, M3 | DONE |

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
- `packages/shared-types/src/dto/notification.dto.ts`
- `packages/shared-validators/src/notification.validator.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/notifications/`
  - `notifications.module.ts`
  - `notifications.service.ts`
  - `notifications.controller.ts`
  - `notifications.gateway.ts`
  - `notifications.service.spec.ts`
  - `scheduled-alerts.worker.ts`
  - `scheduled-alerts.worker.spec.ts`
- `apps/api/src/modules/inventory/inventory.service.ts`
- `apps/api/src/modules/assets/assets.service.ts`
- `apps/api/src/modules/licenses/licenses.service.ts`
- `apps/web/src/pages/notifications/`
  - `NotificationsPage.tsx`
  - `NotificationsPage.test.tsx`
- `apps/web/src/stores/notification-settings.store.ts`
- `apps/web/src/hooks/useRealtimeNotifications.ts`
- `apps/web/src/components/NotificationDrawer.tsx`
- `apps/web/src/pages/settings/SettingsPage.tsx`
- `apps/web/src/app/router.tsx`

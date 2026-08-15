# UIMS — Unified IT Management System (Full LLM Specification & Reference)

> **UIMS (Unified IT Management System)** — Enterprise-Grade Centralized IT Operations, Asset Management, Identity Governance, Network IPAM, SaaS Subscriptions, and Incident Helpdesk Platform.
> Built on standard modern web architecture: Monorepo (pnpm + Turborepo), React 19, Ant Design 6.6+, NestJS 11, Prisma 7 ORM, PostgreSQL 17, Redis 8, and Nginx TLS reverse proxy.

---

## 1. System Overview & Monorepo Architecture

UIMS is designed as a high-performance modular monolith with strict domain boundaries, shared contract packages, and end-to-end TypeScript type safety.

### Architecture Highlights:
- **Language Policy**: 100% English across all UI labels, code, documentation, comments, API payloads, and git commits.
- **Monorepo Engine**: `pnpm` workspaces (v11.21+) with `Turborepo` (v2.10+) build pipeline orchestration.
- **Data Invariant**: Centralized contract-first REST API envelopes for all responses: `{ success: true, data: T, timestamp: string }`.
- **Zero Drift Types**: Shared DTOs (`packages/shared-types`), runtime Zod validators (`packages/shared-validators`), and domain helpers (`packages/shared-utils`) consumed by both API and Web packages.

### Monorepo Structure:
```
uims/
├── apps/
│   ├── api/                     # Backend: NestJS 11 + Prisma 7 ORM + PostgreSQL 17 + Redis 8 + BullMQ
│   │   ├── prisma/              # Prisma schema, migrations, seed script
│   │   └── src/
│   │       ├── common/          # Filters, guards, interceptors, pipes, decorators
│   │       ├── database/        # Prisma service & connection lifecycle
│   │       ├── modules/         # Domain modules (auth, assets, licenses, directory, network, tickets, audit, email, inventory, reports, settings, dashboard, health)
│   │       └── main.ts          # API Bootstrap, Swagger OpenAPI, Global pipes/filters/interceptors
│   └── web/                     # Frontend: React 19 + Ant Design 6.6+ + Vite 8 + Zustand 5 + TanStack Query 5
│       └── src/
│           ├── app/             # Router, App root, Ant Design theme tokens & ConfigProvider
│           ├── components/      # Reusable UI (PageContainer, CommandPalette, NotificationDrawer)
│           ├── layouts/         # MainLayout (collapsible sidebar, responsive drawer, topbar), AuthLayout
│           ├── pages/           # Domain views (dashboard, assets, licenses, directory, network, tickets, inventory, email, audit, reports, settings, login)
│           ├── services/        # Axios HTTP client & API service endpoints
│           ├── stores/          # Zustand stores (auth.store.ts, theme.store.ts)
│           └── styles/          # Global styles, variables, typography, custom scrollbars
├── packages/
│   ├── shared-types/            # Common TypeScript interfaces, DTOs, Enums, and API envelopes
│   ├── shared-validators/       # Zod runtime validation schemas
│   └── shared-utils/            # Formatting (date, currency, bytes, strings) and helper routines
├── docker/                      # Multi-stage Dockerfiles, Nginx TLS proxy configuration, Postgres init
├── .planning/                   # GSD architecture, conventions, stack, concerns, and roadmap docs
├── llms.txt                     # Concise LLM quick reference index
├── llms-full.txt                # Complete exhaustive technical specification (this document)
└── agents.md                    # AI pair-programming and development guidelines
```

---

## 2. Infrastructure, Ports & Network Topology

UIMS is completely containerized with Docker Compose. Direct public web traffic is served over native HTTPS with TLS 1.2/1.3 and HTTP2 termination via Nginx.

### Port Topology Matrix:

| Service | Container Name | Internal Port | Host / Exposed Port | Description / Notes |
|:---|:---|:---|:---|:---|
| **Web UI (Nginx HTTPS)** | `uims-web` | `443` (SSL) / `80` | **`5679`** | Primary Public Access: React SPA + Proxies `/api/` over TLS |
| **API Backend (NestJS)** | `uims-api` | `3000` | `3002` | REST API Backend. Health check: `/api/v1/health` |
| **PostgreSQL 17** | `uims-postgres` | `5432` | `5433` | Primary relational database (User: `uims`, DB: `uims_db`) |
| **Redis 8** | `uims-redis` | `6379` | `6381` | Cache layer, session state, BullMQ background jobs |
| **MeiliSearch** | `uims-meilisearch` | `7700` | `7700` | Full-text search engine index |
| **SeaweedFS Filer** | `uims-seaweedfs-filer` | `8333` / `8888` | `8333` / `8888` | S3-compatible Object Storage API & Web Interface |
| **SeaweedFS Master** | `uims-seaweedfs-master` | `9333` | `9333` | Storage cluster consensus & volume coordination |
| **SeaweedFS Volume** | `uims-seaweedfs-volume` | `8080` | `8080` | File volume storage server |

### Access URLs:
- **Web Console (HTTPS)**: `https://localhost:5679` (or `https://<ip>:5679`)
- **API Swagger Docs**: `https://localhost:5679/api/v1/docs` (or `http://localhost:3002/api/v1/docs` internally)
- **API Health Check**: `https://localhost:5679/api/v1/health`

---

## 3. Database Schema & Data Models (Prisma ORM)

All models are defined in `apps/api/prisma/schema.prisma` with PostgreSQL 17 data types, foreign keys, cascade deletes, and composite indices.

### Enums:
```prisma
enum AssetStatus {
  AVAILABLE
  IN_USE
  MAINTENANCE
  RETIRED
  LOST
}

enum LicenseType {
  SUBSCRIPTION
  PERPETUAL
  OPEN_SOURCE
  VOLUME
  OEM
}

enum LicenseStatus {
  ACTIVE
  EXPIRED
  EXPIRING_SOON
  REVOKED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum IPStatus {
  AVAILABLE
  RESERVED
  ASSIGNED
}

enum AccountStatus {
  ACTIVE
  DISABLED
  LOCKED
  SUSPENDED
}

enum DirectorySource {
  LOCAL
  LDAP
  AZURE_AD
}

enum NotificationType {
  INFO
  WARNING
  ALERT
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

### Key Models & Relationships:

#### Identity & RBAC:
- **`User`**: Core system user with email, hashed credentials, role assignment, profile metadata, timestamps, relations to created/assigned tickets, audit logs, and notifications.
- **`Role`**: Named RBAC role (`Super Admin`, `IT Admin`, `Asset Manager`, `Helpdesk Lead`, `Auditor`, `Employee`).
- **`Permission`**: Granular action/subject permissions (`action: "read"`, `subject: "Asset"`, optional JSON conditions).
- **`RolePermission`**: Many-to-many junction joining `Role` and `Permission`.

#### Assets & Hardware Fleet:
- **`Asset`**: Hardware asset (`assetTag`, `name`, `categoryId`, `status`, `serialNumber`, `model`, `manufacturer`, `purchaseDate`, `purchaseCost`, `warrantyExpiry`, `assignedToId`, `locationId`, `specs`, `notes`).
- **`AssetCategory`**: Self-referencing hierarchical category tree (`parentId` / `children`).
- **`AssetHistory`**: Audit log of historical changes per asset (`action`, `changedBy`, `oldValue`, `newValue`, `timestamp`).
- **`Location`**: Physical office/datacenter building, floor, room, address.
- **`Vendor`**: Supplier/vendor contact directory.

#### Software & SaaS Licenses:
- **`License`**: Software subscription (`name`, `vendor`, `licenseKey`, `type`, `totalSeats`, `usedSeats`, `costPerSeat`, `purchaseDate`, `expiryDate`, `status`, `autoRenew`).
- **`LicenseAssignment`**: Allocation of a license seat to an employee/user with department, assignedAt, and unassignedAt timestamps.

#### Directory & IAM:
- **`DirectoryUser`**: Synchronized enterprise directory account (`username`, `email`, `displayName`, `jobTitle`, `department`, `role`, `twoFactorEnabled`, `accountStatus`, `source`: `LOCAL` | `LDAP` | `AZURE_AD`).
- **`DirectoryGroup`**: Security and distribution group with member count and access scope.
- **`DirectoryMembership`**: Junction linking `userId` and `groupId`.

#### Network & IPAM:
- **`VLAN`**: VLAN ID, name, description.
- **`Subnet`**: IP subnet (`cidr`, `name`, `vlanId`, `gateway`, `totalIps`, `usedIps`, `location`).
- **`IPAddress`**: Specific IP allocation (`address`, `hostname`, `macAddress`, `deviceType`, `subnetId`, `status`: `AVAILABLE` | `RESERVED` | `ASSIGNED`, `pingStatus`, `lastSeen`, `assignedTo`).

#### Servicing & Incident Helpdesk:
- **`Ticket`**: Support ticket (`ticketCode`, `title`, `description`, `category`, `priority`, `status`, `requesterName`, `requesterEmail`, `assigneeName`, `affectedAsset`, `createdById`, `assignedToId`, `slaDeadline`, `dueDate`, `resolvedAt`).
- **`TicketCategory`**: Categories for helpdesk tickets (Hardware, Software, Access, Network).
- **`TicketComment`**: Conversation thread items (`ticketId`, `authorId`, `authorName`, `isStaff`, `content`, `isInternal`).

#### Inventory & Spare Parts:
- **`InventoryItem`**: Spare stock item (`sku`, `name`, `category`, `quantity`, `minThreshold`, `unitCost`, `location`, `binNumber`, `supplier`).

#### Mail & Exchange:
- **`EmailAccount`**: Hosted mailbox (`address`, `displayName`, `type`, `department`, `quotaUsed`, `quotaTotal`, `status`, `forwardingAddress`, `autoReplyEnabled`, `aliases`).

#### Governance, Telemetry & Auditing:
- **`AuditLog`**: Tamper-evident mutation log (`userId`, `userEmail`, `action`, `severity`, `entity`, `entityType`, `entityId`, `ipAddress`, `status`, `details`, `diffPayload`, `userAgent`, `timestamp`).
- **`Notification`**: In-app notifications with read status and target link.
- **`Setting`**: System configuration store (key, value as JSON, group, description).
- **`ReportSchedule`**: Automated executive report scheduler (frequency, format, recipients).

---

## 4. REST API Specifications (`/api/v1/*`)

All REST endpoints follow strict conventions, return standardized response envelopes, and validate payloads with Zod and NestJS ValidationPipes.

### Standard Response Formats:

#### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-08-14T12:00:00.000Z"
}
```

#### Error Response:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["Serial number is required", "Invalid IP address format"],
  "timestamp": "2026-08-14T12:00:00.000Z",
  "path": "/api/v1/assets"
}
```

### Complete API Route Catalog:

#### 1. Authentication & Session (`/api/v1/auth`)
- `POST /api/v1/auth/login` — Authenticate user via email & password, returns JWT `{ accessToken, user }`.
- `POST /api/v1/auth/register` — Provision initial administrative user account.
- `GET /api/v1/auth/me` — Retrieve current authenticated user profile, permissions, and active role.
- `POST /api/v1/auth/logout` — Invalidate user session.
- `POST /api/v1/auth/refresh` — Refresh expired access token.

#### 2. Operations & Dashboard (`/api/v1/dashboard`)
- `GET /api/v1/dashboard/stats` — High-level KPI aggregations (Total Assets, Active Licenses, Open Tickets, Network Utilization).
- `GET /api/v1/dashboard/recent-activity` — Recent 10 audit and incident events.
- `GET /api/v1/dashboard/charts` — Trend data for asset procurement, ticket resolution velocity, and license burn rate.

#### 3. Hardware Fleet & Assets (`/api/v1/assets`)
- `GET /api/v1/assets` — List assets with pagination, full-text search, category filter, status filter, and sorting.
- `POST /api/v1/assets` — Register new hardware asset.
- `GET /api/v1/assets/:id` — Retrieve full asset details including specs, assigned user, location, and history.
- `PATCH /api/v1/assets/:id` — Update asset metadata, assign user, change status.
- `DELETE /api/v1/assets/:id` — Retire or delete asset record.
- `GET /api/v1/assets/categories` — List asset category hierarchy.
- `GET /api/v1/assets/:id/history` — Retrieve audit history for specific asset.

#### 4. SaaS & Software Licenses (`/api/v1/licenses`)
- `GET /api/v1/licenses` — List software licenses with seat utilization, renewal dates, and status.
- `POST /api/v1/licenses` — Create new software license contract.
- `GET /api/v1/licenses/:id` — Get license details and list of assigned user seats.
- `PATCH /api/v1/licenses/:id` — Update license key, seats count, or expiration date.
- `DELETE /api/v1/licenses/:id` — Delete license record.
- `POST /api/v1/licenses/:id/assign` — Assign license seat to an employee.
- `DELETE /api/v1/licenses/:id/assign/:assignmentId` — Revoke license assignment seat.

#### 5. Identity & Directory IAM (`/api/v1/directory`)
- `GET /api/v1/directory/users` — List directory accounts with search, 2FA status, and department filters.
- `POST /api/v1/directory/users` — Provision new directory user account.
- `GET /api/v1/directory/users/:id` — Get directory user profile, assigned groups, assets, and licenses.
- `PATCH /api/v1/directory/users/:id` — Update user attributes or toggle account lock/status.
- `DELETE /api/v1/directory/users/:id` — Deprovision directory user.
- `GET /api/v1/directory/groups` — List directory security groups.
- `POST /api/v1/directory/groups` — Create new directory group.

#### 6. Network & IPAM (`/api/v1/network`)
- `GET /api/v1/network/ips` — List allocated and available IP addresses with ping status and MAC address.
- `POST /api/v1/network/ips` — Assign static IP address to host or device.
- `PATCH /api/v1/network/ips/:id` — Update IP allocation, status, or hostname.
- `DELETE /api/v1/network/ips/:id` — Release IP back to available pool.
- `GET /api/v1/network/subnets` — List configured subnets, CIDR blocks, and utilization percentages.
- `POST /api/v1/network/subnets` — Create new subnet range.
- `GET /api/v1/network/vlans` — List VLANs and tagged subnets.

#### 7. Incident Helpdesk & Servicing (`/api/v1/tickets`)
- `GET /api/v1/tickets` — List tickets with status, priority, category, assignee, and SLA deadline.
- `POST /api/v1/tickets` — Open new support ticket / incident report.
- `GET /api/v1/tickets/:id` — Get ticket details, requester history, and comment conversation.
- `PATCH /api/v1/tickets/:id` — Update ticket status, reassign technician, change priority.
- `DELETE /api/v1/tickets/:id` — Close and archive ticket.
- `POST /api/v1/tickets/:id/comments` — Post public response or internal technician note.

#### 8. Spare Inventory (`/api/v1/inventory`)
- `GET /api/v1/inventory` — List stockroom items, quantities, minimum stock alerts, and bin locations.
- `POST /api/v1/inventory` — Add new stockroom SKU.
- `PATCH /api/v1/inventory/:id` — Update inventory item metadata.
- `POST /api/v1/inventory/:id/adjust` — Increment/decrement stock quantity with transaction reason.
- `DELETE /api/v1/inventory/:id` — Remove stock SKU.

#### 9. Mail & Exchange (`/api/v1/email`)
- `GET /api/v1/email/accounts` — List email accounts, mailbox sizes, quota consumption, and forwarders.
- `POST /api/v1/email/accounts` — Create mailbox or shared distribution alias.
- `PATCH /api/v1/email/accounts/:id` — Update quotas, auto-reply, or forwarding rules.
- `DELETE /api/v1/email/accounts/:id` — Delete or suspend email account.

#### 10. Governance & Security Audit (`/api/v1/audit`)
- `GET /api/v1/audit/logs` — Query mutation audit trail with actor, action, entity, date range, and payload diffs.
- `GET /api/v1/audit/stats` — Audit statistics (actions per hour, top actors, severity breakdown).
- `GET /api/v1/audit/export` — Export SOC2 compliant audit log report (CSV / JSON).

#### 11. Executive Reports (`/api/v1/reports`)
- `GET /api/v1/reports` — List scheduled and generated executive reports.
- `POST /api/v1/reports/schedule` — Create recurring report schedule (PDF, weekly/monthly).
- `POST /api/v1/reports/generate` — Trigger on-demand report compilation.

#### 12. System Settings & Governance (`/api/v1/settings`)
- `GET /api/v1/settings` — Get global system configurations (security policy, session timeout, integrations).
- `PATCH /api/v1/settings` — Update configuration key/value pairs.
- `POST /api/v1/settings/reset` — Restore default system configuration.

#### 13. Health & Readiness (`/api/v1/health`)
- `GET /api/v1/health` — Returns status of Postgres, Redis, Meilisearch, and SeaweedFS filer.

---

## 5. Frontend Architecture & Design System Guidelines

The frontend application (`apps/web`) is built with React 19, React Router v8, and Ant Design 6.6+.

### Core Frontend Principles:
1. **Dynamic Theme & Feedback Context**:
   - Always consume feedback instances via `const { message, modal, notification } = App.useApp();` within components rendered under `<App>`.
   - Never call static `message.error()` or `Modal.confirm()` directly, as static methods lack theme and context propagation.
2. **Ant Design 6 Semantic Tokens & Styles**:
   - `Statistic`: Use `styles={{ content: { ... } }}` instead of deprecated `valueStyle`.
   - `Card`: Use `styles={{ body: { ... } }}` instead of deprecated `bodyStyle`.
   - `Drawer`: Use `styles={{ body: { ... } }}` instead of deprecated `bodyStyle`.
3. **Sidebar Layout & Dimensions**:
   - Desktop `Sider`: Width `280px` (expanded), `80px` (collapsed).
   - Mobile `Drawer`: Width `290px` with left edge placement.
   - Menu items utilize full width with `minWidth: 0`, `overflow: hidden`, and `flexShrink: 0` badges to prevent text clipping.
   - Built-in `Tooltip` on organization switcher, user profile, and collapsed items for complete readability.
4. **Data Grid & Tables**:
   - Standardized `Table` columns with uppercase headers, subtle letter spacing, typed sort handlers, and tag renders.
   - Global pagination standard: `pageSize: 10`, `showSizeChanger: true`, `pageSizeOptions: ['10', '25', '50', '100']`.
5. **Page Structure & Breadcrumbs**:
   - All domain pages wrap their content in `<PageContainer title="..." subtitle="..." breadcrumbs={...} extra={...} stats={...}>`.

---

## 6. Authentication, Security & RBAC Matrix

### Token Lifecycle:
- **Access Token**: Short-lived JWT (15-60 min) containing `userId`, `email`, `role`, and permissions array. Transmitted via `Authorization: Bearer <token>` header.
- **Axios Interceptor**: Automatically refreshes token on 401 response or redirects to `/login` if session is revoked.
- **Password Security**: Passwords hashed with `bcrypt` (12 salt rounds).

### Role-Based Access Control (RBAC):

| Feature / Resource | Super Admin | IT Admin | Asset Manager | Helpdesk Lead | Auditor / Read-Only |
|:---|:---:|:---:|:---:|:---:|:---:|
| System Settings & Governance | Read / Write | Read Only | No Access | No Access | Read Only |
| Audit Trail Logs | Full Access | Full Access | No Access | No Access | Read Only |
| Hardware Fleet Management | Full Access | Full Access | Full Access | Read / Assign | Read Only |
| SaaS License Procurement | Full Access | Full Access | Full Access | Read Only | Read Only |
| Directory & IAM Provisioning | Full Access | Full Access | Read Only | Password Reset | Read Only |
| Network IPAM & Subnets | Full Access | Full Access | Read Only | Read Only | Read Only |
| Helpdesk Incident Management | Full Access | Full Access | Read Only | Full Access | Read Only |
| Stockroom Inventory | Full Access | Full Access | Full Access | Read / Deduct | Read Only |

---

## 7. Environment Variables Reference

A complete `.env.example` is maintained at repository root and in `apps/api/.env.example`:

```bash
# Node & Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
CORS_ORIGIN=https://localhost:5679,http://localhost:5173

# Database (PostgreSQL 17)
DATABASE_URL=postgresql://uims:uims_secret_password@localhost:5433/uims_db?schema=public

# Cache & Queues (Redis 8)
REDIS_HOST=localhost
REDIS_PORT=6381
REDIS_PASSWORD=

# Authentication & JWT
JWT_SECRET=uims_super_secure_jwt_secret_key_change_in_production_2026
JWT_EXPIRATION=7d
REFRESH_TOKEN_SECRET=uims_super_secure_refresh_jwt_secret_2026
REFRESH_TOKEN_EXPIRATION=30d

# Search Engine (MeiliSearch)
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey123

# Object Storage (SeaweedFS / S3)
S3_ENDPOINT=http://localhost:8333
S3_ACCESS_KEY=uims_s3_access
S3_SECRET_KEY=uims_s3_secret
S3_BUCKET=uims-attachments

# Public HTTPS Port (Nginx)
WEB_HTTPS_PORT=5679
```

---

## 8. Development Commands & Workflow

All routine tasks are orchestrated via `pnpm` and `Turborepo`:

```bash
# Development
pnpm dev              # Launch all apps (API on 3000, Web on 5173/5679)
pnpm dev:api          # Launch API backend in watch mode
pnpm dev:web          # Launch React web frontend in Vite dev server

# Build & Quality Checks
pnpm build            # Compile all packages and applications
pnpm lint             # Run Biome lint checks
pnpm lint:fix         # Autofix Biome lint issues
pnpm format           # Format codebase with Biome
pnpm test             # Run unit tests across all packages
pnpm test:e2e         # Execute Playwright end-to-end tests

# Database Lifecycle (Prisma)
pnpm db:generate      # Generate Prisma Client types
pnpm db:migrate       # Run development schema migrations
pnpm db:migrate:prod  # Deploy migrations in production
pnpm db:seed          # Seed database with initial roles, admin user, and dummy assets
pnpm db:studio        # Open Prisma Studio web inspector

# Docker Infrastructure
pnpm docker:up        # Start Postgres, Redis, Meilisearch, SeaweedFS, Nginx in background
pnpm docker:down      # Stop and remove containers
pnpm docker:dev       # Launch full stack in Docker dev mode with hot-reload
```

---
*UIMS LLM Reference Specification — Standardized & Maintained for AI Agents (2026)*

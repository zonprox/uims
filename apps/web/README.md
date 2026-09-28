<!-- generated-by: gsd-doc-writer -->
# @uims/web

Web frontend single-page application (SPA) for the Unified IT Management System (UIMS), built with React 19, Ant Design 6, and Vite 8.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/web` delivers the unified administrative interface for enterprise IT operations. It equips system administrators, IT support staff, and network engineers with tools for hardware asset lifecycle management, interactive network IPAM and rack elevation, software license compliance, organizational hierarchy visualization, fine-grained role-based access control (RBAC), and real-time operational notifications.

### Core Architecture & Tech Stack

- **UI Framework:** React 19 (`react`, `react-dom`) with TypeScript 7
- **Design System:** Ant Design 6 (`antd`, `@ant-design/icons`, `@ant-design/pro-components`) with dynamic semantic tokens and dark mode support
- **Build Tool:** Vite 8 (`vite`, `@vitejs/plugin-react`) with manual vendor chunking and HMR
- **Routing:** React Router v8 (`react-router`) with route-level code splitting and lazy loading
- **State Management:**
  - **Server State:** TanStack React Query v5 (`@tanstack/react-query`) with automatic caching, background revalidation, and mutation invalidation
  - **Client State:** Zustand 5 (`zustand`) for authentication, theme preferences, timezone settings, and notification configurations
- **Data Fetching:** Axios (`axios`) featuring automated JWT silent refresh interceptors and request deduplication
- **Real-Time Communication:** Socket.IO client (`socket.io-client`) for push notifications and system health events
- **Validation:** Runtime Zod schemas (`zod`) shared via `@uims/shared-validators`
- **Date & Time:** Day.js (`dayjs`) with timezone extensions and locale formatting
- **QR & Barcodes:** `jsqr` for camera-based QR code asset scanning and SVG generation for printable asset labels
- **Testing:** Vitest 5 (`vitest`) paired with `happy-dom`

---

## Installation

Dependencies are managed using `pnpm` workspaces from the repository root:

```bash
# Install all monorepo dependencies
pnpm install
```

To install or update dependencies exclusively for `@uims/web`:

```bash
pnpm --filter @uims/web install
```

---

## Usage

### Development Server

Start the Vite development server using one of the following commands:

```bash
# From repository root (starts web app only)
pnpm run dev:web

# From repository root (starts all monorepo apps via Turborepo)
pnpm run dev

# Or directly from the apps/web directory
cd apps/web
pnpm run dev
```

The application runs locally at:
- **Local URL:** `http://localhost:5679` (or `https://localhost:5679` when development SSL certificates are present in `certs/`)
- **API Proxy:** In development, Vite automatically reverse-proxies `/api` and `/socket.io` requests to the backend API (`http://localhost:3002`, or `http://uims-api-dev:3000` when running in Docker).

### Available Scripts

The following scripts are defined in `apps/web/package.json`:

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `vite` | Starts the Vite development server on port 5679 with HMR |
| `build` | `tsc && vite build` | Performs TypeScript typechecking and compiles production bundles to `dist/` |
| `preview` | `vite preview` | Serves the production build locally for verification |
| `lint` | `eslint "src/**/*.{ts,tsx}"` | Validates TypeScript and TSX source files against ESLint rules |
| `typecheck` | `tsc --noEmit` | Validates TypeScript types across `src/` without emitting files |
| `test` | `vitest run` | Executes the test suite once across all test files |
| `clean` | `rm -rf dist` | Removes previous build artifacts |

### Environment Configuration

Configuration variables can be defined in a `.env` file at the monorepo root or passed as system environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `WEB_PORT` | `5679` | Port for the Vite development server and container mapping |
| `APP_PORT` | `3002` | Backend API port targeted by the Vite reverse proxy during local development |
| `API_PROXY_URL` | *Derived* | Target proxy URL override for `/api` and `/socket.io` (e.g., `http://localhost:3002`) |
| `VITE_API_URL` | `http://localhost:3000/api/v1` | Direct API endpoint URL used as fallback when proxying is disabled |
| `VITE_WS_URL` | *Derived* | Direct WebSocket URL override for Socket.IO notification connections |
| `VITE_APP_NAME` | `UIMS` | Application display name rendered in headers and document title |

---

## Directory Structure

```
apps/web/
├── certs/                     # Local SSL certificates (cert.pem, key.pem) for HTTPS dev
├── dist/                      # Production build output (generated)
├── public/                    # Static public assets (icons, manifest, logos)
├── src/
│   ├── app/                   # Root application bootstrap and providers
│   │   ├── App.tsx            # Main React component, AntD App provider, theme wrapper
│   │   ├── query-client.ts    # TanStack QueryClient instance and query cache defaults
│   │   ├── router.tsx         # React Router v8 configuration with lazy route definitions
│   │   └── theme.ts           # Ant Design v6 theme algorithm and token configurations
│   ├── components/            # Reusable UI components
│   │   ├── Access/            # Declarative RBAC permission guards (<Can />)
│   │   ├── CommandPalette.tsx # Global launcher (Cmd/Ctrl + K) for rapid navigation
│   │   ├── ErrorBoundary.tsx  # React class error boundary for component exceptions
│   │   ├── ErrorResultView.tsx# Ant Design Result error displays (403, 404, 500, network)
│   │   ├── FormattedDate.tsx  # Timezone- and locale-aware date/timestamp formatter
│   │   ├── NotificationDrawer.tsx # Real-time Socket.IO notification drawer
│   │   ├── PageContainer.tsx  # Standard layout wrapper with title, breadcrumbs, and stats
│   │   ├── PageLoader.tsx     # Loading fallback spinner for Suspense boundaries
│   │   ├── RouteErrorBoundary.tsx # Router-level error boundary with error recovery
│   │   └── TimezoneSelector.tsx   # Global timezone dropdown selector
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAccess.ts       # RBAC permission checks (`can`, `hasRole`)
│   │   ├── useRealtimeNotifications.ts # Socket.IO connection and real-time events
│   │   └── useSystemHealth.ts # Background API health and telemetry polling
│   ├── layouts/               # Application shell layouts
│   │   ├── AuthLayout.tsx     # Session validation wrapper enforcing authentication
│   │   ├── MainLayout.tsx     # Main dashboard shell with collapsible sidebar and header
│   │   ├── menuConfig.tsx     # Role-aware sidebar navigation menu hierarchy
│   │   └── components/        # Sider, navbar, footer, and organization selector widgets
│   ├── pages/                 # Domain-specific route views
│   │   ├── access/            # Role-based access control and system user management
│   │   ├── assets/            # Hardware asset inventory, QR printing, scanner, specs
│   │   ├── audit/             # Security audit logs, diff views, and export filters
│   │   ├── auth/              # User login and credential authentication
│   │   ├── dashboard/         # Real-time operational KPI metrics and system health
│   │   ├── directory/         # Active Directory/LDAP users, groups, and sync status
│   │   ├── inventory/         # Spare parts, stock threshold alerts, spatial filters
│   │   ├── licenses/          # Software license compliance and seat assignment drawers
│   │   ├── network/           # Rack elevations, switch port faceplates, VLANs, and IPAM
│   │   ├── notifications/     # Full notifications inbox and severity filters
│   │   ├── organization/      # Interactive hierarchical organization structure canvas
│   │   ├── reports/           # Operational reports, asset utilization, and analytics
│   │   ├── settings/          # System configuration, dark mode, timezone, profile
│   │   └── NotFoundPage.tsx   # 404 fallback page
│   ├── services/              # Axios REST API service clients
│   │   ├── api.ts             # Axios instance with JWT refresh token interceptor
│   │   ├── assets.service.ts  # Asset inventory endpoints
│   │   ├── audit.service.ts   # System audit log queries
│   │   ├── auth.service.ts    # Authentication and token refresh endpoints
│   │   ├── dashboard.service.ts # Dashboard telemetry and metrics
│   │   ├── directory.service.ts # Directory user and group endpoints
│   │   ├── health.service.ts  # Backend health check
│   │   ├── inventory.service.ts # Consumable parts and stock operations
│   │   ├── licenses.service.ts  # Software license lifecycle endpoints
│   │   ├── network.service.ts # Racks, switches, ports, VLANs, and subnets
│   │   ├── notifications.service.ts # Notification management
│   │   ├── organization.service.ts # Organizational hierarchy endpoints
│   │   ├── reports.service.ts # Report data exports
│   │   ├── roles.service.ts   # Roles and permission matrices
│   │   ├── settings.service.ts # System settings and preferences
│   │   ├── users.service.ts   # System user administration
│   │   └── vendor.service.ts  # Vendor directory endpoints
│   ├── stores/                # Zustand client state stores
│   │   ├── auth.store.ts      # User session, JWT tokens, and login/logout actions
│   │   ├── notification-settings.store.ts # User notification preferences
│   │   ├── theme.store.ts     # Dark/light mode, compact view, primary color tokens
│   │   └── timezone.store.ts  # Active timezone and UTC offset calculation
│   ├── styles/                # Global style overrides and variables
│   ├── utils/                 # Frontend formatting and helper utilities
│   └── main.tsx               # Single-page application entry point
├── Dockerfile                 # Multi-stage production container build (Nginx)
├── Dockerfile.dev             # Container setup for containerized development
├── package.json               # Package manifest and dependencies
├── tsconfig.json              # TypeScript compilation configuration
├── vite.config.ts             # Vite build, proxy, alias, and chunking configuration
└── vitest.config.ts           # Vitest unit/component test configuration
```

---

## Key Features

### 1. Dashboard & Health Telemetry (`/`)
- Real-time operational KPI metrics (active assets, critical alerts, license seat saturation, pending tickets).
- System health telemetry widget with live status indicator for PostgreSQL, Redis, and API services.
- Recent activity log feed and quick-action shortcuts.

### 2. Hardware Asset Lifecycle Management (`/assets`)
- Comprehensive asset inventory table with advanced search, status filters, and sorting.
- Detail drawer (`AssetDetailDrawer`) displaying technical specifications, warranty status, assigned users, and maintenance history.
- Creation and editing modal (`AssetFormModal`) with dynamic specification schemas by asset category.
- Integrated camera QR scanner (`AssetScannerModal`) using `jsqr` for rapid barcode check-in.
- QR label generation and printable asset tag modal (`AssetQrModal`, `PrintableAssetLabel`).

### 3. Software License Compliance (`/licenses`)
- License pool tracking, expiration notifications, and seat saturation indicators.
- License detail drawer (`LicenseSeatsDrawer`) showing allocated users and workstation bindings.
- Dedicated modals for creating licenses and assigning/revoking seats (`LicenseFormModal`, `LicenseAssignmentModal`).

### 4. Network IPAM & Infrastructure (`/network`)
- **Equipment Rack Elevation (`RackElevationView`):** Visual interactive 42U/48U rack elevation rendering mounted devices, occupied slots, and power status.
- **Switch Fleet Management (`SwitchPortFaceplate`):** Interactive visual switch faceplate rendering ports (RJ45, SFP+), link statuses, VLAN assignments, and PoE allocation.
- **VLAN Management:** Segregated VLAN tables with subnet association, gateway definitions, and detail drawers (`VlanDetailDrawer`).
- **Subnet IPAM Planning:** Visual subnet address pools (`SubnetCardList`, `SubnetTable`) with IP allocation status, reservation management, and reverse lookup tracking.

### 5. Consumable Inventory & Stock Control (`/inventory`)
- Tracking of IT consumables, replacement components, and peripherals.
- Low-stock threshold alerts with warning badges.
- Spatial filtering by warehouse location, storage room, and shelf coordinates.
- Check-in and check-out workflows with automated audit trail logging.

### 6. Organizational Hierarchy Canvas (`/organization`)
- Interactive hierarchical canvas visualizing company organization units, divisions, departments, and positions.
- Tree and card elevation layouts representing reporting lines and team member counts.

### 7. Directory & Active Directory/LDAP Integration (`/directory`)
- Employee directory table with department, title, email, and phone filters.
- Active Directory / LDAP synchronization status monitoring and directory group membership views (`DirectoryGroupsTab`).

### 8. Role-Based Access Control (RBAC) & System Users (`/users`)
- Granular permission matrix drawer (`PermissionMatrixDrawer`) allowing module-level capability configuration (read, write, delete, export).
- Role management (`RolesTab`) supporting custom role creation (`CreateRoleModal`) and cloning existing role permissions (`RoleCloneModal`).
- Application user list (`AppUsersTab`) with role assignment and account status management.
- Declarative `<Can />` component ensuring fine-grained UI element security.

### 9. Real-Time Notifications & Inbox (`/notifications`)
- Push notifications delivered via Socket.IO for critical hardware events, license expirations, and stock warnings.
- Slide-over notification panel (`NotificationDrawer`) and full notifications management page.
- Sound and browser alert configuration persisted in local client storage.

### 10. Command Palette (`Cmd/Ctrl + K`)
- Keyboard-driven global search launcher (`CommandPalette.tsx`).
- Rapid jumping between system modules, specific asset lookups, and quick system actions.

### 11. Security Audit Trail (`/audit`)
- Immutable log viewer for tracking all administrative actions across the platform.
- JSON diff viewer showing before-and-after attribute changes.
- Filtering by actor, entity type, action type, and date range.

### 12. Theme & Internationalization Preferences (`/settings`)
- Light mode, dark mode, and compact display mode with dynamic Ant Design tokens.
- Global timezone configuration (`TimezoneSelector`) with instant timestamp re-rendering across all tables.

---

## Testing

Tests are written using [Vitest](https://vitest.dev/) with `happy-dom` as the lightweight browser DOM environment.

### Running Tests

```bash
# Run all web tests once
pnpm run test

# Run tests in interactive watch mode
pnpm exec vitest

# Run a specific test suite
pnpm exec vitest src/pages/assets/AssetsPage.test.tsx

# Run all workspace test suites from repository root
pnpm test
```

### Test Scope & Coverage

The test suite covers:
- **State Stores:** Zustand store operations, local storage persistence, and authentication flows (`src/stores/*.test.ts`).
- **Custom Hooks:** RBAC permission evaluation, health polling, and real-time Socket.IO subscriptions (`src/hooks/*.test.ts`).
- **Navigation & Layout:** Responsive drawer mechanics, accessible menu builders, and organizational context switching (`src/layouts/*.test.ts`).
- **UI Components & Pages:** Table rendering, modals, detail drawers, error boundaries, and form validation across all domain modules (`src/pages/**/*.test.tsx`).
- **API Services & Interceptors:** Axios client behavior, silent refresh token rotation, and error handling (`src/services/*.test.ts`).
- **Adversarial Resilience:** Stress testing for concurrent data mutations, partial API failures, and network edge cases.

---

## Docker Deployment

`@uims/web` includes production and development Docker configurations:

```bash
# Build the production Nginx image from the repository root
docker build -f apps/web/Dockerfile -t uims-web .

# Start the containerized web service via Docker Compose
docker compose up -d web
```

In production, the multi-stage `Dockerfile` compiles the single-page application using `pnpm run build` and serves optimized static assets via Nginx on ports 80/443 with security headers and API reverse proxy routing.

---

## Contributing

For guidelines on coding style, branching conventions, and pull request workflows, please refer to the [Monorepo Documentation](../../README.md) and [Development Guide](../../docs/DEVELOPMENT.md).

---

## License

This package is part of the private UIMS project. All rights reserved.

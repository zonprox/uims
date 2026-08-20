<!-- generated-by: gsd-doc-writer -->
# @uims/web

Web frontend application for the Unified IT Management System (UIMS), built with React 19, Ant Design 6, and Vite.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/web` is the single-page administrative client for UIMS. It provides user interfaces for IT asset lifecycle management, network IPAM planning, software license compliance, organization hierarchy modeling, RBAC access administration, audit log inspection, and real-time operational reporting.

### Tech Stack

- **Framework:** React 19 (`react`, `react-dom`) with TypeScript
- **UI Components:** Ant Design 6 (`antd`), `@ant-design/pro-components`, `@ant-design/icons`
- **Build Tool:** Vite 8
- **Routing:** React Router v8 (`react-router`)
- **State Management:** Zustand (client-side state) & TanStack React Query v5 (server-state cache & mutations)
- **HTTP Client:** Axios with automated JWT token refresh interceptors
- **Real-time:** Socket.IO client (`socket.io-client`)
- **Validation:** Zod schemas shared with backend via `@uims/shared-validators`
- **Date Handling:** Day.js (`dayjs`)
- **Testing:** Vitest with Happy DOM

## Installation

Dependencies are managed using `pnpm` workspaces from the monorepo root:

```bash
# From the repository root
pnpm install
```

To install or update dependencies specifically for `@uims/web`:

```bash
pnpm --filter @uims/web install
```

## Quick Start

### Development Server

Start the Vite development server using one of the following methods:

```bash
# From repository root (starts web app only)
pnpm run dev:web

# From repository root (starts all monorepo apps via Turborepo)
pnpm run dev

# Or directly within apps/web
cd apps/web
pnpm run dev
```

The web application runs locally at:
- **Local URL:** `http://localhost:5679` (or custom `WEB_PORT`)
- **API Proxy:** In development, Vite automatically proxies `/api` and `/socket.io` to the backend API target (`http://localhost:3002`, `http://localhost:3000`, or Docker container `http://uims-api-dev:3000`).

## Available Scripts

The following scripts are defined in `apps/web/package.json`:

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Starts Vite dev server with hot module replacement (HMR) |
| `pnpm run build` | Compiles TypeScript types (`tsc`) and builds production assets to `dist/` |
| `pnpm run preview` | Serves the production build locally for verification |
| `pnpm run lint` | Lints TypeScript and TSX source files using ESLint |
| `pnpm run typecheck` | Validates TypeScript types across `src/` without emitting files |
| `pnpm run test` | Executes the Vitest test suite (`vitest run`) |
| `pnpm run clean` | Removes the compiled `dist/` directory |

## Environment Configuration

Configuration variables are loaded from the root `.env` file or environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `WEB_PORT` | `5679` | Port used by the Vite development server and container mapping |
| `APP_PORT` | `3002` | Backend API port targeted by the Vite proxy during local development |
| `API_PROXY_URL` | *Derived* | Target proxy URL override for `/api` and `/socket.io` requests |
| `VITE_API_URL` | `http://localhost:3000/api/v1` | Direct API endpoint URL used as fallback for WebSocket/REST connections |
| `VITE_WS_URL` | *Derived* | WebSocket server URL override for real-time notifications |
| `VITE_APP_NAME` | `UIMS` | Application display name |

## Directory Structure

```
apps/web/
├── certs/                 # Development SSL certificates (optional HTTPS)
├── dist/                  # Production build output (generated)
├── public/                # Static public assets
├── src/
│   ├── app/               # Application bootstrap, router, theme, and query client
│   │   ├── App.tsx        # Top-level React application component
│   │   ├── query-client.ts# TanStack QueryClient instance and defaults
│   │   ├── router.tsx     # React Router v8 route definitions and lazy loaders
│   │   └── theme.ts       # Ant Design theme tokens and configuration
│   ├── components/        # Reusable UI components & widgets
│   │   ├── Access/        # RBAC declarative permission components (<Can />)
│   │   ├── CommandPalette.tsx # Global keyboard launcher (Cmd/Ctrl + K)
│   │   ├── ErrorBoundary.tsx  # Global error boundary handler
│   │   ├── FormattedDate.tsx  # Locale- and timezone-aware date renderer
│   │   ├── NotificationDrawer.tsx # Real-time Socket.IO notification panel
│   │   ├── PageContainer.tsx  # Standardized page layout wrapper
│   │   ├── PageLoader.tsx     # Loading fallback spinner for lazy components
│   │   ├── QuickConfigDrawer.tsx # Live theme and appearance customizer
│   │   ├── TimezoneSelector.tsx  # Global timezone picker
│   │   └── WorldClockWidget.tsx  # Multi-region operational world clock
│   ├── hooks/             # Custom React hooks (auth, access, health, notifications)
│   ├── layouts/           # Page layouts (MainLayout, AuthLayout, sidebar navigation)
│   ├── pages/             # Route page views (Dashboard, Assets, Licenses, Users, etc.)
│   ├── services/          # Axios API service clients for backend REST endpoints
│   ├── stores/            # Zustand state stores (auth, theme, timezone)
│   └── main.tsx           # Single-page application entry point
├── Dockerfile             # Multi-stage production container build (Nginx)
├── Dockerfile.dev         # Development container setup
├── package.json           # Package manifest and dependencies
├── tsconfig.json          # TypeScript compilation configuration
├── vite.config.ts         # Vite build, alias, chunking, and proxy configuration
└── vitest.config.ts       # Vitest test configuration
```

## Key Pages and Features

All routes are lazily loaded and defined in `src/app/router.tsx`:

- **Dashboard (`/`)**: Real-time KPI summaries, system health telemetry, activity cards, and world clock widgets.
- **Hardware Assets (`/assets`)**: Asset inventory table, advanced filters, asset detail drawers, QR code generation, and lifecycle management modals.
- **Software Licenses (`/licenses`)**: Software seat allocation tracking, license expiration alerts, and compliance overviews.
- **Organization Structure (`/organization`)**: Interactive hierarchical organization canvas for company units, departments, and positions.
- **Users & Access (`/users`)**: RBAC administration, role matrix inspection, custom role creation/cloning, access simulation, and directory integration.
- **Network & IPAM (`/network`)**: IP address management, subnet visualization, DNS record tables, and connectivity diagnostics.
- **Inventory Management (`/inventory`)**: Consumable parts tracking, stock thresholds, and check-in/check-out audit workflows.
- **Audit Trail (`/audit`)**: Security audit logs, user action tracking, entity diff inspection, and event filtering.
- **Reports & Analytics (`/reports`)**: Customizable operational reports, cost analytics, and data exports.
- **Settings (`/settings`)**: Theme customization, default timezone, security preferences, and system parameters.
- **Authentication (`/login`)**: User login screen with JWT credentials and automatic redirection.

## Testing

Tests are written using [Vitest](https://vitest.dev/) with `happy-dom` as the DOM environment.

```bash
# Run all tests for @uims/web
pnpm run test

# Run tests in watch mode
pnpm exec vitest

# Run all workspace tests from repository root
pnpm test
```

### Test Scope

Unit and component tests cover:
- Global state store transitions (`src/stores/*.test.ts`)
- Custom React hooks (`src/hooks/*.test.ts`)
- Navigation menu and layout builders (`src/layouts/*.test.ts`)
- Interactive canvas and page components (`src/pages/**/*.test.tsx`, `src/pages/**/hooks/*.test.ts`)
- API service clients and token refresh interceptors (`src/services/*.test.ts`)

## Docker Deployment

`@uims/web` includes production and development Docker configurations:

```bash
# Build production Nginx image from repo root
docker build -f apps/web/Dockerfile -t uims-web .

# Start containerized stack via Docker Compose
docker compose up -d web
```

In production, the multi-stage `Dockerfile` compiles the SPA using `pnpm run build` and serves static assets via Nginx on ports 80/443 with custom reverse-proxy and SSL rules.

## Contributing

For guidelines on coding style, branching conventions, and pull request workflows, please see the [Monorepo Documentation](../../README.md) and [Development Guide](../../docs/DEVELOPMENT.md).

## License

This package is part of the private UIMS project. All rights reserved.

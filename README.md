# UIMS — Unified IT Management System

> One platform. Complete IT control.

Enterprise-grade centralized IT management platform built with modern 2026 tech stack.

## Tech Stack

| Layer | Technology | Version |
|:------|:-----------|:--------|
| Runtime | Node.js | 24 LTS |
| Language | TypeScript | 7.0.2 |
| Frontend | React + Ant Design | 19.2.8 + 6.6.0 |
| Build | Vite | 8.2.1 |
| Backend | NestJS | 11.1.29 |
| ORM | Prisma | 7.9.1 |
| Database | PostgreSQL | 18.6 |
| Cache | Redis | 8.8 |
| Queue | BullMQ | 6.1.0 |
| Search | MeiliSearch | 1.12 |
| Storage | SeaweedFS | Latest |
| Monorepo | Turborepo + pnpm | 2.10.7 + 11.21.0 |

## Modules

- **Dashboard** — KPIs, charts, alerts, system health
- **Asset Management** — Hardware/software lifecycle tracking
- **License Management** — Software license compliance
- **Directory Services** — AD/LDAP user synchronization
- **Email Management** — Email account lifecycle
- **Network & IP** — IPAM, subnets, VLANs, DNS
- **Hardware Inventory** — Physical inventory tracking
- **Audit & Compliance** — Full audit trail
- **Reports & Analytics** — Custom reports, exports
- **Settings & Admin** — RBAC, system configuration

## Quick Start

### Prerequisites

- Node.js >= 24
- pnpm >= 11
- Docker & Docker Compose

### Development Setup

```bash
# Clone the repository
git clone <repo-url> uims
cd uims

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure services
docker compose up -d postgres redis meilisearch seaweedfs-master seaweedfs-volume seaweedfs-filer

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed the database
pnpm db:seed

# Start development servers with Hot Reload
pnpm dev
```

- API with live reload: `http://localhost:3002` (Swagger at `http://localhost:3002/api/v1/docs`)
- Web app with Vite HMR: `http://localhost:5679`

### Default Credentials

| Email | Password | Role |
|:------|:---------|:-----|
| admin@uims.local | Admin@2026 | Super Admin |

### Docker Development (Hot Reload enabled)

```bash
# Start all services with hot reload & volume mounts
pnpm docker:dev

# View logs
pnpm docker:dev:logs

# Stop development containers
pnpm docker:dev:down
```

### Docker Production Deployment

```bash
# Build and start all production services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Project Structure

```
uims/
├── apps/
│   ├── api/              # NestJS backend
│   └── web/              # React + Ant Design frontend
├── packages/
│   ├── shared-types/     # Shared TypeScript interfaces
│   ├── shared-validators/# Shared Zod validation schemas
│   ├── shared-utils/     # Shared utility functions
│   └── eslint-config/    # Shared ESLint configuration
├── docker/               # Docker configuration files
├── docker-compose.yml    # Multi-service orchestration
├── turbo.json            # Turborepo pipeline config
└── pnpm-workspace.yaml   # Workspace definition
```

## Scripts

| Command | Description |
|:--------|:------------|
| `pnpm dev` | Start all dev servers (Hot Reload enabled) |
| `pnpm dev:api` | Start API server only (watch mode) |
| `pnpm dev:web` | Start web app only (Vite HMR) |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:dev` | Start Docker dev stack with Hot Reload & volume mounts |
| `pnpm docker:dev:down` | Stop Docker dev stack |
| `pnpm docker:up` | Start Docker production services |
| `pnpm docker:down` | Stop Docker production services |

## API Documentation

Swagger/OpenAPI docs are available at `http://localhost:3002/api/v1/docs` when the API server is running.

## License

UNLICENSED — Proprietary

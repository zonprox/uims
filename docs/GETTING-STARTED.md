<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you through setting up the Unified IT Management System (UIMS) on your local development machine.

## Prerequisites

Ensure you have the following software installed before proceeding:

- **Node.js**: `>=22.0.0` (validated against `package.json` engines)
- **pnpm**: `>=11.0.0` (workspace configured with `pnpm@11.21.0`)
- **Docker & Docker Compose**: Required for running the containerized backing services (PostgreSQL 17, Redis 8, MeiliSearch, SeaweedFS).

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url> uims
cd uims
```

### 2. Install Dependencies

Install workspace dependencies using `pnpm`:

```bash
pnpm install
```

### 3. Configure Environment Variables

Create your local environment configuration file from the provided template:

```bash
cp .env.example .env
```

#### Key Environment Variables

The `.env.example` template contains pre-configured defaults. Note the following essential configurations:

- **`AUDIT_SIGNING_KEY`** (**Required**): Cryptographic secret key used to generate tamper-evident HMAC SHA-256 signatures for audit log entries. Must be at least **32 characters long**.
- **`JWT_SECRET` & `JWT_REFRESH_SECRET`** (**Required**): Cryptographic keys used for signing and verifying JWT tokens. Must each be at least **32 characters long**.
- **`DATABASE_PORT` vs. Docker Host Port**:
  - In `.env.example`, `DATABASE_PORT=5432`.
  - In `docker-compose.yml`, the PostgreSQL service maps the container port `5432` to host port `${DATABASE_PORT:-5433}`. If `DATABASE_PORT` is not set, it defaults to `5433`.
  - **Important**: If you already have PostgreSQL running locally on port 5432, you should change `DATABASE_PORT=5433` in your `.env` so Docker uses 5433.
- **`REDIS_PORT`**: In `docker-compose.yml`, Redis maps internal port `6379` to host port `${REDIS_PORT:-6381}`.
- **`APP_PORT`**: Port for the NestJS API server (defaults to `3000` in `.env.example`).
- **`WEB_PORT`**: Port for the Vite web frontend dev server (defaults to `5679`).
- **`MEILISEARCH_*` & `S3_*`**: Configuration for full-text search (MeiliSearch) and object storage (SeaweedFS S3 gateway).

For comprehensive details on all configuration parameters, consult [CONFIGURATION.md](file:///home/user/projects/uims/docs/CONFIGURATION.md).

---

## First Run

### 1. Initialize Database Schema & Seed Data

Ensure Docker is running, then initialize the database schema and populate initial administrative users and taxonomy.

Start the backing infrastructure via Docker Compose:
```bash
pnpm run docker:up
```

Run database migrations and seed:
```bash
# Generate the Prisma Client
pnpm run db:generate

# Run database migrations
pnpm run db:migrate

# Seed initial roles, permissions, taxonomy, and admin account
pnpm run db:seed
```

### 2. Start the Development Stack

UIMS provides a Universal Dev Stack CLI that orchestrates the entire application environment (infrastructure containers, backend API, Vite frontend, and Cloudflare tunnel).

```bash
pnpm run stack:start
```

This command runs `./scripts/dev.sh start` in the background and sets up:
- Infrastructure: Postgres 17, Redis 8, Meilisearch, SeaweedFS (via Docker)
- Backend API: NestJS API on port `3002` (or `$APP_PORT`)
- Frontend: Vite React SPA on port `5679` (HTTPS + HMR)
- Public Tunnel: A Cloudflare quick tunnel for remote access.

**Other helpful stack commands:**
- `pnpm run stack:status`: Displays live PID, port listening status, API health, and active Cloudflare tunnel URL.
- `pnpm run stack:logs`: Streams logs from API, Web, and Tunnel.
- `pnpm run stack:url`: Displays the current public Cloudflare tunnel URL.
- `pnpm run stack:stop`: Gracefully terminates the dev stack. Use `./scripts/dev.sh stop --all` to also stop Docker containers.

---

## Application Access Endpoints

Once the stack is started, you can access the application components:

| Component | URL | Notes |
|---|---|---|
| **Web Interface** | [`https://localhost:5679`](https://localhost:5679) | React + Ant Design frontend (HTTPS) |
| **API Server** | [`http://localhost:3000`](http://localhost:3000) | NestJS REST backend (Prefix: `/api/v1`) |
| **API Documentation (Swagger)**| [`http://localhost:3000/api/v1/docs`](http://localhost:3000/api/v1/docs) | Interactive OpenAPI / Swagger UI |
| **MeiliSearch** | [`http://localhost:7700`](http://localhost:7700) | Search engine dashboard / API |
| **SeaweedFS S3 Gateway** | [`http://localhost:8333`](http://localhost:8333) | S3-compatible object storage endpoint |
| **SeaweedFS Filer UI** | [`http://localhost:8888`](http://localhost:8888) | Web-based file browser for SeaweedFS |

### Default Credentials (from Seed)

When you execute `pnpm run db:seed`, the database is populated with initial enterprise roles and demo accounts:

- **Admin**: `admin@youngonevn.com` / `Youngone@2026` (Role: `Admin`)
- **Manager**: `manager@youngonevn.com` / `Youngone@2026` (Role: `Manager`)
- **User**: `user@youngonevn.com` / `Youngone@2026` (Role: `User`)
- **Viewer**: `viewer@youngonevn.com` / `Youngone@2026` (Role: `Viewer`)

*(All demo accounts use the standard password `Youngone@2026`)*.

---

## Common Setup Issues

### 1. Missing or Invalid Environment Variables
- **Symptom**: API container crashes immediately or terminal displays `❌ Invalid environment variables`.
- **Cause**: The variables `AUDIT_SIGNING_KEY`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` must each be strings of **at least 32 characters**.
- **Fix**: Verify your `.env` exists and contains 32+ character strings for all cryptographic keys.

### 2. Port Conflicts & Connection Errors
- **Symptom**: `address already in use` error or `ECONNREFUSED` when running database migrations.
- **Cause**: Port 5432 is already occupied by a local PostgreSQL service, or your host application is trying to connect to 5432 instead of Docker's mapped port 5433.
- **Fix**: Check `docker-compose.yml` port mappings. Ensure host-to-Docker PostgreSQL connections use port `5433` (e.g., `DATABASE_PORT=5433` in `.env`).

### 3. Database Not Seeded / Missing Initial Data
- **Symptom**: Login fails with invalid credentials on a fresh database, or dropdown options are empty.
- **Cause**: Prisma seeders were not executed.
- **Fix**: Run `pnpm run db:seed` to seed default roles, permissions, taxonomy, and administrator accounts.

### 4. Prisma Client Out of Sync
- **Symptom**: TypeScript compilation errors or runtime errors referencing missing Prisma model properties.
- **Cause**: Database schema was modified or `@prisma/client` was not generated.
- **Fix**: Run `pnpm run db:generate` to regenerate the Prisma client artifacts.

### 5. Docker Permission Denied
- **Symptom**: `permission denied while trying to connect to the Docker daemon socket`.
- **Cause**: Current user does not have permission to communicate with Docker daemon.
- **Fix**: Ensure the Docker daemon is running and add your user to the docker group (`sudo usermod -aG docker $USER`), or execute with appropriate system privileges.

---

## Next Steps

- Consult [ARCHITECTURE.md](file:///home/user/projects/uims/docs/ARCHITECTURE.md) for system design, service boundaries, and data flow.
- Check [CONFIGURATION.md](file:///home/user/projects/uims/docs/CONFIGURATION.md) for a comprehensive reference of all environment variables and configuration files.
- Review README.md for high-level project goals and features.

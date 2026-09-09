<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you through setting up the Unified IT Management System (UIMS) on your local development machine.

## Prerequisites

Ensure you have the following software installed before proceeding:

- **Node.js**: `>=22.0.0` (validated against [`package.json`](file:///home/user/projects/uims/package.json) engines)
- **pnpm**: `>=11.0.0` (workspace configured with `pnpm@11.21.0`)
- **Docker & Docker Compose**: Required for running the containerized backing services (PostgreSQL 17, Redis 8, MeiliSearch, SeaweedFS) or the full containerized development environment.

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

The [`.env.example`](file:///home/user/projects/uims/.env.example) template contains pre-configured defaults. Note the following essential configurations:

- **`AUDIT_SIGNING_KEY`** (**Required**): Cryptographic secret key used to generate tamper-evident HMAC SHA-256 signatures for audit log entries. Must be at least **32 characters long**. The API validates this at boot ([`app.config.ts`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts)); missing or short keys will halt startup.
- **`JWT_SECRET` & `JWT_REFRESH_SECRET`** (**Required**): Cryptographic keys used for signing and verifying JWT tokens. Must each be at least **32 characters long**.
- **`DATABASE_PORT` vs. Docker Host Port**:
  - In [`.env.example`](file:///home/user/projects/uims/.env.example), `DATABASE_PORT=5432`.
  - In [`docker-compose.yml`](file:///home/user/projects/uims/docker-compose.yml), the PostgreSQL service maps the container port `5432` to host port `${DATABASE_PORT:-5433}`. This defaults the external host port to `5433` to prevent port collisions with any local PostgreSQL instance already running on host port `5432`.
  - **Important**: If you run the Node.js backend directly on your host machine against the Docker-hosted PostgreSQL container, update `DATABASE_PORT=5433` (or adjust `DATABASE_URL` to connect to `localhost:5433`) in your `.env`.
- **`REDIS_PORT`**: In [`docker-compose.yml`](file:///home/user/projects/uims/docker-compose.yml), Redis maps internal port `6379` to host port `${REDIS_PORT:-6381}` by default.
- **`APP_PORT`**: Port for the NestJS API server (defaults to `3000` in `.env.example`; Docker fallback `${APP_PORT:-3002}`).
- **`WEB_PORT`**: Port for the Vite web frontend dev server (defaults to `5679`).
- **`MEILISEARCH_*` & `S3_*`**: Configuration for full-text search (MeiliSearch) and object storage (SeaweedFS S3 gateway).

For comprehensive details on all configuration parameters, consult [CONFIGURATION.md](file:///home/user/projects/uims/docs/CONFIGURATION.md).

---

## Running the Application

You can run UIMS in one of two modes:
1. **Fully Containerized Development**: Run infrastructure, backend API, and web frontend in Docker with hot-reloading.
2. **Hybrid Host Development**: Run backing infrastructure in Docker, while executing the API and Web apps directly on your host.

### Option A: Fully Containerized Development (Recommended)

Start the entire application stack in Docker dev mode:

```bash
pnpm run docker:dev
```

This command executes `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d` and spins up:
- **`uims-postgres`**: PostgreSQL 17 Alpine database
- **`uims-redis`**: Redis 8 Alpine cache and message broker
- **`uims-meilisearch`**: MeiliSearch engine
- **`uims-seaweedfs-master` / `uims-seaweedfs-volume` / `uims-seaweedfs-filer`**: SeaweedFS S3-compatible storage cluster
- **`uims-api-dev`**: NestJS backend running in watch mode with live reloading (auto-runs `prisma:generate`)
- **`uims-web-dev`**: Vite React frontend with Hot Module Replacement (HMR)

#### Initialize Database Schema & Seed Data

On first run, initialize the database schema and populate initial administrative users and taxonomy:

```bash
# Run database migrations
pnpm run db:migrate

# Seed initial roles, permissions, taxonomy, and admin account
pnpm run db:seed
```

> [!TIP]
> If executing migration and seed commands against Docker from your host, ensure `DATABASE_PORT=5433` (or the port specified in `DATABASE_URL`) matches the host port exposed by Docker Compose. Alternatively, you can execute them directly inside the running API container:
> ```bash
> docker exec -it uims-api-dev pnpm --filter @uims/api prisma:migrate
> docker exec -it uims-api-dev pnpm --filter @uims/api prisma:seed
> ```

#### View Container Logs

To stream logs from all running development containers:

```bash
pnpm run docker:dev:logs
```

To shut down the containerized development environment:

```bash
pnpm run docker:dev:down
```

---

### Option B: Hybrid Host Development

If you prefer to run the Node.js applications natively on your host machine for faster debugging:

#### 1. Start Backing Infrastructure Services

Spin up only the database, cache, search, and storage containers:

```bash
docker compose up -d postgres redis meilisearch seaweedfs-master seaweedfs-volume seaweedfs-filer
# or use the workspace shortcut:
# pnpm run docker:up
```

#### 2. Configure Host Ports in `.env`

Ensure your `.env` connects to the Docker host port mappings:
```env
DATABASE_PORT=5433
REDIS_PORT=6381
DATABASE_URL=postgresql://uims:your_secure_db_password@localhost:5433/uims_db?schema=public
REDIS_URL=redis://:your_secure_redis_password@localhost:6381
```

#### 3. Generate Prisma Client & Migrate Database

```bash
# Generate the Prisma Client
pnpm run db:generate

# Apply database migrations
pnpm run db:migrate

# (Recommended on first run) Seed default enterprise data
pnpm run db:seed
```

#### 4. Start Development Servers

Start all monorepo applications concurrently via Turborepo:

```bash
pnpm run dev
```

To run individual applications independently:
- **API Server only**: `pnpm run dev:api`
- **Web Frontend only**: `pnpm run dev:web`

---

## Application Access Endpoints

Once the services are active, access the respective components:

| Component | URL | Notes |
|---|---|---|
| **Web Interface** | [`http://localhost:5679`](http://localhost:5679) | React + Ant Design frontend application |
| **API Server** | [`http://localhost:3000`](http://localhost:3000) | NestJS REST backend (Global prefix: `/api/v1`) |
| **API Documentation (Swagger UI)** | [`http://localhost:3000/api/v1/docs`](http://localhost:3000/api/v1/docs) | Interactive OpenAPI / Swagger UI |
| **MeiliSearch** | [`http://localhost:7700`](http://localhost:7700) | Search engine dashboard / API |
| **SeaweedFS S3 Gateway** | [`http://localhost:8333`](http://localhost:8333) | S3-compatible object storage endpoint |
| **SeaweedFS Filer UI** | [`http://localhost:8888`](http://localhost:8888) | Web-based file browser for SeaweedFS |

### Default Credentials (from Seed)

When you execute `pnpm run db:seed`, the database is populated with initial enterprise roles and an administrator account:

- **Username**: `admin` or `admin@uims.local`
- **Password**: `Admin@2026`
- **Role**: `Super Admin`

*(Additional seeded test user accounts use the default password `password123`)*.

---

## Common Setup Issues

### 1. Missing or Invalid Environment Variables
- **Symptom**: API container crashes immediately or terminal displays `❌ Invalid environment variables`.
- **Cause**: [`app.config.ts`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts) enforces Zod validation. The variables `AUDIT_SIGNING_KEY`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` must each be strings of **at least 32 characters**.
- **Fix**: Verify your `.env` exists and contains 32+ character strings for all cryptographic keys.

### 2. Port Conflicts & Connection Errors
- **Symptom**: `address already in use` error or `ECONNREFUSED` when running database migrations.
- **Cause**: Port 5432 is already occupied by a local PostgreSQL service, or your host application is trying to connect to 5432 instead of Docker's mapped port 5433.
- **Fix**: Check `docker-compose.yml` port mappings. Ensure host-to-Docker PostgreSQL connections use port `5433` (e.g., `DATABASE_PORT=5433` in `.env`).

### 3. Database Not Seeded / Missing Initial Data
- **Symptom**: Login fails with invalid credentials on a fresh database, or dropdown options (locations, categories) are empty.
- **Cause**: Docker container startup initializes the database schema extensions via [`init.sql`](file:///home/user/projects/uims/docker/postgres/init.sql), but does not automatically execute Prisma seeders.
- **Fix**: Run `pnpm run db:seed` to seed default roles, permissions, taxonomy, and administrator accounts.

### 4. Prisma Client Out of Sync
- **Symptom**: TypeScript compilation errors or runtime errors referencing missing Prisma model properties.
- **Cause**: Database schema was modified or `@prisma/client` was not generated in the current environment.
- **Fix**: Run `pnpm run db:generate` to regenerate the Prisma client artifacts.

### 5. Docker Permission Denied
- **Symptom**: `permission denied while trying to connect to the Docker daemon socket`.
- **Cause**: Current user does not have permission to communicate with Docker daemon.
- **Fix**: Ensure the Docker daemon is running and add your user to the docker group (`sudo usermod -aG docker $USER`), or execute with appropriate system privileges.

---

## Next Steps

- Consult [DEVELOPMENT.md](file:///home/user/projects/uims/docs/DEVELOPMENT.md) for code structure, architectural standards, and workflow commands.
- Review [TESTING.md](file:///home/user/projects/uims/docs/TESTING.md) for running unit and Playwright end-to-end (E2E) tests.
- Check [CONFIGURATION.md](file:///home/user/projects/uims/docs/CONFIGURATION.md) for a comprehensive reference of all environment variables and configuration files.
- Inspect [ARCHITECTURE.md](file:///home/user/projects/uims/docs/ARCHITECTURE.md) for system design, service boundaries, and data flow.

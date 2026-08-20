<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you through setting up the UIMS (Unified IT Management System) on your local development machine.

## Prerequisites

Ensure you have the following installed before proceeding:
- **Node.js**: >=22.0.0
- **pnpm**: >=11.0.0
- **Docker & Docker Compose**: Required for running the database and external infrastructure services.

## Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url> uims
   cd uims
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   Copy the example environment variables file. The defaults are pre-configured for the local Docker setup.
   ```bash
   cp .env.example .env
   ```

## First Run

UIMS provides a fully containerized development environment. You can spin up the entire application (infrastructure, API, and Web UI) with a single command:

```bash
pnpm run docker:dev
```

This command will:
- Start PostgreSQL, Redis, MeiliSearch, and SeaweedFS (S3 gateway).
- Automatically generate the Prisma client.
- Start the API and Web apps in watch mode with live reloading.

You can view the logs at any time by running:
```bash
pnpm run docker:dev:logs
```

Once the services are running, you can access them at:
- **Web Interface**: http://localhost:5679
- **API Server**: http://localhost:3000 (Prefix: `/api/v1`)
- **MeiliSearch**: http://localhost:7700
- **SeaweedFS**: http://localhost:8333

*(Optional)* If you prefer to run the Node.js applications directly on your host machine instead of in Docker containers:
```bash
# 1. Start only the backing infrastructure
docker compose up -d postgres redis meilisearch seaweedfs-master seaweedfs-volume seaweedfs-filer

# 2. Prepare the database
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# 3. Start the application
pnpm run dev
```

## Common Setup Issues

- **Missing `.env` File**: 
  If containers crash or the API fails to connect to the database, verify that your `.env` file exists and contains valid credentials (e.g., `DATABASE_URL`, `JWT_SECRET`).
- **Port Conflicts**: 
  UIMS uses multiple local ports (`3000` for API, `5432`/`5433` for Postgres, `5679` for Web). If you encounter "address already in use" errors, modify `APP_PORT` or `WEB_PORT` in your `.env` file.
- **Prisma Client Not Found**:
  If you run the API on your host and encounter Prisma type errors, manually generate the client using `pnpm run db:generate`.
- **Docker Permission Denied**:
  Ensure the Docker daemon is running and your user has the correct permissions to execute `docker` commands without `sudo` (or run your terminal with elevated privileges).

## Next Steps

- Explore [DEVELOPMENT.md](DEVELOPMENT.md) for coding standards, branching strategies, and architecture details.
- See [TESTING.md](TESTING.md) for instructions on running unit and end-to-end (E2E) tests.

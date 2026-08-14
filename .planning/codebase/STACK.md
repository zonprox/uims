# UIMS Technology Stack

**Analysis Date:** 2026-08-14

This document outlines the core technology stack, languages, frameworks, and configuration for the Unified IT Management System (UIMS) monorepo.

## 1. Monorepo & Tooling
- **Package Manager:** `pnpm` (v11.21.0)
- **Monorepo Tool:** Turborepo (v2.10.9)
- **Languages:** TypeScript (v5.9 / v7.0.2 in web), Node.js (>=22.0.0)
- **Linting & Formatting:** Biome (Root level), ESLint (Workspaces)
- **E2E Testing:** Playwright (v1.50)

## 2. Backend API (`apps/api`)
The backend is built as a highly structured modular monolith.

- **Core Framework:** NestJS (v11.1)
- **Database ORM:** Prisma (v7.9) with PostgreSQL Adapter (`@prisma/adapter-pg`)
- **Background Jobs & Queues:** BullMQ (v6.1) backed by Redis (`@nestjs/bullmq`)
- **Real-time / WebSockets:** Socket.io (`@nestjs/platform-socket.io`, `@nestjs/websockets`)
- **Authentication:** Passport.js (`@nestjs/passport`), JWT (`@nestjs/jwt`), Bcrypt
- **Validation:** Zod (v3.25), `class-validator`, `class-transformer`
- **Logging:** Pino (`pino-http`)
- **Security:** Helmet, Cookie Parser, Compression
- **Testing:** Vitest

## 3. Frontend Web (`apps/web`)
The frontend is a Single Page Application (SPA) designed for IT administrators.

- **Core Framework:** React (v19.2) built with Vite (v8.2)
- **State Management:** 
  - Server State: React Query / `@tanstack/react-query` (v5.101)
  - Client State: Zustand (v5.0)
- **UI & Component Library:** Ant Design (v6.6), `@ant-design/pro-components`
- **Icons:** `@ant-design/icons`
- **Routing:** React Router (v8.3)
- **Date/Time Formatting:** Dayjs (v1.11)
- **HTTP Client:** Axios (v1.19)
- **Testing:** Vitest with Happy-DOM

## 4. Shared Packages (`packages/`)
- `@uims/eslint-config`: Shared ESLint rules.
- `@uims/shared-types`: Common TypeScript interfaces and DTOs.
- `@uims/shared-utils`: Common utility functions.
- `@uims/shared-validators`: Shared Zod/class-validator schemas.

## 5. Infrastructure & Configuration
- **Docker:** `docker-compose.yml` and `docker-compose.dev.yml` provide local dev and production-ready containers.
- **Environment Management:** Driven by `.env` (refer to `.env.example`).
  - Web uses Vite's `VITE_` prefixed variables (`VITE_API_URL`).
  - API uses NestJS `ConfigModule` reading from the environment.

---
*UIMS System Documentation - Generated analysis: 2026-08-14*

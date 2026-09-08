# GEMINI.md — Authoritative Engineering & Defect Prevention Directives

> **Unified IT Management System (UIMS)**  
> This document defines authoritative agent contracts, architectural invariants, strict type safety standards, and defect prevention rules. All LLM agents, automated tools, and human contributors MUST strictly comply with every rule in this specification.

---

## 1. System Architecture & Boundaries

- **Pattern**: Modular Monolith, REST API, Single-Page Application (SPA), Containerized via Docker Compose.
- **Language Policy**: 100% Concise, Professional Enterprise English across all code identifiers, comments, documentation, UI copy, API payloads, and git commits.
- **Monorepo Structure**:
  - `apps/api`: NestJS 11 + Prisma 7 ORM + PostgreSQL 17 + Redis 8 + BullMQ.
  - `apps/web`: React 19 + Ant Design v6+ + Vite 8 + Zustand 5 + TanStack Query 5.
  - `packages/shared-types`: Common TypeScript entities, DTOs, Enums, and API Response envelopes.
  - `packages/shared-validators`: Shared runtime Zod schemas.
  - `packages/shared-utils`: Common string, date, and validation utilities.
  - `packages/eslint-config`: Shared linting configurations.

---

## 2. Agent Behavioral Contracts

1. **Think Before Coding**: Explicitly state assumptions. Never guess or choose arbitrary semantics silently. If multiple implementations exist, select the simplest, least-invasive pattern.
2. **Simplicity First**: Write the minimum code that completely satisfies requirements. No speculative abstractions, unused generic parameters, or unrequested configuration flags.
3. **Surgical Changes**: Touch only lines strictly required to satisfy the goal. Never reformat or "clean up" adjacent code unless explicitly tasked.
4. **Goal-Driven Execution**: Formulate verifiable criteria and execute verification loops (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`) until green.

---

## 3. Strict Type Safety Standards

- **Zero `any` Policy**:
  - Usage of `any`, `as any`, or loose dynamic types is strictly forbidden across production code and test suites.
  - Use `unknown`, generics, exact interface contracts, or Prisma generated types.
  - Test mocks must use `vi.mocked()`, `Partial<T>`, or dedicated mock factories rather than casting to `any`.
- **Typed Catch Blocks**:
  - Catch clauses must always type errors as `unknown`: `catch (error: unknown)`.
  - Safely narrow errors before inspection: `if (error instanceof Error) { ... }` or use shared error extraction utilities (`error instanceof HttpException`).
- **Zero Diagnostics Suppressions**:
  - `@ts-ignore`, `@ts-expect-error` (without tracking ID), `@ts-nocheck`, and eslint suppressions (`/* eslint-disable */`) for type safety violations are strictly prohibited.
- **Union Narrowing**:
  - When handling discriminated unions or `Promise.allSettled` results, explicitly narrow using type guards (e.g., `'scanned' in item` or `result.status === 'fulfilled'`).

---

## 4. Security & Credential Management

- **Zero Hardcoded Secrets**:
  - Passwords, connection strings, JWT keys, HMAC secrets, and API tokens must NEVER appear in source code, default string fallbacks, seed scripts, or test fixtures.
- **Fail-Fast Environment Validation**:
  - Application startup MUST fail immediately with an explicit error message if required environment variables are absent (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `AUDIT_HMAC_SECRET`).
  - Prohibited pattern: `process.env.JWT_SECRET || 'secret'`.
  - Required pattern: `const secret = configService.getOrThrow<string>('JWT_SECRET');`.
- **Principle of Least Privilege & Fail-Closed**:
  - If a user role or permission cannot be authoritatively resolved, access MUST be denied (`throw new ForbiddenException('Access denied')`).
  - Never default unverified users to `'Employee'` or any fallback role.
- **Data Protection & Schema Sanitation**:
  - Sensitive plaintext credentials (e.g. `adInitialPassword`) must NEVER be stored in relational models. Passwords must be hashed using salted bcrypt.

---

## 5. Network, CORS & Controller Architecture

- **Strict CORS Validation**:
  - Validate origins against an explicit, configured allowlist (`CORS_ORIGIN` or `ALLOWED_ORIGINS`).
  - Wildcards (`*`) and indiscriminate non-production bypasses with `credentials: true` are prohibited.
- **Controller Separation of Concerns**:
  - Controllers must only orchestrate routing, DTO validation, and service invocation.
  - Low-level network header parsing (e.g. client IP resolution from `x-forwarded-for`) MUST be extracted into reusable custom parameter decorators (`@ClientIP()`) or middleware.

---

## 6. Database Access & Performance Directives

- **Mandatory Bounded Queries & Pagination**:
  - Every Prisma `findMany()` query in service code MUST enforce an explicit upper ceiling or pagination parameters (`skip`/`take`).
  - Default maximum page size must be capped (e.g., `take: Math.min(limit, 100)`).
  - Unbounded `findMany()` queries without `take` are strictly forbidden.
- **Index Coverage**:
  - Foreign key relations, frequent filter predicates, search columns, and sort keys MUST be backed by Prisma indexes (`@@index([column])`).

---

## 7. Structured Logging Standards

- **NestJS Structured Logger Mandate**:
  - Use `private readonly logger = new Logger(ContextName.name)` for all application tracing, worker execution, and background tasks.
  - Raw `console.log`, `console.warn`, and `console.error` are strictly forbidden in production code, seeder scripts, and workers.

---

## 8. Enterprise English & UI/UX Standards

- **UI Copy & Communication**:
  - All labels, modals, toasts, tables, placeholders, API errors, comments, and commit messages MUST be in standardized Enterprise English.
  - **No Fluff or Buzzword Prefixes**: Eliminate redundant prefixes such as "Enterprise ...", "Unified ...", "Master ...", or "System ..." unless strictly required for domain differentiation.
  - **Action-Oriented Controls**: Keep buttons short and verb-first (`Create Asset`, `Export CSV`, `Save`, `Filter`).
  - **Casing Standards**: Title Case for navigation, headers, and modal titles; sentence case for helper text, toasts, and descriptions.
- **Ant Design v6+ Best Practices**:
  - Always consume dynamic theme feedback via `App.useApp()` (`const { message, modal, notification } = App.useApp();`). Never invoke static `message.error()`.
  - Use semantic token styling: `styles={{ body: ... }}` rather than deprecated `bodyStyle` or `valueStyle`.
  - Wrap all full-page views in `<PageContainer>` to guarantee layout consistency.

---

## 9. Verification Invariants

Every change must satisfy the full verification cycle prior to merging or pushing:
1. `pnpm run typecheck` — 0 errors across all 6 packages.
2. `pnpm run lint` — 0 errors across all 6 packages.
3. `pnpm run format:check` — 100% compliant with Biome rules.
4. `pnpm run test` — 100% test pass rate across monorepo.
5. `pnpm run build` — Clean production builds across all workspaces.

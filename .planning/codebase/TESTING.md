# UIMS Testing Standards & Infrastructure

**Date:** September 2026

This document details the testing architecture, categories, and statistics for the UIMS monorepo.

## 1. Testing Framework
UIMS relies on **Vitest 5.x** as the primary testing framework across all workspaces (API, Web, and Packages). Playwright 1.63 is utilized for End-to-End (E2E) testing.

## 2. Test Coverage & Counts (Current)
Based on current monorepo metrics:
- **Total `*.spec.ts` files:** 68
- **Total `*.test.ts` / `*.test.tsx` files:** 660
- **Apps/API `*.spec.ts` files:** 62
- **Apps/Web `*.test.*` files:** 52
- **Packages `*.test.ts` files:** 12
- **Adversarial tests:** 23
- **Spatial tests:** 3
- **Stress tests:** 2
- **Boundary tests:** 3

## 3. Test Categories
We categorize our tests to target specific layers and failure modes of the application:

- **Unit Tests (`*.spec.ts` / `*.test.ts`, `*.test.tsx`)**
  Standard tests covering isolated logic for services, controllers, guards, filters, interceptors, stores, and React hooks.
- **Adversarial Tests (`*.adversarial.spec.ts` / `*.adversarial.test.tsx`)**
  Security-focused tests that specifically attempt to bypass guards, inject malicious payloads, or exploit race conditions.
- **Spatial Tests (`*.spatial.spec.ts`)**
  Tests ensuring that cross-module boundaries hold true (e.g., ensuring `AssetsModule` cannot inappropriately mutate `AuthModule` state).
- **Boundary Tests (`*.boundary.spec.ts`)**
  Tests validating the absolute edge cases of input data, focusing heavily on Zod and class-validator parsing edges.
- **Stress Tests (`*.stress.test.ts` / `*.stress.test.tsx`)**
  Load and performance tests designed to find the breaking points of memory or CPU on specific complex algorithmic paths.
- **E2E Tests**
  Handled by Playwright, these cover critical user journeys across the fully integrated stack.

## 4. Test Patterns & Implementation
- **API (NestJS):**
  - Use `vi.mocked()` from Vitest for dependency mocking.
  - Utilize `@nestjs/testing` and `Test.createTestingModule` to spin up isolated module contexts for controller/service testing.
- **Web (React):**
  - Tests run in a `happy-dom` environment.
  - React 19 testing uses the standard `act()` wrapper for state updates.
  - Ant Design portals/modals must be explicitly cleaned up after tests to prevent DOM leakage.
- **Shared Packages:**
  - Must be pure function unit tests with zero external side effects (no DOM, no Database).

## 5. Coverage & Configuration
- Vitest configurations (`vitest.config.ts`) define our coverage thresholds and paths.
- Test readiness and infrastructure setup requirements can be referenced in `TEST_INFRA.md` and `TEST_READY.md`. Continuous integration guarantees all tests and coverage gates pass before merge.

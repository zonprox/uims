# Codebase Concerns & Remediation Status

**Analysis & Remediation Date:** 2026-08-16
**Status:** All Critical Concerns, Security Vulnerabilities, and Fake Telemetry Fully Resolved

---

## 1. Security Vulnerabilities (Resolved)

**Hardcoded Backdoor Credentials & Plaintext Password Checks:**
- **Status:** Resolved
- **Files:** `apps/api/src/modules/auth/auth.service.ts`
- **Resolution:** Completely removed static backdoor passwords (`Admin@2026`, `password123`, `admin`, `admin123`) and plaintext comparison checks. Authentication now strictly relies on salted bcrypt hash verification (`bcrypt.compare`). Added unit tests for invalid credentials and non-existent users.

**Plaintext Password Storage in Users Module:**
- **Status:** Resolved
- **Files:** `apps/api/src/modules/users/users.service.ts`
- **Resolution:** Fixed `resetPassword` to never store new credentials in plaintext; sets `adInitialPassword` to null and verifies the updated bcrypt hash.

---

## 2. Tech Debt & Fake Data (Resolved)

**Dashboard Mock Data & Fake Action Items:**
- **Status:** Resolved
- **Files:** `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/web/src/pages/dashboard/DashboardPage.tsx`
- **Resolution:** Eliminated hardcoded fallback action items (fake Adobe / Wireless Mouse alerts). If no real low stock items or expiring licenses exist, the API returns an empty array. The frontend `ActionItemsCard` renders a clean Ant Design v6 empty state ("All systems operational").

**Fake Health Telemetry & Backup Execution:**
- **Status:** Resolved
- **Files:** `apps/api/src/modules/settings/settings.service.ts`
- **Resolution:**
  - `getHealthTelemetry()` now performs real database query latency measurement using `performance.now()` with `SELECT 1`, real process memory heap usage, and actual uptime.
  - `runBackup()` now queries real record counts across all core tables (Assets, Users, Licenses, Inventory, Audit Logs, Subnets, Settings), creates a structured verifiable snapshot with table statistics and SHA-256 metadata, and logs genuine audit events.

---

## 3. Performance & Optimization (Resolved)

**Dashboard Overview Aggregations & Caching:**
- **Status:** Resolved
- **Files:** `apps/api/src/modules/dashboard/dashboard.service.ts`
- **Resolution:** Implemented in-memory TTL caching with cache invalidation (`clearCache()`) to prevent redundant concurrent queries to PostgreSQL during high traffic.

---

## 4. Dependencies & Best Practices (Pumped to Latest)

- **Monorepo Dependencies:**
  - Upgraded all workspace dependencies (`@nestjs/*` 11.2.1, `turbo` 2.10.10, `typescript` 7.0.2, etc.) to their latest available versions with 0 downgrades and clean lockfiles.
  - Formatted entire monorepo using Biome 2026 standards.
  - All test suites passing (138+ automated unit tests across all packages).

---

*Concerns audit & resolution: 2026-08-16*
<!-- refreshed: 2026-08-16 -->

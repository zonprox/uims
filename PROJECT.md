# Project: UIMS Monorepo Hardening, Security Modernization & Zero-Downgrade Invariants

## Architecture
- **Monorepo Architecture**: Modular monolith API (`apps/api`: NestJS 11 + Prisma 7 + PostgreSQL 17 + Redis 8) and SPA frontend (`apps/web`: React 19 + Ant Design v6 + Vite 8), shared packages (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`, `@uims/eslint-config`).
- **Application-Level Cryptography**: Native Node.js `crypto` AES-256-GCM authenticated encryption for sensitive `License.licenseKey` values, storing serialized envelopes (`enc:v1:<iv>:<authTag>:<ciphertext>`) at rest. Transparent decryption on retrieval and masked presentation in UI.
- **Relational Schema Integrity**: First-class `Vendor` entity in `schema.prisma` connected to `License` (`vendorId`) and `Asset` (`vendorId`) with `@@index([vendorId])` foreign key indexes and `onDelete: SetNull`. Scalar fields (`vendor`, `manufacturer`) preserved for 100% backward compatibility.
- **Fail-Fast Environment Validation**: Zod `.superRefine()` validation in `apps/api/src/config/app.config.ts` strictly requiring `REDIS_URL` in production (`NODE_ENV === 'production'`) while allowing resilient in-memory fallback in dev/test.
- **Module Resolution Modernization**: Backend `apps/api/tsconfig.json` modernized to `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` for package exports compatibility without breaking NestJS DI or runtime CommonJS dependencies.
- **Strict Zero-Downgrade Invariant**: Strict preservation of foundational stack (TypeScript 7.x, NestJS 11.x, React 19.x, Vite 8.x, Prisma 7.x, Ant Design v6+).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Application-Level License Encryption | AES-256-GCM encryption utility for `licenseKey`, transparent decryption in `LicensesService`, remove plaintext SQL search, encrypt in seeders | M1 | Survey 1 / R1 |
| F2 | Relational Schema Integrity for Vendor | Connect `Vendor` model to `License` and `Asset` with `vendorId`, `@@index([vendorId])`, seed canonical vendors, generate Prisma migration | M1 | Survey 1 / R1 |
| F3 | Production REDIS_URL Invariant | Enforce required `REDIS_URL` in production via Zod `.superRefine()` in `app.config.ts` | M1 | Survey 1 / R1 |
| F4 | Backend Module Resolution Modernization | Update `apps/api/tsconfig.json` to `"module": "NodeNext"` & `"moduleResolution": "NodeNext"` | M2 | Survey 2 / R1 |
| F5 | Frontend Feedback Safety Verification | Verify `App.useApp()` dynamic feedback usage across 100% of React components with zero static anti-patterns | M2 | Survey 2 / R1 |
| F6 | Monorepo Dependency Invariant Verification | Verify all workspace packages adhere to zero-downgrade invariant, lockfile deduplication & synchronization | M3 | Survey 3 / R2 |
| F7 | Authoritative Directives Codification in AGENTS.md | Codify Sections 16.15 (License Encryption), 16.16 (Vendor Relational Integrity), 16.17 (Production Redis Validation) in `AGENTS.md` | M3 | Survey 3 / R3 |
| F8 | Local Verification, Git Delivery & CI Green | Run full monorepo verification loop (format, lint, typecheck, tests, build), commit, push to `origin/main`, and monitor CI until green | M4 | Survey 3 / R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Security & Database Integrity | License Key AES-256-GCM encryption, Vendor relational schema & migration, canonical vendor seeder, production Redis validation | none | DONE |
| M2 | Module Resolution & Frontend Safety | Update `apps/api/tsconfig.json` to NodeNext, verify frontend feedback safety invariants | M1 | DONE |
| M3 | Dependency Hygiene & AGENTS.md Directives | Lockfile deduplication & sync verification, codify Sections 16.15-16.17 in AGENTS.md | M2 | DONE |
| M4 | Verification, Git Delivery & CI Green | Full monorepo verification (`typecheck`, `lint`, `format:check`, `test`, `build`), git commit & push, monitor CI until green | M3 | DONE |

## Interface Contracts
### License Encryption Envelope
- Cipher: AES-256-GCM with 12-byte random IV and 16-byte authentication tag.
- Storage format: `enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`.
- Derivation: Key derived via `crypto.createHash('sha256').update(secret).digest()` from `LICENSE_ENCRYPTION_KEY || AUDIT_SIGNING_KEY || JWT_SECRET`.
- Non-encrypted fallback: Graceful handling of legacy plaintext or empty strings without throwing.

### Vendor Relational Contract
- `model License`: `vendorId String?` referencing `Vendor.id` with `onDelete: SetNull`, `@@index([vendorId])`. Scalar `vendor String?` preserved.
- `model Asset`: `vendorId String?` referencing `Vendor.id` with `onDelete: SetNull`, `@@index([vendorId])`. Scalar `manufacturer String?` preserved.
- `model Vendor`: `licenses License[]`, `assets Asset[]`.

### Production Environment Validation Contract
- If `process.env.NODE_ENV === 'production'`, `REDIS_URL` must be a valid, non-empty connection string; otherwise startup throws an explicit configuration error.
- In `development` or `test`, `REDIS_URL` remains optional.

## Code Layout
- Cryptographic Utilities: `apps/api/src/common/crypto/license-crypto.ts`
- Backend Configuration: `apps/api/src/config/app.config.ts`, `apps/api/tsconfig.json`
- Database Schema & Migrations: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`
- Database Seeders: `apps/api/prisma/seed.ts`, `apps/api/prisma/seeders/` (`vendors.seeder.ts`, `licenses.seeder.ts`, `assets.seeder.ts`)
- Backend Services: `apps/api/src/modules/licenses/licenses.service.ts`, `apps/api/src/modules/inventory/inventory.service.ts`
- Authoritative Directives: `AGENTS.md`

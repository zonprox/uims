# UIMS External Integrations

**Analysis Date:** 2026-08-14

This document details the external services, databases, authentication providers, and third-party APIs integrated into the UIMS platform.

## 1. Databases & Infrastructure Services
The application orchestrates several stateful infrastructure components, locally provided via Docker:

- **PostgreSQL (`uims_db`)**: The primary relational datastore. Managed via Prisma.
- **Redis**: Provides the storage and pub/sub layer for `BullMQ` job queues, caching, and transient socket state.
- **MeiliSearch**: A fast full-text search engine running on port `7700`. 
  - **Integration Strategy:** The API (`apps/api/src/modules/search/search.service.ts`) communicates with MeiliSearch via raw HTTP `fetch` calls rather than a dedicated SDK. It gracefully falls back to Prisma database queries if the MeiliSearch instance is unreachable.
- **SeaweedFS (S3-Compatible Storage)**: Acts as an object storage vault running on port `8333`. 
  - **Usage:** Used primarily for system backup archives and file storage.

## 2. Authentication & Identity
- **Local Authentication**: Handled natively using `passport-local`, JWT (`passport-jwt`), and `bcrypt` for password hashing.
- **Directory Services**:
  - The database schema (`DirectorySource` enum in `apps/api/prisma/schema.prisma`) explicitly models integrations for **LDAP** and **Azure AD**. 
  - *Current State:* These directory sources are currently modeled in the database and UI, but the underlying SSO/LDAP syncing mechanisms are not actively implemented via third-party SDKs in the current codebase state.

## 3. Webhooks & Third-Party APIs
- **No External SaaS Integrations Active:** The codebase relies entirely on self-hosted infrastructure. There are no active implementations of transactional email providers (e.g., SendGrid, Mailgun) or payment gateways (e.g., Stripe) at this time.
- **Internal Synchronizations:** The application routinely synchronizes asset, ticket, license, and directory data directly into MeiliSearch indices via automated HTTP payloads.

## 4. Key Configuration Variables
Integration targets are managed through the following environment variables (refer to `.env.example`):
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis cache & queue)
- `MEILISEARCH_HOST` & `MEILISEARCH_API_KEY` (Search)
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` (SeaweedFS Object Storage)

---
*UIMS System Documentation - Generated analysis: 2026-08-14*

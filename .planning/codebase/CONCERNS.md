# Codebase Concerns & Technical Debt
> Last Updated: 2026-09-12

## Critical Issues

### Security Concerns
- **Hardcoded secrets in seed scripts**: The network import script (`import-network-excel.ts`) processes plaintext credentials and passwords. While this may be a migration artifact, it risks persisting sensitive data in unstructured locations.
- **Environment defaults in Compose**: The `docker-compose.yml` and `docker-compose.dev.yml` files include a hardcoded fallback for the JWT secret (`JWT_SECRET: ${JWT_SECRET:-uims-jwt-secret-change-in-production}`). Even though `app.config.ts` requires a 32-character minimum, having fallback secrets in version control creates a potential risk if deployed to production without overriding.
- *Note: Overall security posture is very strong. Passwords are hashed, JWTs are well-configured, and CORS is strictly enforced across REST and WebSocket layers.*

### Data Integrity Risks
- **Unbounded Queries in Scripts**: While API endpoints correctly implement limits, seed scripts and migration utilities (e.g., `import-network-excel.ts`, `directory.seeder.ts`) perform completely unbounded queries (`findMany()` with no `take` or `skip`). At enterprise scale, these scripts will likely OOM or timeout.

## High Priority

### Performance Concerns
- **In-memory aggregations**: There are instances of in-memory calculations using `reduce` for aggregations that could be pushed to the database. For example:
  - `licenses.service.ts`: `fallbackLicenses.reduce<number>((sum, l) => sum + l.usedSeats * (l.costPerSeat || 0), 0);`
  - `reports.service.ts`: `fallbackLicenses.reduce<number>((sum, l) => sum + l.totalSeats, 0);`
  These should be converted to Prisma aggregation queries (`aggregate` or `groupBy`) to prevent large datasets from being pulled into Node memory.
- **Wide Prisma Includes**: Several queries use wide `include` statements (e.g. returning nested organization details for assigned assets). For highly accessed list endpoints, this may impact performance.

### Architecture Concerns
- **God Services / Monolithic Classes**: Several domain services have grown exceedingly large and handle too many responsibilities, making them harder to test and maintain:
  - `directory.service.ts` (~1000 lines)
  - `network.service.ts` (~830 lines)
  - `organization.service.ts` (~790 lines)
  These should be refactored into smaller, focused use-cases or CQRS handlers.

### Error Handling
- *No critical issues found.* The codebase rigorously uses `catch (error: unknown)` and avoids silent empty catch blocks. 

## Medium Priority

### Code Quality
- *No critical issues found.* The codebase maintains an exceptionally high standard of TypeScript strictness. There are zero instances of `any`, `@ts-ignore`, or `as any` casts in the application source code. 

### Testing Gaps
- **Complex Adversarial Logic**: The adversarial testing files are massive (e.g., `network-adversarial.spec.ts` > 800 lines). While good for coverage, these tests are often brittle and difficult for developers to update when underlying domain logic changes.

## Low Priority

### Developer Experience
- **Test execution speed**: Due to heavy mocking and large adversarial suites, test execution times may degrade as the project scales. Moving to more focused integration tests against a real test database (via Testcontainers) might provide better ROI.

### Future Scalability
- **Pagination Strategy**: The widespread use of `take: 100` acts as a great safety net against unbounded queries. However, a standardized cursor-based pagination strategy is needed across all REST endpoints to handle true pagination for large tenant datasets.

## Technical Debt Inventory
| ID | Category | Severity | Location | Description | Remediation |
|---|----------|----------|----------|-------------|-------------|
| TD-001 | Security | Medium | `docker-compose.yml` | Hardcoded JWT fallback secret | Remove fallback; force injection |
| TD-002 | Data Integrity | High | `import-network-excel.ts` | Unbounded `findMany()` | Add batching or cursors to scripts |
| TD-003 | Performance | High | `licenses.service.ts` | In-memory `reduce` for cost | Use Prisma `$queryRaw` or `aggregate` |
| TD-004 | Architecture | Medium | `directory.service.ts` | God class (1000+ lines) | Split into use-case functions |

## Positive Patterns
- **Strict TypeScript Compliance**: Exceptional adherence to modern TS standards. Zero usage of `any` types or unsafe casts.
- **Database Safety bounds**: `findMany()` queries within services are universally constrained with explicit `take` parameters, preventing production unbounded-query crashes.
- **Strict Error Boundaries**: Catch blocks consistently type errors as `unknown` and handle them gracefully.
- **Prisma Transactions**: Critical mutating operations (like asset assignment and license allocation) correctly utilize `prisma.$transaction`.
- **Thorough Indexing**: The `schema.prisma` is heavily optimized with `@@index` declarations on foreign keys, status fields, and frequently searched text columns.
- **Secure by Default**: WebSockets explicitly restrict origins, and the REST API uses a strict `helmet` and CORS configuration with environment-driven whitelists.

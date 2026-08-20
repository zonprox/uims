<!-- generated-by: gsd-doc-writer -->
# @uims/shared-validators

> Shared Zod validation schemas and inferred input types for the UIMS platform.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/shared-validators` provides runtime request validation and type inference across both frontend forms and backend API route handlers in the UIMS monorepo. Built on top of [Zod](https://zod.dev/), it defines strict schema definitions for authentication, user management, assets, software licenses, organizational hierarchies, roles and permissions, pagination, and shared data primitives.

## Installation

In a workspace package `package.json`:

```json
{
  "dependencies": {
    "@uims/shared-validators": "workspace:*"
  }
}
```

Or add the package dependency via pnpm:

```bash
pnpm --filter <target-app-or-package> add @uims/shared-validators@workspace:*
```

## Quick Start

Import and use validation schemas for parsing or safe-parsing input payloads:

```typescript
import { createUserSchema } from '@uims/shared-validators';

// Safe parse example (e.g. in NestJS validation pipe or API controller)
const result = createUserSchema.safeParse(req.body);

if (!result.success) {
  console.error(result.error.flatten().fieldErrors);
} else {
  console.log('Validated user data:', result.data);
}
```

## Usage Examples

### 1. Common & Pagination Validators

Reusable schema primitives for validating UUID identifiers, email formatting, ISO datetime strings, route parameters, and query string pagination options:

```typescript
import {
  uuidSchema,
  emailSchema,
  dateSchema,
  idParamSchema,
  paginationSchema,
} from '@uims/shared-validators';

// Validate UUID parameter
const paramResult = idParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' });

// Validate pagination query params (with automatic type coercion and defaults)
const query = paginationSchema.parse({
  page: '2',
  limit: '25',
  sort: 'createdAt',
  order: 'desc',
  search: 'MacBook',
});
// Result: { page: 2, limit: 25, sort: 'createdAt', order: 'desc', search: 'MacBook' }
```

### 2. Authentication

Schemas for user sign-in and token refreshing:

```typescript
import { loginSchema, refreshTokenSchema } from '@uims/shared-validators';

// Login credentials
const credentials = loginSchema.parse({
  email: 'admin@enterprise.internal',
  password: 'SecurePassword123!',
});

// Refresh token payload
const refreshPayload = refreshTokenSchema.parse({
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
});
```

### 3. User Management

Schemas for creating, updating, and toggling user accounts:

```typescript
import {
  createUserSchema,
  updateUserSchema,
  toggleUserStatusSchema,
} from '@uims/shared-validators';
import { DirectorySource, UserStatus } from '@uims/shared-types';

const newUser = createUserSchema.parse({
  email: 'jane.doe@enterprise.internal',
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: 'Jane Doe',
  jobTitle: 'Senior Systems Administrator',
  source: DirectorySource.LOCAL,
  status: UserStatus.ACTIVE,
});

// Partial update for editing user profiles
const updatePayload = updateUserSchema.parse({
  departmentId: 'd9b0f452-9b24-4f51-b847-a8a29a1dc001',
  phone: '+1-555-0199',
});

// User status activation/deactivation
const statusChange = toggleUserStatusSchema.parse({
  status: UserStatus.SUSPENDED,
});
```

### 4. Asset Management

Schemas for registering and updating hardware, software, and enterprise assets:

```typescript
import { createAssetSchema, updateAssetSchema } from '@uims/shared-validators';
import { AssetStatus } from '@uims/shared-types';

const newAsset = createAssetSchema.parse({
  name: 'Dell Latitude 7440',
  description: 'IT Department loaner laptop',
  status: AssetStatus.IN_STOCK,
  categoryId: 'c3a1e2f3-1234-5678-9abc-def012345678',
  serialNumber: 'DL7440-998822',
  purchasePrice: 1450.0,
  purchaseDate: '2026-01-15T00:00:00.000Z',
});

// Update asset details (allows updating asset tag)
const assetUpdate = updateAssetSchema.parse({
  tag: 'AST-2026-0042',
  notes: 'Assigned to DevOps engineering team',
});
```

### 5. License Management

Schemas for software licensing, seat counts, and expiration dates:

```typescript
import { createLicenseSchema, updateLicenseSchema } from '@uims/shared-validators';
import { LicenseStatus, LicenseType } from '@uims/shared-types';

const newLicense = createLicenseSchema.parse({
  name: 'JetBrains All Products Pack',
  publisher: 'JetBrains s.r.o.',
  type: LicenseType.SUBSCRIPTION,
  status: LicenseStatus.ACTIVE,
  totalSeats: 50,
  cost: 14999.0,
  purchaseDate: '2026-01-01T00:00:00.000Z',
  expiryDate: '2027-01-01T00:00:00.000Z',
  key: 'XXXX-XXXX-XXXX-XXXX',
});

const licenseUpdate = updateLicenseSchema.parse({
  totalSeats: 75,
});
```

### 6. Organization, Department & Position

Schemas for managing corporate structural hierarchies:

```typescript
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createPositionSchema,
  updatePositionSchema,
} from '@uims/shared-validators';

// Organization
const org = createOrganizationSchema.parse({
  name: 'Acme Global Operations',
  code: 'ACME-GL',
  email: 'contact@acmeglobal.com',
  website: 'https://acmeglobal.com',
});

// Department
const dept = createDepartmentSchema.parse({
  name: 'Information Security',
  code: 'SEC-01',
  organizationId: 'org-123',
  managerName: 'Alex Mercer',
});

// Position
const pos = createPositionSchema.parse({
  title: 'Cloud Security Architect',
  code: 'CSA-04',
  departmentId: 'dept-123',
  level: 'Senior',
});
```

### 7. Role & Permission Management

Schemas and inferred TypeScript types for RBAC management:

```typescript
import {
  createRoleSchema,
  updateRoleSchema,
  cloneRoleSchema,
  syncRolePermissionsSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  type CloneRoleInput,
  type SyncRolePermissionsInput,
} from '@uims/shared-validators';

const newRole: CreateRoleInput = createRoleSchema.parse({
  name: 'Asset Specialist',
  description: 'Manages hardware assets and warranty renewals',
  permissionIds: ['123e4567-e89b-12d3-a456-426614174000'],
});

const clonedRole: CloneRoleInput = cloneRoleSchema.parse({
  targetRoleName: 'Senior Asset Specialist',
  description: 'Cloned from Asset Specialist with elevated delete permissions',
});

const permissionSync: SyncRolePermissionsInput = syncRolePermissionsSchema.parse({
  permissionIds: [
    '123e4567-e89b-12d3-a456-426614174000',
    '876e4567-e89b-12d3-a456-426614174999',
  ],
});
```

## API Summary

| Module | Export | Type | Description |
| :--- | :--- | :--- | :--- |
| **Common** | `uuidSchema` | `ZodString` | Validates standard UUID format |
| | `emailSchema` | `ZodString` | Validates email address format (max 255 chars) |
| | `dateSchema` | `ZodString` | Validates ISO datetime string format |
| | `idParamSchema` | `ZodObject` | Validates object with UUID `id` parameter |
| **Pagination** | `paginationSchema` | `ZodObject` | Validates and coerces query params (`page`, `limit`, `sort`, `order`, `search`) |
| **Auth** | `loginSchema` | `ZodObject` | Validates email and password (minimum 8 chars) for login |
| | `refreshTokenSchema` | `ZodObject` | Validates presence of `refreshToken` string |
| **User** | `createUserSchema` | `ZodObject` | Validates new user creation attributes |
| | `updateUserSchema` | `ZodObject` | Partial schema for updating user profile fields |
| | `toggleUserStatusSchema` | `ZodObject` | Validates user status enumeration transition |
| **Asset** | `createAssetSchema` | `ZodObject` | Validates asset registration data (name, status, category, pricing, serial) |
| | `updateAssetSchema` | `ZodObject` | Partial schema with optional `tag` field for asset updates |
| **License** | `createLicenseSchema` | `ZodObject` | Validates software license registration data (seats, cost, validity period) |
| | `updateLicenseSchema` | `ZodObject` | Partial schema for license adjustments |
| **Organization** | `createOrganizationSchema` | `ZodObject` | Validates organization record creation |
| | `updateOrganizationSchema` | `ZodObject` | Partial schema for updating organization details |
| | `createDepartmentSchema` | `ZodObject` | Validates department creation with optional hierarchy links |
| | `updateDepartmentSchema` | `ZodObject` | Partial schema for department updates |
| | `createPositionSchema` | `ZodObject` | Validates job position creation with level and department link |
| | `updatePositionSchema` | `ZodObject` | Partial schema for position updates |
| **Role & Permission** | `createRoleSchema` | `ZodObject` | Validates role creation with name (2-50 chars) and optional permission IDs |
| | `updateRoleSchema` | `ZodObject` | Validates role update fields |
| | `cloneRoleSchema` | `ZodObject` | Validates target role name and description for cloning |
| | `syncRolePermissionsSchema` | `ZodObject` | Validates array of UUID permission IDs for synchronization |
| | `CreateRoleInput` | `Type` | TypeScript type inferred from `createRoleSchema` |
| | `UpdateRoleInput` | `Type` | TypeScript type inferred from `updateRoleSchema` |
| | `CloneRoleInput` | `Type` | TypeScript type inferred from `cloneRoleSchema` |
| | `SyncRolePermissionsInput` | `Type` | TypeScript type inferred from `syncRolePermissionsSchema` |

## Development Scripts

The following scripts are configured in `package.json`:

- `pnpm run build` — Bundles package using `tsdown` to ESM with generated type declarations (`.d.mts`).
- `pnpm run dev` — Runs `tsdown` in watch mode.
- `pnpm run typecheck` — Runs `tsc --noEmit` to verify type safety.
- `pnpm run test` — Executes test suite with `vitest`.
- `pnpm run clean` — Removes build artifacts (`dist`).

## Contributing

This package is part of the private UIMS monorepo. Please refer to the [Monorepo Contributing Guidelines](../../README.md#contributing) for development workflow, code formatting standards, and pull request procedures.

## License

UNLICENSED (Internal / Private package for the UIMS platform)

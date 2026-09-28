<!-- generated-by: gsd-doc-writer -->
# @uims/shared-validators

> Shared runtime Zod validation schemas and inferred TypeScript types for the UIMS platform.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/shared-validators` provides runtime schema validation and static type inference across both frontend forms (React / Ant Design) and backend API route handlers (NestJS) in the UIMS monorepo. Built with [Zod](https://zod.dev/), it defines strict, deterministic schema contracts for authentication, identity and directory users, IT hardware and software assets, IPAM and network topology, consumable inventory, organizational hierarchy, RBAC permissions, and system notifications.

## Usage

Import validation schemas directly from `@uims/shared-validators` for input payload verification, query string sanitization, and safe error handling.

### Safe-Parsing Input Payloads

```typescript
import { createAppUserSchema } from '@uims/shared-validators';

// Safe-parse request bodies in controllers or validation pipes
const result = createAppUserSchema.safeParse(req.body);

if (!result.success) {
  // Access structured field errors
  const errors = result.error.flatten().fieldErrors;
  throw new BadRequestException({ message: 'Validation failed', errors });
}

// result.data is strictly typed
const validatedUser = result.data;
```

### Common Primitives & Pagination

Validate UUIDs, email addresses, ISO datetimes, and paginated query strings with automated coercion and sensible defaults:

```typescript
import {
  uuidSchema,
  emailSchema,
  dateSchema,
  idParamSchema,
  paginationSchema,
} from '@uims/shared-validators';

// UUID validation
const param = idParamSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });

// Query pagination coercion (strings coerced to numbers, defaults applied)
const query = paginationSchema.parse({
  page: '2',
  limit: '25',
  sort: 'createdAt',
  order: 'desc',
  search: 'Workstation',
});
// Result: { page: 2, limit: 25, sort: 'createdAt', order: 'desc', search: 'Workstation' }
```

### Authentication & User Management

Validate login credentials, refresh tokens, and application user accounts:

```typescript
import {
  loginSchema,
  refreshTokenSchema,
  createAppUserSchema,
  updateAppUserSchema,
  toggleAppUserStatusSchema,
  resetAppUserPasswordSchema,
} from '@uims/shared-validators';
import { UserStatus } from '@uims/shared-types';

// Login payload
const credentials = loginSchema.parse({
  email: 'admin@enterprise.internal',
  password: 'SecurePassword123!',
});

// App user creation
const newUser = createAppUserSchema.parse({
  email: 'john.doe@enterprise.internal',
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'John Doe',
  status: UserStatus.ACTIVE,
});

// Status transition
const statusUpdate = toggleAppUserStatusSchema.parse({
  status: UserStatus.SUSPENDED,
});
```

### Directory Users & Batch CSV Import

Schemas supporting enterprise directory synchronization, employee organizational mapping, and bulk CSV imports:

```typescript
import {
  createDirectoryUserSchema,
  updateDirectoryUserSchema,
  directoryUserQuerySchema,
  createDirectoryGroupSchema,
  batchImportDirectoryUsersSchema,
} from '@uims/shared-validators';
import { AccountStatus, DirectorySource } from '@uims/shared-types';

const directoryUser = createDirectoryUserSchema.parse({
  employeeCode: 'EMP-0142',
  email: 'sarah.connor@enterprise.internal',
  firstName: 'Sarah',
  lastName: 'Connor',
  source: DirectorySource.ACTIVE_DIRECTORY,
  status: AccountStatus.ACTIVE,
  departmentId: '123e4567-e89b-12d3-a456-426614174000',
});

// Bulk CSV import payload
const batch = batchImportDirectoryUsersSchema.parse({
  users: [
    {
      name: 'Sarah Connor',
      email: 'sarah.connor@enterprise.internal',
      employeeCode: 'EMP-0142',
      department: 'Infrastructure',
    },
  ],
});
```

### Asset & License Management

Validate hardware asset lifecycle events, software licenses, seat allocations, and renewals:

```typescript
import {
  createAssetSchema,
  updateAssetSchema,
  assetQuerySchema,
  createLicenseSchema,
  updateLicenseSchema,
  assignUserLicenseSchema,
  batchAssignUserLicenseSchema,
} from '@uims/shared-validators';
import { AssetStatus, LicenseType, LicenseStatus } from '@uims/shared-types';

// Hardware asset creation
const asset = createAssetSchema.parse({
  name: 'Dell PowerEdge R750',
  assetTag: 'AST-SRV-001',
  status: AssetStatus.IN_STOCK,
  serialNumber: 'SRV-884920',
  purchaseDate: '2026-01-10T00:00:00.000Z',
});

// Software license with seat constraints
const license = createLicenseSchema.parse({
  name: 'Postman Enterprise',
  publisher: 'Postman, Inc.',
  type: LicenseType.SUBSCRIPTION,
  status: LicenseStatus.ACTIVE,
  totalSeats: 25,
  cost: 7500.0,
  expiryDate: '2027-01-10T00:00:00.000Z',
});
```

### Network Topology & IPAM

Comprehensive schema validation for VLANs, subnets with CIDR verification, IPv4 addresses, MAC addresses, network racks, managed switches, and switch ports:

```typescript
import {
  createVlanSchema,
  createSubnetSchema,
  createIpAddressSchema,
  createRackSchema,
  createSwitchSchema,
  createSwitchPortSchema,
  calculateSubnetQuerySchema,
} from '@uims/shared-validators';
import { PortMode, SwitchRole } from '@uims/shared-types';

// CIDR subnet definition
const subnet = createSubnetSchema.parse({
  name: 'Server Management Subnet',
  cidr: '10.232.130.0/24',
  gateway: '10.232.130.1',
});

// Network switch with port generation
const networkSwitch = createSwitchSchema.parse({
  name: 'Core-SW-01',
  model: 'Catalyst 9300',
  vendor: 'Cisco',
  role: SwitchRole.CORE,
  totalPorts: 48,
  uplinkPorts: 4,
  fiberPorts: 4,
  autoGeneratePorts: true,
});

// Switch port configuration
const switchPort = createSwitchPortSchema.parse({
  switchId: '123e4567-e89b-12d3-a456-426614174000',
  portNumber: 1,
  name: 'GigabitEthernet1/0/1',
  mode: PortMode.ACCESS,
  poeEnabled: true,
});
```

### Inventory & Consumables

Validate stock thresholds, restocking operations, and warehouse tracking:

```typescript
import {
  createInventoryCategorySchema,
  createInventoryItemSchema,
  restockInventorySchema,
  inventoryQuerySchema,
} from '@uims/shared-validators';

const item = createInventoryItemSchema.parse({
  name: 'Cat6 Ethernet Patch Cable 3m',
  sku: 'CAB-CAT6-3M',
  categoryId: '123e4567-e89b-12d3-a456-426614174000',
  quantity: 150,
  minThreshold: 20,
  unitCost: 3.5,
});

const restock = restockInventorySchema.parse({
  quantity: 50,
});
```

### Roles, Permissions & Notifications

Inferred TypeScript types and schemas for RBAC configuration and structured notifications:

```typescript
import {
  createRoleSchema,
  syncRolePermissionsSchema,
  createNotificationSchema,
  markNotificationReadSchema,
  type CreateRoleInput,
  type SyncRolePermissionsInput,
  type CreateNotificationSchema,
} from '@uims/shared-validators';
import { NotificationType } from '@uims/shared-types';

// Role definition with permission mapping
const roleInput: CreateRoleInput = createRoleSchema.parse({
  name: 'Network Administrator',
  description: 'Manages VLANs, subnets, and switch configurations',
  permissionIds: ['123e4567-e89b-12d3-a456-426614174000'],
});

// Notification emission
const alert: CreateNotificationSchema = createNotificationSchema.parse({
  userId: '123e4567-e89b-12d3-a456-426614174000',
  title: 'High Temperature Alert',
  message: 'Rack A1 exhaust temperature exceeded 35°C',
  type: NotificationType.ALERT,
  category: 'alerts',
});
```

## API Summary

### Common & Pagination

| Export | Type | Description |
| :--- | :--- | :--- |
| `uuidSchema` | `ZodString` | Validates standard RFC 4122 UUID strings |
| `emailSchema` | `ZodString` | Validates email address format (max 255 chars) |
| `dateSchema` | `ZodString` | Validates ISO 8601 datetime strings |
| `idParamSchema` | `ZodObject` | Validates route parameters object containing a UUID `id` |
| `paginationSchema` | `ZodObject` | Validates and coerces query parameters (`page`, `limit`, `sort`, `order`, `search`) |

### Authentication & Application Users

| Export | Type | Description |
| :--- | :--- | :--- |
| `loginSchema` | `ZodObject` | Validates login email and password (minimum 8 characters) |
| `refreshTokenSchema` | `ZodObject` | Validates presence of `refreshToken` string |
| `createAppUserSchema` | `ZodObject` | Validates application user registration and profile fields |
| `updateAppUserSchema` | `ZodObject` | Partial schema for updating application user attributes |
| `toggleAppUserStatusSchema` | `ZodObject` | Validates `UserStatus` state transitions |
| `resetAppUserPasswordSchema` | `ZodObject` | Validates new password format (6-100 characters) |

### Directory Users & Groups

| Export | Type | Description |
| :--- | :--- | :--- |
| `createDirectoryUserSchema` | `ZodObject` | Validates enterprise directory employee profile records |
| `updateDirectoryUserSchema` | `ZodObject` | Partial schema for directory employee modifications |
| `directoryUserQuerySchema` | `ZodObject` | Validates directory filtering and pagination query options |
| `createDirectoryGroupSchema` | `ZodObject` | Validates directory group name, scope, type, and OU path |
| `batchImportDirectoryItemSchema` | `ZodObject` | Validates individual CSV row for batch user import |
| `batchImportDirectoryUsersSchema` | `ZodObject` | Validates container array of batch import directory items |

### Asset Management

| Export | Type | Description |
| :--- | :--- | :--- |
| `createAssetSchema` | `ZodObject` | Validates asset registration (name, tag, category, location, serial, status) |
| `updateAssetSchema` | `ZodObject` | Partial schema for asset updates and tag modifications |
| `assetQuerySchema` | `ZodObject` | Validates filter parameters for asset list queries |

### Software Licenses

| Export | Type | Description |
| :--- | :--- | :--- |
| `createLicenseSchema` | `ZodObject` | Validates license registration, seat counts, publisher, pricing, and validity dates |
| `updateLicenseSchema` | `ZodObject` | Partial schema for license adjustments |
| `assignUserLicenseSchema` | `ZodObject` | Validates single-user license assignment |
| `batchAssignUserLicenseSchema` | `ZodObject` | Validates multi-user batch license assignment |
| `licenseQuerySchema` | `ZodObject` | Validates license search and filter query parameters |

### Organization, Department & Position

| Export | Type | Description |
| :--- | :--- | :--- |
| `createOrganizationSchema` | `ZodObject` | Validates corporate organization entities |
| `updateOrganizationSchema` | `ZodObject` | Partial schema for organization updates |
| `createDepartmentSchema` | `ZodObject` | Validates department entities with manager and parent hierarchy |
| `updateDepartmentSchema` | `ZodObject` | Partial schema for department updates |
| `createPositionSchema` | `ZodObject` | Validates job positions with department links and seniority levels |
| `updatePositionSchema` | `ZodObject` | Partial schema for position updates |

### Roles & Permissions (RBAC)

| Export | Type | Description |
| :--- | :--- | :--- |
| `createRoleSchema` | `ZodObject` | Validates role name (2-50 chars), description, and permission IDs |
| `updateRoleSchema` | `ZodObject` | Validates partial role modifications |
| `cloneRoleSchema` | `ZodObject` | Validates target role name and description for role duplication |
| `syncRolePermissionsSchema` | `ZodObject` | Validates array of UUID permission IDs for role sync |
| `CreateRoleInput` | `Type` | TypeScript type inferred from `createRoleSchema` |
| `UpdateRoleInput` | `Type` | TypeScript type inferred from `updateRoleSchema` |
| `CloneRoleInput` | `Type` | TypeScript type inferred from `cloneRoleSchema` |
| `SyncRolePermissionsInput` | `Type` | TypeScript type inferred from `syncRolePermissionsSchema` |

### System Notifications

| Export | Type | Description |
| :--- | :--- | :--- |
| `notificationQuerySchema` | `ZodObject` | Validates notification list filtering (category, type, read status, pagination) |
| `createNotificationSchema` | `ZodObject` | Validates notification payload (userId, title, message, category, type) |
| `markNotificationReadSchema` | `ZodObject` | Validates read status flag |
| `bulkNotificationActionSchema` | `ZodObject` | Validates array of notification IDs for bulk actions |
| `NotificationQuerySchema` | `Type` | TypeScript type inferred from `notificationQuerySchema` |
| `CreateNotificationSchema` | `Type` | TypeScript type inferred from `createNotificationSchema` |
| `MarkNotificationReadSchema` | `Type` | TypeScript type inferred from `markNotificationReadSchema` |
| `BulkNotificationActionSchema` | `Type` | TypeScript type inferred from `bulkNotificationActionSchema` |

### Network Infrastructure & IPAM

| Export | Type | Description |
| :--- | :--- | :--- |
| `ipv4Regex` | `RegExp` | Validates dotted-decimal IPv4 address strings (0.0.0.0 - 255.255.255.255) |
| `cidrRegex` | `RegExp` | Validates IPv4 CIDR notation (prefix length /0 to /32) |
| `macRegex` | `RegExp` | Validates standard MAC address formats (colon, hyphen, or dot-separated) |
| `createVlanSchema` | `ZodObject` | Validates VLAN number (1-4094), name, description, and status |
| `updateVlanSchema` | `ZodObject` | Partial schema for VLAN modifications |
| `vlanQuerySchema` | `ZodObject` | Validates VLAN query filters |
| `createSubnetSchema` | `ZodObject` | Validates CIDR notation, gateway, netmask, and IP range bounds |
| `updateSubnetSchema` | `ZodObject` | Partial schema for subnet modifications |
| `subnetQuerySchema` | `ZodObject` | Validates subnet query filters |
| `createIpAddressSchema` | `ZodObject` | Validates static/dynamic IP assignments, MAC, host binding, and ping status |
| `updateIpAddressSchema` | `ZodObject` | Partial schema for IP address modifications |
| `ipAddressQuerySchema` | `ZodObject` | Validates IP address query parameters |
| `createRackSchema` | `ZodObject` | Validates server rack height, dimensions, power/weight ratings |
| `updateRackSchema` | `ZodObject` | Partial schema for rack modifications |
| `rackQuerySchema` | `ZodObject` | Validates rack query filters |
| `createSwitchSchema` | `ZodObject` | Validates network switch vendor, model, total/uplink/fiber ports, and role |
| `updateSwitchSchema` | `ZodObject` | Partial schema for switch modifications |
| `switchQuerySchema` | `ZodObject` | Validates switch query filters |
| `createSwitchPortSchema` | `ZodObject` | Validates port number (1-128), form factor, PoE, mode, and VLAN tagging |
| `updateSwitchPortSchema` | `ZodObject` | Partial schema for switch port modifications |
| `switchPortQuerySchema` | `ZodObject` | Validates switch port queries |
| `calculateSubnetQuerySchema` | `ZodObject` | Validates CIDR string for subnet range calculation |
| `autoDetectQuerySchema` | `ZodObject` | Validates IPv4 address string for automatic network discovery |
| `macVendorQuerySchema` | `ZodObject` | Validates MAC address string for OUI vendor lookup |

### Inventory & Consumables

| Export | Type | Description |
| :--- | :--- | :--- |
| `createInventoryCategorySchema` | `ZodObject` | Validates inventory category name and description |
| `updateInventoryCategorySchema` | `ZodObject` | Partial schema for inventory category updates |
| `createInventoryItemSchema` | `ZodObject` | Validates consumable item, SKU, category link, stock levels, and unit cost |
| `updateInventoryItemSchema` | `ZodObject` | Partial schema for item updates |
| `restockInventorySchema` | `ZodObject` | Validates positive restock quantity |
| `inventoryQuerySchema` | `ZodObject` | Validates inventory search, category/location filters, and stock status |

## Testing

The test suite validates schema boundaries, coercion behavior, valid and invalid payload formatting, and adversarial edge cases across all domain modules.

### Running Tests

Execute the Vitest test suite from the repository root:

```bash
pnpm --filter @uims/shared-validators test
```

Or run tests directly from within `packages/shared-validators`:

```bash
pnpm run test
```

### Test Suite Overview

The package contains 9 test suites with 140 automated test cases:

- `common.validator.test.ts` — UUID, email, date, and route parameter schema verification.
- `asset.validator.test.ts` — Asset creation, update, and search query validation.
- `license.validator.test.ts` — License seat counts, pricing, validity periods, and assignment validation.
- `inventory.validator.test.ts` — Item thresholds, restock counts, and query filters.
- `role.validator.test.ts` — Role names, descriptions, and permission synchronization.
- `notification.validator.test.ts` — Notification creation, boolean coercion, and query parameters.
- `network.validator.test.ts` — VLAN numbers (1-4094), CIDR formatting, IPv4 addresses, and switch configurations.
- `network.validator.adversarial.test.ts` — Adversarial input testing for CIDR masks, invalid IP octets, and malformed MAC addresses.
- `m1.adversarial.test.ts` — Stress testing against malicious inputs, boundary violations, type coercion attacks, and Unicode payloads.

## Development Scripts

The following scripts are defined in `package.json`:

- `pnpm run build` — Bundles the package using `tsdown` into ESM (`dist/index.mjs`) with TypeScript declarations (`dist/index.d.mts`).
- `pnpm run dev` — Runs `tsdown` in watch mode for local development.
- `pnpm run typecheck` — Runs `tsc --noEmit` to verify type integrity.
- `pnpm run test` — Executes the Vitest test runner.
- `pnpm run clean` — Removes the `dist` build directory.

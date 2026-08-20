<!-- generated-by: gsd-doc-writer -->
# @uims/shared-types

> Centralized TypeScript interfaces, domain entities, DTO schemas, and enums for the UIMS platform.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/shared-types` serves as the single source of truth for all data contracts across the UIMS ecosystem. It provides strongly-typed domain entity models, API request/response DTOs, query filter definitions, and system enums shared across backend microservices/APIs and frontend applications.

## Installation / Internal Consumption

In a workspace package:

```json
{
  "dependencies": {
    "@uims/shared-types": "workspace:*"
  }
}
```

Import entities, DTOs, or enums directly from the package:

```typescript
import {
  Asset,
  AssetStatus,
  CreateAssetDto,
  ApiResponse,
  User,
  UserStatus,
  PermissionAction,
  PermissionSubject,
} from '@uims/shared-types';
```

## Usage & Core Modules

### 1. API Responses & Pagination

Standardized wrappers for uniform REST API responses and paginated query results:

```typescript
import type { ApiResponse, ApiErrorResponse, PaginationMeta, PaginationQuery } from '@uims/shared-types';

// Standard response payload
const response: ApiResponse<User[]> = {
  success: true,
  data: usersList,
  meta: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5,
  },
  timestamp: new Date().toISOString(),
};

// API error format
const errorResponse: ApiErrorResponse = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input payload',
    details: {
      email: ['Email address is invalid'],
    },
  },
  timestamp: new Date().toISOString(),
};
```

### 2. Assets & Hardware Management

Type definitions for physical assets, category hierarchies, historical change audits, and asset CRUD DTOs:

```typescript
import { Asset, AssetStatus, CreateAssetDto, UpdateAssetDto } from '@uims/shared-types';

const newAsset: CreateAssetDto = {
  name: 'MacBook Pro 16" M3 Max',
  assetTag: 'AST-2026-0042',
  serialNumber: 'C02G1234MD6R',
  status: AssetStatus.AVAILABLE,
  purchaseCost: 3499,
  purchaseDate: '2026-01-15',
};
```

### 3. Identity, Directory & Access Control

Models for users, Active Directory/LDAP directory sync, role-based access control (RBAC), and permissions:

```typescript
import {
  User,
  UserStatus,
  Role,
  Permission,
  PermissionAction,
  PermissionSubject,
  DirectoryGroup,
  OrganizationalUnit,
} from '@uims/shared-types';

const userRole: Role = {
  id: 'role-sec-admin',
  name: 'Security Admin',
  isSystem: true,
  permissions: [
    {
      id: 'perm-asset-manage',
      action: PermissionAction.MANAGE,
      subject: PermissionSubject.ASSET,
    },
  ],
};
```

### 4. Software Licenses & Subscriptions

Contracts for enterprise software license tracking, seat allocations, and renewal cycles:

```typescript
import { License, LicenseType, LicenseStatus, CreateLicenseDto } from '@uims/shared-types';

const officeLicense: CreateLicenseDto = {
  name: 'Microsoft 365 E5 Enterprise',
  vendor: 'Microsoft',
  type: LicenseType.SUBSCRIPTION,
  totalSeats: 500,
  costPerSeat: 57.0,
  autoRenew: true,
  status: LicenseStatus.ACTIVE,
};
```

### 5. IP Address Management (IPAM) & Network Topology

Data structures for VLANs, subnets, IPv4/IPv6 allocation, and network interfaces:

```typescript
import { Subnet, IPAddress, IPStatus, CreateSubnetDto } from '@uims/shared-types';

const serverSubnet: CreateSubnetDto = {
  name: 'DataCenter-VLAN10-Prod',
  cidr: '10.10.10.0/24',
  gateway: '10.10.10.1',
  vlanName: 'VLAN 10 - Production Servers',
};
```

### 6. Timezone & Localization Preferences

Types supporting multi-region enterprise timezone management and user preferences:

```typescript
import type { TimezoneOption, TimezonePreference, DateFormatPattern } from '@uims/shared-types';

const userPref: TimezonePreference = {
  timezone: 'Asia/Ho_Chi_Minh',
  mode: 'custom',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  showTimezoneBadge: true,
};
```

## API Summary & Export Catalog

### Domain Entities

| Export | Kind | Source Module | Description |
| :--- | :--- | :--- | :--- |
| `Asset` | `interface` | `entities/asset` | Hardware and physical device asset record |
| `AssetCategory` | `interface` | `entities/asset` | Hierarchical asset categorization category |
| `AssetHistory` | `interface` | `entities/asset` | Historical audit log entry for asset mutations |
| `AuditLog` | `interface` | `entities/audit` | Enterprise audit trail log record |
| `Location` | `interface` | `entities/common` | Physical facility or branch office location |
| `Vendor` | `interface` | `entities/common` | Supplier and third-party vendor details |
| `Setting` | `interface` | `entities/common` | Application and system configuration key-value pair |
| `DirectoryGroup` | `interface` | `entities/directory` | AD / LDAP directory security or distribution group |
| `OrganizationalUnit` | `interface` | `entities/directory` | Active Directory Organizational Unit (OU) structure |
| `InventoryItem` | `interface` | `entities/inventory` | Consumable stock and spare parts inventory item |
| `License` | `interface` | `entities/license` | Software license and subscription agreement |
| `LicenseAssignment` | `interface` | `entities/license` | User or device license seat assignment record |
| `VLAN` | `interface` | `entities/network` | Virtual Local Area Network definition |
| `Subnet` | `interface` | `entities/network` | IP subnet network range definition |
| `IPAddress` | `interface` | `entities/network` | Individual IP address lease and host assignment |
| `Notification` | `interface` | `entities/notification` | System notification message record |
| `NotificationItem` | `interface` | `entities/notification` | UI notification feed item |
| `Organization` | `interface` | `entities/organization` | Top-level corporate entity or subsidiary |
| `Department` | `interface` | `entities/organization` | Departmental unit within an organization |
| `Position` | `interface` | `entities/organization` | Job position title and headcount metadata |
| `OrgNode` | `interface` | `entities/organization` | Tree node structure for organizational charts |
| `OrganizationStats` | `interface` | `entities/organization` | Aggregate organization hierarchy statistics |
| `Permission` | `interface` | `entities/role` | RBAC granular permission rule definition |
| `RolePermission` | `interface` | `entities/role` | Join relation between role and permission |
| `RoleAssignedUser` | `interface` | `entities/role` | Lightweight user summary bound to a role |
| `Role` | `interface` | `entities/role` | RBAC role definition with associated permissions |
| `PermissionCatalogAction` | `interface` | `entities/role` | Action metadata for permission matrix catalogs |
| `PermissionCatalogSubject` | `interface` | `entities/role` | Subject module metadata for permission matrix |
| `TimezoneOption` | `interface` | `entities/timezone` | IANA timezone option with offset and localized labels |
| `TimezonePreference` | `interface` | `entities/timezone` | User date/time/timezone display preferences |
| `SystemTimeInfo` | `interface` | `entities/timezone` | Server-side time and timezone runtime state |
| `User` | `interface` | `entities/user` | System user and Active Directory employee profile |
| `UserSummaryStats` | `interface` | `entities/user` | User account summary and directory count metrics |

### System Enums & Types

| Export | Kind | Source Module | Description |
| :--- | :--- | :--- | :--- |
| `AssetStatus` | `enum` | `entities/asset` | `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `RETIRED`, `LOST` |
| `AccountStatus` | `enum` | `entities/directory` | `ACTIVE`, `DISABLED`, `LOCKED`, `SUSPENDED` |
| `DirectorySource` | `enum` | `entities/directory` | `LOCAL`, `LDAP`, `AZURE_AD` |
| `GroupType` | `type` | `entities/directory` | Directory group types (`Security`, `Distribution`, etc.) |
| `GroupScope` | `type` | `entities/directory` | Group scopes (`Domain Local`, `Global`, `Universal`, etc.) |
| `LicenseType` | `enum` | `entities/license` | `SUBSCRIPTION`, `PERPETUAL`, `OPEN_SOURCE`, `VOLUME`, `OEM` |
| `LicenseStatus` | `enum` | `entities/license` | `ACTIVE`, `EXPIRED`, `EXPIRING_SOON`, `REVOKED` |
| `IPStatus` | `enum` | `entities/network` | `AVAILABLE`, `RESERVED`, `ASSIGNED` |
| `NotificationType` | `enum` | `entities/notification` | `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `ALERT`, `SYSTEM` |
| `NotificationSocketEvents` | `enum` | `entities/notification` | WebSocket event names for real-time notifications |
| `TimezoneRegion` | `type` | `entities/timezone` | Continent/region grouping identifier |
| `DateFormatPattern` | `type` | `entities/timezone` | Supported date format tokens (`YYYY-MM-DD`, etc.) |
| `TimeFormatPattern` | `type` | `entities/timezone` | Supported time format modes (`24h`, `12h`) |
| `UserStatus` | `enum` | `entities/user` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `PermissionAction` | `enum` | `enums/permissions` | `CREATE`, `READ`, `UPDATE`, `DELETE`, `EXPORT`, `MANAGE` |
| `PermissionSubject` | `enum` | `enums/permissions` | Subject entities (`Asset`, `License`, `User`, `all`, etc.) |
| `SYSTEM_ROLE_NAMES` | `const array` | `enums/permissions` | Built-in system role names list |
| `SystemRoleName` | `type` | `enums/permissions` | Union type of `SYSTEM_ROLE_NAMES` |

### Data Transfer Objects (DTOs) & Contracts

| Export | Kind | Source Module | Description |
| :--- | :--- | :--- | :--- |
| `PaginationMeta` | `interface` | `dto/api-response` | Pagination metadata header (page, limit, total, totalPages) |
| `ApiResponse<T>` | `interface` | `dto/api-response` | Standard generic envelope for successful API responses |
| `ApiErrorResponse` | `interface` | `dto/api-response` | Standard error payload format with error codes and field details |
| `LoginRequest` | `interface` | `dto/auth` | Authentication credentials payload |
| `LoginResponse` | `interface` | `dto/auth` | JWT token and authenticated user payload |
| `RefreshRequest` | `interface` | `dto/auth` | Token refresh request payload |
| `TokenPayload` | `interface` | `dto/auth` | Decoded JWT claims and permission payload |
| `CreateResponse<T>` | `interface` | `dto/common` | Generic entity creation response |
| `UpdateResponse<T>` | `interface` | `dto/common` | Generic entity update response |
| `DeleteResponse` | `interface` | `dto/common` | Generic entity deletion confirmation |
| `PaginationQuery` | `interface` | `dto/pagination` | Query parameters for paginated requests (page, limit, sort, order) |
| `CreateAssetDto` | `interface` | `dto/assets.dto` | Payload for creating an asset |
| `UpdateAssetDto` | `interface` | `dto/assets.dto` | Partial payload for updating an asset |
| `AssetQueryDto` | `interface` | `dto/assets.dto` | Filter query parameters for asset list views |
| `AssetStatsDto` | `interface` | `dto/assets.dto` | Aggregated asset status counts |
| `CreateLicenseDto` | `interface` | `dto/licenses.dto` | Payload for creating a license record |
| `UpdateLicenseDto` | `interface` | `dto/licenses.dto` | Partial payload for updating a license |
| `LicenseQueryDto` | `interface` | `dto/licenses.dto` | Filter query parameters for license list views |
| `AssignUserLicenseDto` | `interface` | `dto/licenses.dto` | Payload for assigning a license to a user |
| `LicenseStatsDto` | `interface` | `dto/licenses.dto` | Summary metrics for license seats and spend |
| `CreateIPAddressDto` | `interface` | `dto/network.dto` | Payload for registering or assigning an IP address |
| `UpdateIPAddressDto` | `interface` | `dto/network.dto` | Partial payload for updating an IP address record |
| `IPAddressQueryDto` | `interface` | `dto/network.dto` | Filter query parameters for IPAM listing |
| `CreateSubnetDto` | `interface` | `dto/network.dto` | Payload for creating a subnet allocation |
| `NetworkStatsDto` | `interface` | `dto/network.dto` | Network subnet and IP capacity metrics |
| `CreateInventoryItemDto` | `interface` | `dto/inventory.dto` | Payload for creating an inventory item |
| `UpdateInventoryItemDto` | `interface` | `dto/inventory.dto` | Partial payload for updating an inventory item |
| `InventoryQueryDto` | `interface` | `dto/inventory.dto` | Query filters for inventory list endpoints |
| `InventoryStatsDto` | `interface` | `dto/inventory.dto` | Valuation and stock level aggregate counts |
| `LogEventDto` | `interface` | `dto/audit.dto` | Payload for logging audit trail events |
| `AuditQueryDto` | `interface` | `dto/audit.dto` | Filter query parameters for audit log retrieval |
| `AuditStatsDto` | `interface` | `dto/audit.dto` | Compliance metrics and security anomaly stats |
| `SearchQueryDto` | `interface` | `dto/search.dto` | Global search query parameters |
| `SearchResultItem` | `interface` | `dto/search.dto` | Universal search result item schema |
| `SearchResponseDto` | `interface` | `dto/search.dto` | Formatted response for global search queries |
| `DashboardOverviewDto` | `interface` | `dto/dashboard.dto` | High-level KPI, health, activity, and action items |
| `SystemHealthDto` | `interface` | `dto/health.dto` | Runtime health metrics (uptime, memory, DB latency) |
| `CreateOrganizationDto` | `interface` | `dto/organization.dto` | Payload for creating an organization |
| `UpdateOrganizationDto` | `interface` | `dto/organization.dto` | Partial payload for updating an organization |
| `CreateDepartmentDto` | `interface` | `dto/organization.dto` | Payload for creating a department |
| `UpdateDepartmentDto` | `interface` | `dto/organization.dto` | Partial payload for updating a department |
| `CreatePositionDto` | `interface` | `dto/organization.dto` | Payload for creating a job position |
| `UpdatePositionDto` | `interface` | `dto/organization.dto` | Partial payload for updating a job position |
| `CreateSystemUserDto` | `interface` | `dto/users.dto` | Payload for creating or provisioning a system user |
| `UpdateSystemUserDto` | `interface` | `dto/users.dto` | Partial payload for updating a system user |
| `ToggleUserStatusDto` | `interface` | `dto/users.dto` | Payload for updating user activation status |
| `UserQueryDto` | `interface` | `dto/users.dto` | Query parameters for user filtering and listing |
| `CreateDirectoryGroupDto` | `interface` | `dto/users.dto` | Payload for creating a directory group |
| `BatchImportADUserItem` | `interface` | `dto/users.dto` | Row schema for bulk AD user imports |
| `BatchImportADResponse` | `interface` | `dto/users.dto` | Summary report for bulk AD user import jobs |
| `CreateRoleRequest` | `interface` | `dto/roles.dto` | Payload for creating a new RBAC role |
| `UpdateRoleRequest` | `interface` | `dto/roles.dto` | Payload for modifying a role's permissions |
| `CloneRoleRequest` | `interface` | `dto/roles.dto` | Payload for duplicating an existing role |
| `SyncRolePermissionsRequest` | `interface` | `dto/roles.dto` | Payload for syncing assigned permission IDs |
| `RoleDetailResponse` | `interface` | `dto/roles.dto` | Detailed role response including effective permissions |
| `RoleSummaryStats` | `interface` | `dto/roles.dto` | Summary metrics for roles and user coverage |

## Development Scripts

The following scripts are configured in `package.json`:

- `pnpm run build` — Bundles package using `tsdown` to ESM with generated type declarations (`.d.mts`).
- `pnpm run dev` — Runs `tsdown` in watch mode for development.
- `pnpm run typecheck` — Runs `tsc --noEmit` to verify type integrity.
- `pnpm run clean` — Removes build artifacts directory (`dist`).

## Contributing

This package is part of the private UIMS monorepo. Changes to shared contracts should be coordinated with dependent applications (`@uims/api` and `@uims/web`).

When updating types:
1. Make necessary changes under `src/`.
2. Ensure export index in `src/index.ts` is updated if new files are added.
3. Run `pnpm run typecheck` and `pnpm run build`.
4. Verify dependent packages compile cleanly with `pnpm build`.

## License

UNLICENSED — Private and proprietary. Part of the UIMS enterprise platform.

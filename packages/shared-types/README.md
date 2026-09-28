<!-- generated-by: gsd-doc-writer -->
# @uims/shared-types

> Centralized TypeScript interfaces, domain entities, DTO schemas, and enums for the UIMS platform.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/shared-types` serves as the single authoritative source of truth for all data contracts across the UIMS platform. It provides strongly-typed domain entity models, API request/response DTOs, query filter definitions, and system enums shared across backend services (`apps/api`), the web frontend (`apps/web`), and shared workspace packages.

## Usage

Import entities, DTOs, enums, or constants directly from `@uims/shared-types`:

```typescript
import {
  AppUser,
  UserStatus,
  Asset,
  AssetStatus,
  CreateAssetDto,
  ApiResponse,
  PermissionAction,
  PermissionSubject,
} from '@uims/shared-types';
```

### 1. API Responses & Pagination

Standardized envelopes for uniform REST API responses, pagination metadata, and error handling:

```typescript
import type {
  ApiResponse,
  ApiErrorResponse,
  PaginationMeta,
  PaginationQuery,
} from '@uims/shared-types';

// Successful API response envelope
const response: ApiResponse<string[]> = {
  success: true,
  data: ['record-1', 'record-2'],
  meta: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5,
  },
  timestamp: new Date().toISOString(),
};

// Standard API error payload
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

Physical IT asset models, category definitions, and asset CRUD DTOs:

```typescript
import {
  Asset,
  AssetStatus,
  CreateAssetDto,
  IT_ASSET_CATEGORIES,
  IT_ASSET_CATEGORY_IDS,
} from '@uims/shared-types';

const newAsset: CreateAssetDto = {
  name: 'MacBook Pro 16" M3 Max',
  assetTag: 'AST-2026-0042',
  serialNumber: 'C02G1234MD6R',
  status: AssetStatus.AVAILABLE,
  categoryId: IT_ASSET_CATEGORY_IDS.LAPTOP,
  purchaseDate: '2026-01-15',
};
```

### 3. Identity, Directory & Access Control

Models for application users, Active Directory/LDAP directory sync, role-based access control (RBAC), and permissions:

```typescript
import {
  AppUser,
  UserStatus,
  DirectoryUser,
  AccountStatus,
  Role,
  Permission,
  PermissionAction,
  PermissionSubject,
} from '@uims/shared-types';

const securityRole: Role = {
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
import {
  License,
  LicenseType,
  LicenseStatus,
  CreateLicenseDto,
  AssignUserLicenseDto,
} from '@uims/shared-types';

const enterpriseLicense: CreateLicenseDto = {
  name: 'Microsoft 365 E5 Enterprise',
  vendor: 'Microsoft',
  type: LicenseType.SUBSCRIPTION,
  totalSeats: 500,
  costPerSeat: 57.0,
  autoRenew: true,
  status: LicenseStatus.ACTIVE,
};
```

### 5. IP Address Management (IPAM) & Network Infrastructure

Data structures for VLANs, subnets, racks, network switches, switch ports, and IP address allocations:

```typescript
import {
  VLAN,
  Subnet,
  NetworkSwitch,
  SwitchPort,
  SwitchRole,
  SwitchStatus,
  PortFormFactor,
  PortAdminStatus,
  PortOperStatus,
  PortMode,
  SPEED_1G,
  CreateSubnetDto,
  CreateSwitchDto,
} from '@uims/shared-types';

const datacenterSubnet: CreateSubnetDto = {
  name: 'DataCenter-VLAN10-Prod',
  cidr: '10.10.10.0/24',
  gateway: '10.10.10.1',
};

const accessSwitch: CreateSwitchDto = {
  name: 'SW-CORE-01',
  model: 'C9300-48P',
  vendor: 'Cisco',
  role: SwitchRole.CORE,
  status: SwitchStatus.ONLINE,
  totalPorts: 48,
};
```

### 6. Timezone & Localization Preferences

Types supporting multi-region enterprise timezone management and user date/time preferences:

```typescript
import type { TimezonePreference, SystemTimeInfo } from '@uims/shared-types';

const userTimezone: TimezonePreference = {
  timezone: 'Asia/Ho_Chi_Minh',
  mode: 'custom',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  showTimezoneBadge: true,
};
```

## API Summary

### Domain Entities

| Export | Kind | Source Module | Description |
| :--- | :--- | :--- | :--- |
| `Asset` | `interface` | `src/entities/asset.ts` | Hardware and physical device asset record with rack/switch port linkage |
| `AssetCategory` | `interface` | `src/entities/asset.ts` | Hierarchical asset categorization category |
| `ITAssetCategoryDefinition` | `interface` | `src/entities/asset.ts` | Definition metadata for standardized IT hardware categories |
| `AuditLog` | `interface` | `src/entities/audit.ts` | Enterprise audit trail log record with diff payloads |
| `Location` | `interface` | `src/entities/common.ts` | Physical campus, site, building, room, or rack location |
| `LocationPathNode` | `interface` | `src/entities/common.ts` | Hierarchical path component for location breadcrumbs |
| `LocationTreeNode` | `interface` | `src/entities/common.ts` | Ant Design Tree/TreeSelect/Cascader compatible location hierarchy node |
| `Vendor` | `interface` | `src/entities/common.ts` | Supplier and third-party vendor details |
| `Setting` | `interface` | `src/entities/common.ts` | Application and system configuration key-value pair |
| `DirectoryUser` | `interface` | `src/entities/directory.ts` | Active Directory / LDAP employee profile |
| `DirectoryGroup` | `interface` | `src/entities/directory.ts` | AD / LDAP security or distribution group |
| `OrganizationalUnit` | `interface` | `src/entities/directory.ts` | Active Directory Organizational Unit (OU) structure |
| `DirectorySummaryStats` | `interface` | `src/entities/directory.ts` | Directory user, OU, and group metrics summary |
| `InventoryCategory` | `interface` | `src/entities/inventory.ts` | Consumable stock and spare parts category |
| `InventoryItem` | `interface` | `src/entities/inventory.ts` | Consumable stock and spare parts inventory item |
| `License` | `interface` | `src/entities/license.ts` | Software license and subscription agreement |
| `LicenseAssignment` | `interface` | `src/entities/license.ts` | Relational seat assignment between license and directory user |
| `LicenseAssignedUser` | `interface` | `src/entities/license.ts` | Lightweight assigned user summary for UI display |
| `VLAN` | `interface` | `src/entities/network.ts` | Virtual Local Area Network definition |
| `Subnet` | `interface` | `src/entities/network.ts` | IP subnet network range definition with utilization stats |
| `NetworkRack` | `interface` | `src/entities/network.ts` | Datacenter server rack definition (RU capacity, dimensions, power) |
| `NetworkSwitch` | `interface` | `src/entities/network.ts` | Managed network switch hardware with port density and rack positioning |
| `SwitchPort` | `interface` | `src/entities/network.ts` | Network switch port configuration (admin/oper status, mode, VLANs) |
| `RackElevationSlot` | `interface` | `src/entities/network.ts` | Individual rack unit (RU) slot visualization model |
| `RackElevationData` | `interface` | `src/entities/network.ts` | Complete rack elevation data payload with occupancy and power |
| `IPAddress` | `interface` | `src/entities/network.ts` | Individual IP address lease, host assignment, and switch port linkage |
| `NetworkCalculation` | `interface` | `src/entities/network.ts` | Calculated subnet boundaries, netmask, and usable host capacities |
| `AutoDetectResult` | `interface` | `src/entities/network.ts` | IP auto-detection against existing subnets and VLANs |
| `NetworkStats` | `interface` | `src/entities/network.ts` | Network subnet, IP capacity, and rack/switch infrastructure metrics |
| `Notification` | `interface` | `src/entities/notification.ts` | User notification entity record |
| `NotificationItem` | `interface` | `src/entities/notification.ts` | UI notification feed item |
| `Organization` | `interface` | `src/entities/organization.ts` | Top-level corporate entity or subsidiary |
| `Department` | `interface` | `src/entities/organization.ts` | Departmental unit within an organization |
| `Position` | `interface` | `src/entities/organization.ts` | Job position title and headcount metadata |
| `OrgNode` | `interface` | `src/entities/organization.ts` | Tree node structure for organizational charts |
| `OrganizationStats` | `interface` | `src/entities/organization.ts` | Aggregate organization hierarchy statistics |
| `Permission` | `interface` | `src/entities/role.ts` | RBAC granular permission rule definition |
| `RolePermission` | `interface` | `src/entities/role.ts` | Join relation between role and permission |
| `RoleAssignedUser` | `interface` | `src/entities/role.ts` | Lightweight user summary bound to a role |
| `Role` | `interface` | `src/entities/role.ts` | RBAC role definition with associated permissions |
| `PermissionCatalogAction` | `interface` | `src/entities/role.ts` | Action metadata for permission matrix catalogs |
| `PermissionCatalogSubject` | `interface` | `src/entities/role.ts` | Subject module metadata for permission matrix |
| `TimezoneOption` | `interface` | `src/entities/timezone.ts` | IANA timezone option with offset and localized labels |
| `TimezonePreference` | `interface` | `src/entities/timezone.ts` | User date/time/timezone display preferences |
| `SystemTimeInfo` | `interface` | `src/entities/timezone.ts` | Server-side time and timezone runtime state |
| `AppUser` | `interface` | `src/entities/user.ts` | Application user account profile for authentication |
| `AppUserSummaryStats` | `interface` | `src/entities/user.ts` | User account summary and active/admin metrics |

### System Enums & Constants

| Export | Kind | Source Module | Description |
| :--- | :--- | :--- | :--- |
| `AssetStatus` | `enum` | `src/entities/asset.ts` | `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `RETIRED`, `LOST` |
| `IT_ASSET_CATEGORY_IDS` | `const object` | `src/entities/asset.ts` | Authoritative standard category IDs (`LAPTOP`, `DESKTOP`, `SERVER`, `SWITCH`, etc.) |
| `IT_ASSET_CATEGORIES` | `const object` | `src/entities/asset.ts` | Standard IT hardware category definitions registry |
| `LocationType` | `enum` | `src/entities/common.ts` | `CAMPUS`, `SITE`, `BRANCH`, `BUILDING`, `ROOM`, `RACK`, `SHELF`, etc. |
| `AccountStatus` | `enum` | `src/entities/directory.ts` | `ACTIVE`, `DISABLED`, `LOCKED`, `SUSPENDED` |
| `DirectoryAccountStatus` | `alias` | `src/entities/directory.ts` | Type and constant alias for `AccountStatus` |
| `DirectorySource` | `enum` | `src/entities/directory.ts` | `LOCAL`, `LDAP`, `AZURE_AD` |
| `GroupType` | `type` | `src/entities/directory.ts` | Directory group types (`Security`, `Distribution`, etc.) |
| `GroupScope` | `type` | `src/entities/directory.ts` | Group scopes (`Domain Local`, `Global`, `Universal`, etc.) |
| `LicenseType` | `enum` | `src/entities/license.ts` | `SUBSCRIPTION`, `PERPETUAL`, `OPEN_SOURCE`, `VOLUME`, `OEM` |
| `LicenseStatus` | `enum` | `src/entities/license.ts` | `ACTIVE`, `EXPIRED`, `EXPIRING_SOON`, `REVOKED` |
| `IPStatus` | `enum` | `src/entities/network.ts` | `AVAILABLE`, `RESERVED`, `ASSIGNED` |
| `VlanStatus` | `enum` | `src/entities/network.ts` | `ACTIVE`, `RESERVED`, `DEPRECATED` |
| `RackStatus` | `enum` | `src/entities/network.ts` | `ACTIVE`, `PLANNED`, `MAINTENANCE`, `RETIRED` |
| `SwitchRole` | `enum` | `src/entities/network.ts` | `CORE`, `DISTRIBUTION`, `ACCESS`, `TOR` |
| `SwitchStatus` | `enum` | `src/entities/network.ts` | `ONLINE`, `OFFLINE`, `MAINTENANCE` |
| `PortFormFactor` | `enum` | `src/entities/network.ts` | `RJ45_1G`, `SFP_1G`, `SFP_PLUS_10G`, `SFP28_25G`, `QSFP_PLUS_40G`, `QSFP28_100G` |
| `PortAdminStatus` | `enum` | `src/entities/network.ts` | `UP`, `DOWN` |
| `PortOperStatus` | `enum` | `src/entities/network.ts` | `ACTIVE`, `DOWN`, `CONNECTED_NO_SIGNAL`, `RESERVED` |
| `PortMode` | `enum` | `src/entities/network.ts` | `ACCESS`, `TRUNK`, `LACP` |
| `PortSpeed` | `enum` | `src/entities/network.ts` | Port speed labels (`100 Mbps`, `1 Gbps`, `2.5 Gbps`, `10 Gbps`, etc.) |
| `SPEED_1G`, `SPEED_2_5G`, `SPEED_10G` | `const` | `src/entities/network.ts` | Port speed constants |
| `STANDARD_SWITCH_PORT_COUNTS` | `const array` | `src/entities/network.ts` | Supported port counts `[8, 16, 24, 48]` |
| `NotificationType` | `enum` | `src/entities/notification.ts` | `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `ALERT`, `SYSTEM` |
| `NotificationSocketEvents` | `enum` | `src/entities/notification.ts` | WebSocket event names (`notification:new`, `notification:count`, etc.) |
| `TimezoneRegion` | `type` | `src/entities/timezone.ts` | Continent/region grouping identifier |
| `DateFormatPattern` | `type` | `src/entities/timezone.ts` | Supported date format tokens (`YYYY-MM-DD`, etc.) |
| `TimeFormatPattern` | `type` | `src/entities/timezone.ts` | Supported time format modes (`24h`, `12h`) |
| `UserStatus` | `enum` | `src/entities/user.ts` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `PermissionAction` | `enum` | `src/enums/permissions.ts` | `CREATE`, `READ`, `UPDATE`, `DELETE`, `EXPORT`, `MANAGE` |
| `PermissionSubject` | `enum` | `src/enums/permissions.ts` | Subject entities (`Asset`, `License`, `User`, `all`, etc.) |
| `SYSTEM_ROLE_NAMES` | `const array` | `src/enums/permissions.ts` | Built-in system role names list |
| `SystemRoleName` | `type` | `src/enums/permissions.ts` | Union type of `SYSTEM_ROLE_NAMES` |

### Data Transfer Objects (DTOs)

| Export | Kind | Source Module | Description |
| :--- | :--- | :--- | :--- |
| `PaginationMeta` | `interface` | `src/dto/api-response.ts` | Pagination metadata header (`page`, `limit`, `total`, `totalPages`) |
| `ApiResponse<T>` | `interface` | `src/dto/api-response.ts` | Standard generic envelope for successful API responses |
| `ApiErrorResponse` | `interface` | `src/dto/api-response.ts` | Standard error payload format with error codes and field details |
| `LoginRequest` | `interface` | `src/dto/auth.ts` | Authentication credentials payload |
| `LoginResponse` | `interface` | `src/dto/auth.ts` | JWT tokens and authenticated user payload |
| `RefreshRequest` | `interface` | `src/dto/auth.ts` | Token refresh request payload |
| `TokenPayload` | `interface` | `src/dto/auth.ts` | Decoded JWT claims and permission payload |
| `CreateResponse<T>` | `interface` | `src/dto/common.ts` | Generic entity creation response |
| `UpdateResponse<T>` | `interface` | `src/dto/common.ts` | Generic entity update response |
| `DeleteResponse` | `interface` | `src/dto/common.ts` | Generic entity deletion confirmation |
| `PaginationQuery` | `interface` | `src/dto/pagination.ts` | Query parameters for paginated requests (`page`, `limit`, `sort`, `order`) |
| `CreateAssetDto` | `interface` | `src/dto/assets.dto.ts` | Payload for creating an asset |
| `UpdateAssetDto` | `interface` | `src/dto/assets.dto.ts` | Partial payload for updating an asset |
| `AssetQueryDto` | `interface` | `src/dto/assets.dto.ts` | Filter query parameters for asset list views |
| `AssetStatsDto` | `interface` | `src/dto/assets.dto.ts` | Aggregated asset status counts |
| `CreateLicenseDto` | `interface` | `src/dto/licenses.dto.ts` | Payload for creating a license record |
| `UpdateLicenseDto` | `interface` | `src/dto/licenses.dto.ts` | Partial payload for updating a license |
| `LicenseQueryDto` | `interface` | `src/dto/licenses.dto.ts` | Filter query parameters for license list views |
| `AssignUserLicenseDto` | `interface` | `src/dto/licenses.dto.ts` | Payload for assigning a license to a user |
| `BatchAssignUserLicenseDto` | `interface` | `src/dto/licenses.dto.ts` | Payload for assigning licenses to multiple users |
| `LicenseStatsDto` | `interface` | `src/dto/licenses.dto.ts` | Summary metrics for license seats and spend |
| `CreateDirectoryUserDto` | `interface` | `src/dto/directory.dto.ts` | Payload for creating an Active Directory user |
| `UpdateDirectoryUserDto` | `interface` | `src/dto/directory.dto.ts` | Partial payload for updating an Active Directory user |
| `DirectoryUserQueryDto` | `interface` | `src/dto/directory.dto.ts` | Query filters for directory user listing |
| `CreateDirectoryGroupDto` | `interface` | `src/dto/directory.dto.ts` | Payload for creating a directory group |
| `BatchImportDirectoryUserItem` | `interface` | `src/dto/directory.dto.ts` | Row schema for bulk directory user imports |
| `BatchImportADUserItem` | `type` | `src/dto/directory.dto.ts` | Alias for `BatchImportDirectoryUserItem` |
| `BatchImportDirectoryResponse` | `interface` | `src/dto/directory.dto.ts` | Summary report for bulk user import jobs |
| `BatchImportADResponse` | `type` | `src/dto/directory.dto.ts` | Alias for `BatchImportDirectoryResponse` |
| `DomainSyncResult` | `interface` | `src/dto/directory.dto.ts` | Active Directory synchronization status and metrics |
| `CreateAppUserDto` | `interface` | `src/dto/users.dto.ts` | Payload for creating a system application user |
| `UpdateAppUserDto` | `interface` | `src/dto/users.dto.ts` | Partial payload for updating an application user |
| `ToggleAppUserStatusDto` | `interface` | `src/dto/users.dto.ts` | Payload for updating application user status |
| `ResetAppUserPasswordDto` | `interface` | `src/dto/users.dto.ts` | Payload for resetting an application user password |
| `AppUserQueryDto` | `interface` | `src/dto/users.dto.ts` | Query parameters for application user filtering |
| `CreateVlanDto` | `interface` | `src/dto/network.dto.ts` | Payload for creating a VLAN |
| `UpdateVlanDto` | `interface` | `src/dto/network.dto.ts` | Partial payload for updating a VLAN |
| `VlanQueryDto` | `interface` | `src/dto/network.dto.ts` | Query filters for VLAN listing |
| `CreateSubnetDto` | `interface` | `src/dto/network.dto.ts` | Payload for creating a subnet allocation |
| `UpdateSubnetDto` | `interface` | `src/dto/network.dto.ts` | Partial payload for updating a subnet |
| `SubnetQueryDto` | `interface` | `src/dto/network.dto.ts` | Query filters for subnet listing |
| `CreateIPAddressDto` | `interface` | `src/dto/network.dto.ts` | Payload for registering or assigning an IP address |
| `UpdateIPAddressDto` | `interface` | `src/dto/network.dto.ts` | Partial payload for updating an IP address record |
| `IPAddressQueryDto` | `interface` | `src/dto/network.dto.ts` | Filter query parameters for IPAM listing |
| `CreateRackDto` | `interface` | `src/dto/network.dto.ts` | Payload for creating a server rack |
| `UpdateRackDto` | `interface` | `src/dto/network.dto.ts` | Partial payload for updating a server rack |
| `RackQueryDto` | `interface` | `src/dto/network.dto.ts` | Filter query parameters for server rack listing |
| `CreateSwitchDto` | `interface` | `src/dto/network.dto.ts` | Payload for creating a network switch |
| `UpdateSwitchDto` | `interface` | `src/dto/network.dto.ts` | Partial payload for updating a network switch |
| `SwitchQueryDto` | `interface` | `src/dto/network.dto.ts` | Filter query parameters for network switch listing |
| `CreateSwitchPortDto` | `interface` | `src/dto/network.dto.ts` | Payload for creating a switch port configuration |
| `UpdateSwitchPortDto` | `interface` | `src/dto/network.dto.ts` | Partial payload for updating a switch port configuration |
| `SwitchPortQueryDto` | `interface` | `src/dto/network.dto.ts` | Filter query parameters for switch ports |
| `CalculateSubnetQueryDto` | `interface` | `src/dto/network.dto.ts` | Query parameter for subnet boundary calculation |
| `AutoDetectQueryDto` | `interface` | `src/dto/network.dto.ts` | Query parameter for IP subnet auto-detection |
| `MacVendorQueryDto` | `interface` | `src/dto/network.dto.ts` | Query parameter for MAC OUI vendor resolution |
| `NetworkStatsDto` | `interface` | `src/dto/network.dto.ts` | Network subnet, IP capacity, and rack/switch metrics |
| `CreateInventoryCategoryDto` | `interface` | `src/dto/inventory.dto.ts` | Payload for creating an inventory category |
| `UpdateInventoryCategoryDto` | `interface` | `src/dto/inventory.dto.ts` | Partial payload for updating an inventory category |
| `CreateInventoryItemDto` | `interface` | `src/dto/inventory.dto.ts` | Payload for creating an inventory item |
| `UpdateInventoryItemDto` | `interface` | `src/dto/inventory.dto.ts` | Partial payload for updating an inventory item |
| `RestockInventoryDto` | `interface` | `src/dto/inventory.dto.ts` | Payload for restocking an inventory item |
| `InventoryQueryDto` | `interface` | `src/dto/inventory.dto.ts` | Query filters for inventory list endpoints |
| `InventoryStatsDto` | `interface` | `src/dto/inventory.dto.ts` | Valuation and stock level aggregate counts |
| `LogEventDto` | `interface` | `src/dto/audit.dto.ts` | Payload for logging audit trail events |
| `AuditQueryDto` | `interface` | `src/dto/audit.dto.ts` | Filter query parameters for audit log retrieval |
| `AuditStatsDto` | `interface` | `src/dto/audit.dto.ts` | Compliance metrics and security anomaly stats |
| `SearchQueryDto` | `interface` | `src/dto/search.dto.ts` | Global search query parameters |
| `SearchResultItem` | `interface` | `src/dto/search.dto.ts` | Universal search result item schema |
| `SearchResponseDto` | `interface` | `src/dto/search.dto.ts` | Formatted response for global search queries |
| `DashboardOverviewDto` | `interface` | `src/dto/dashboard.dto.ts` | High-level KPI, health, activity, and action items |
| `SystemHealthDto` | `interface` | `src/dto/health.dto.ts` | Runtime health metrics (uptime, memory, DB latency) |
| `CreateOrganizationDto` | `interface` | `src/dto/organization.dto.ts` | Payload for creating an organization |
| `UpdateOrganizationDto` | `interface` | `src/dto/organization.dto.ts` | Partial payload for updating an organization |
| `CreateDepartmentDto` | `interface` | `src/dto/organization.dto.ts` | Payload for creating a department |
| `UpdateDepartmentDto` | `interface` | `src/dto/organization.dto.ts` | Partial payload for updating a department |
| `CreatePositionDto` | `interface` | `src/dto/organization.dto.ts` | Payload for creating a job position |
| `UpdatePositionDto` | `interface` | `src/dto/organization.dto.ts` | Partial payload for updating a job position |
| `CreateLocationDto` | `interface` | `src/dto/organization.dto.ts` | Payload for creating a facility or location |
| `UpdateLocationDto` | `interface` | `src/dto/organization.dto.ts` | Partial payload for updating a location |
| `LocationQueryDto` | `interface` | `src/dto/organization.dto.ts` | Query filters for location listing |
| `CreateRoleRequest` | `interface` | `src/dto/roles.dto.ts` | Payload for creating a new RBAC role |
| `UpdateRoleRequest` | `interface` | `src/dto/roles.dto.ts` | Payload for modifying a role's permissions |
| `CloneRoleRequest` | `interface` | `src/dto/roles.dto.ts` | Payload for duplicating an existing role |
| `SyncRolePermissionsRequest` | `interface` | `src/dto/roles.dto.ts` | Payload for syncing assigned permission IDs |
| `RoleDetailResponse` | `interface` | `src/dto/roles.dto.ts` | Detailed role response including effective permissions |
| `RoleSummaryStats` | `interface` | `src/dto/roles.dto.ts` | Summary metrics for roles and user coverage |
| `NotificationCategory` | `type` | `src/dto/notification.dto.ts` | Notification category filter (`'alerts'`, `'tasks'`, `'general'`, `'all'`) |
| `NotificationQueryDto` | `interface` | `src/dto/notification.dto.ts` | Filter query parameters for notifications |
| `CreateNotificationDto` | `interface` | `src/dto/notification.dto.ts` | Payload for creating a notification record |
| `MarkNotificationReadDto` | `interface` | `src/dto/notification.dto.ts` | Payload for updating notification read state |
| `NotificationListResponseDto` | `interface` | `src/dto/notification.dto.ts` | Notification list with unread counter |
| `BulkNotificationActionDto` | `interface` | `src/dto/notification.dto.ts` | Payload for batch actions on notification IDs |

## Testing

As a type contract library, `@uims/shared-types` enforces contract integrity through static type checking and build declaration validation:

1. **Type Checking**:
   ```bash
   pnpm run typecheck
   ```
   Executes `tsc --noEmit` to verify type completeness and prevent contract regressions.

2. **Declaration & Bundle Verification**:
   ```bash
   pnpm run build
   ```
   Uses `tsdown` to compile the package entry point (`src/index.ts`) into ESM (`dist/index.mjs`) and bundle complete TypeScript declaration files (`dist/index.d.mts`).

3. **Monorepo Integration**:
   Consuming applications (`@uims/api` and `@uims/web`) continuously validate compatibility with these types via monorepo build and test suites:
   ```bash
   # From monorepo root
   pnpm run typecheck
   pnpm run test
   ```

## Development Scripts

The following scripts are configured in `package.json`:

- `pnpm run build` — Bundles the package using `tsdown` to ESM with generated type declarations (`.d.mts`).
- `pnpm run dev` — Runs `tsdown` in watch mode for active type development.
- `pnpm run typecheck` — Runs `tsc --noEmit` to verify type integrity.
- `pnpm run clean` — Removes build artifacts directory (`dist`).

## Contributing

This package is part of the private UIMS monorepo. Changes to shared contracts must maintain backward compatibility with dependent applications (`@uims/api` and `@uims/web`).

When updating types:
1. Make necessary changes under `src/`.
2. Ensure export indices in `src/index.ts` and module index files are updated when new modules are added.
3. Run `pnpm run typecheck` and `pnpm run build`.
4. Verify dependent monorepo packages compile cleanly via `pnpm typecheck` from the repository root.

## License

UNLICENSED — Private and proprietary. Part of the UIMS enterprise platform.

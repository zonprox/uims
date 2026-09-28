<!-- generated-by: gsd-doc-writer -->
# @uims/shared-utils

> Shared utility functions, date/time formatters, timezone helpers, enum mappers, and IPAM network calculations for the UIMS platform.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/shared-utils` provides reusable utilities and standard helpers across both frontend applications (`apps/web`) and backend services (`apps/api`) in the UIMS monorepo. It centralizes:

- **Network & IPAM Math**: Subnet calculation, IPv4/CIDR validation, bitwise conversion, longest prefix matching (LPM), next available IP discovery, MAC normalization, and hardware vendor OUI lookups.
- **Date & Time Formatting**: Standard and enterprise-grade date-time formatting powered by `dayjs` with UTC offsets and 12h/24h toggles.
- **Timezone Management**: IANA timezone validation, dynamic UTC offset calculation, abbreviation resolution, client timezone detection, and curated popular timezone catalogs.
- **Enum Normalization & UI Labels**: Bi-directional normalization between raw string values and strict `@uims/shared-types` enums, alongside user-friendly display labels.
- **Brand & System Metadata**: Single source of truth for platform versioning, system metadata, standard links, and unified enterprise copyright.

## Usage

This package is private to the UIMS monorepo. Consume it via workspace dependencies in any monorepo package `package.json`:

```json
{
  "dependencies": {
    "@uims/shared-utils": "workspace:*"
  }
}
```

Import utilities directly from `@uims/shared-utils`:

### 1. Network & IPAM Calculations

Comprehensive IPv4 subnet calculation, address validation, bitwise conversions, and MAC vendor resolution:

```typescript
import {
  calculateSubnet,
  calculateUtilization,
  findMatchingSubnet,
  findNextAvailableIp,
  intToIp,
  ipToInt,
  isIpInSubnet,
  isValidCidr,
  isValidIp,
  lookupMacVendor,
  maskToPrefix,
  normalizeMac,
  prefixToMask,
} from '@uims/shared-utils';

// IPv4 and CIDR validation
isValidIp('192.168.1.1'); // true
isValidIp('256.0.0.1'); // false
isValidCidr('10.232.130.0/24'); // true

// Integer and IP address bitwise conversion
ipToInt('192.168.1.1'); // 3232235777
intToIp(3232235777); // '192.168.1.1'

// Prefix and netmask conversions
prefixToMask(24); // '255.255.255.0'
maskToPrefix('255.255.255.0'); // 24

// Subnet specifications calculation
const subnet = calculateSubnet('10.232.130.0/24');
// {
//   networkAddress: '10.232.130.0',
//   broadcastAddress: '10.232.130.255',
//   subnetMask: '255.255.255.0',
//   prefix: 24,
//   totalHosts: 256,
//   usableHosts: 254,
//   usableStart: '10.232.130.1',
//   usableEnd: '10.232.130.254',
//   suggestedGateway: '10.232.130.254'
// }

// Subnet membership test
isIpInSubnet('10.232.130.45', '10.232.130.0/24'); // true

// Longest Prefix Match (LPM) lookup
const subnets = [
  { id: 'sub-1', cidr: '10.0.0.0/8' },
  { id: 'sub-2', cidr: '10.232.0.0/16' },
  { id: 'sub-3', cidr: '10.232.130.0/24' },
];
const match = findMatchingSubnet('10.232.130.15', subnets);
// match.id === 'sub-3'

// Allocate next available IP in subnet
const nextIp = findNextAvailableIp('10.232.130.0/24', [
  '10.232.130.1',
  '10.232.130.2',
]); // '10.232.130.3'

// MAC normalization and vendor OUI lookup
normalizeMac('00-14-22-01-23-45'); // '00:14:22:01:23:45'
lookupMacVendor('00:14:22:01:23:45'); // 'Dell'
lookupMacVendor('00:00:0C:4A:2B:11'); // 'Cisco'

// Subnet utilization calculation
calculateUtilization(254, 127); // 50.0
```

### 2. Date & Time Formatting

Date and time formatting helpers built on top of `dayjs`:

```typescript
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  fromNow,
} from '@uims/shared-utils';

// Standard date formatting
formatDate('2026-08-20'); // '2026-08-20'
formatDate(new Date(), { format: 'DD/MM/YYYY', timezone: 'Asia/Ho_Chi_Minh' });

// Date-time formatting
formatDateTime('2026-08-20T10:30:00Z'); // '2026-08-20 10:30:00'
formatDateTime('2026-08-20T10:30:00Z', 'YYYY-MM-DD HH:mm', 'Asia/Tokyo');

// Time-only formatting (12h vs 24h)
formatTime(new Date(), { use24Hour: false, includeSeconds: false }); // '02:30 PM'
formatTime(new Date(), { use24Hour: true, includeSeconds: true }); // '14:30:00'

// Relative time
fromNow('2026-08-19T10:00:00Z'); // 'a day ago'

// Currency formatting (Intl.NumberFormat)
formatCurrency(1250000, 'USD'); // '$1,250,000.00'
```

### 3. Timezone Management & Helpers

Helpers for client timezone detection, IANA validation, dynamic UTC offset computation, and timezone dropdown lists:

```typescript
import {
  formatEnterpriseDateTime,
  formatInTimezone,
  getBrowserTimezone,
  getTimezoneAbbr,
  getTimezoneOffset,
  getTimezoneOffsetMinutes,
  getTimezoneOptions,
  isValidTimezone,
  POPULAR_TIMEZONES,
} from '@uims/shared-utils';

// Validate IANA timezone identifiers
isValidTimezone('Asia/Tokyo'); // true
isValidTimezone('Invalid/Zone'); // false

// Detect browser timezone (with UTC fallback)
const userTz = getBrowserTimezone();

// Dynamic offset strings and integer minutes
getTimezoneOffset('America/New_York'); // '-04:00' (during Daylight Saving)
getTimezoneOffsetMinutes('Asia/Ho_Chi_Minh'); // 420

// Timezone abbreviation
getTimezoneAbbr('Asia/Ho_Chi_Minh'); // 'ICT'

// Generate dropdown options populated with dynamic offsets
const tzOptions = getTimezoneOptions();

// Enterprise date-time with offset and timezone badge
formatEnterpriseDateTime('2026-08-20T05:30:00.000Z', {
  timezone: 'Asia/Ho_Chi_Minh',
  format: 'YYYY-MM-DD',
  timeFormat: '24h',
  showOffset: true,
  showTimezone: true,
});
// Output: '2026-08-20 12:30:00 (ICT / UTC+07:00)'
```

### 4. Enum Normalization & Display Labels

Normalizes string values to `@uims/shared-types` enums and converts enums to UI-ready display labels:

```typescript
import {
  mapAssetStatus,
  mapAssetStatusToLabel,
  mapDirectoryAccountStatus,
  mapDirectoryAccountStatusToLabel,
  mapIPStatus,
  mapIPStatusToLabel,
  mapLicenseStatus,
  mapLicenseStatusToLabel,
  mapLicenseType,
  mapLicenseTypeToLabel,
} from '@uims/shared-utils';
import {
  AccountStatus,
  AssetStatus,
  IPStatus,
  LicenseStatus,
  LicenseType,
} from '@uims/shared-types';

// Asset status normalization and display labels
mapAssetStatus('Active'); // AssetStatus.IN_USE
mapAssetStatus('In Repair'); // AssetStatus.MAINTENANCE
mapAssetStatusToLabel(AssetStatus.IN_USE); // 'Active'
mapAssetStatusToLabel(AssetStatus.MAINTENANCE); // 'In Repair'

// License type normalization and display labels
mapLicenseType('OPENSOURCE'); // LicenseType.OPEN_SOURCE
mapLicenseTypeToLabel(LicenseType.SUBSCRIPTION); // 'Subscription'

// License status normalization and display labels
mapLicenseStatus('EXPIRING_SOON'); // LicenseStatus.EXPIRING_SOON
mapLicenseStatusToLabel(LicenseStatus.ACTIVE); // 'Active'

// Directory account status normalization and display labels
mapDirectoryAccountStatus('SUSPENDED'); // AccountStatus.SUSPENDED
mapDirectoryAccountStatusToLabel(AccountStatus.DISABLED); // 'Inactive'

// IP status normalization and display labels
mapIPStatus('ASSIGNED'); // IPStatus.ASSIGNED
mapIPStatusToLabel(IPStatus.RESERVED); // 'Reserved'
```

### 5. System Brand Metadata

Single source of truth for platform branding, versioning, and compliance metadata:

```typescript
import { SYSTEM_INFO } from '@uims/shared-utils';

console.log(SYSTEM_INFO.name); // 'UIMS Enterprise'
console.log(SYSTEM_INFO.version); // '2.4.0'
console.log(SYSTEM_INFO.releaseChannel); // 'Enterprise LTS (2026)'
console.log(SYSTEM_INFO.securityStandard); // 'FIPS 140-3 & SOC 2 Compliant'
console.log(SYSTEM_INFO.links.apiDocs); // '/api/v1/docs'
```

## API Summary

| Category | Export | Type | Description |
| :--- | :--- | :--- | :--- |
| **Brand** | `SYSTEM_INFO` | `const object` | System name, version, build date, copyright, standard links, and compliance info |
| | `SystemInfo` | `type` | Type definition for `SYSTEM_INFO` |
| **Network & IPAM** | `isValidIp(ip)` | `Function` | Validates IPv4 dotted-decimal address format and octet ranges |
| | `isValidCidr(cidr)` | `Function` | Validates IPv4 CIDR string and prefix length (0-32) |
| | `ipToInt(ip)` | `Function` | Converts IPv4 address to unsigned 32-bit integer |
| | `intToIp(int)` | `Function` | Converts unsigned 32-bit integer to IPv4 dotted-decimal string |
| | `prefixToMask(prefix)` | `Function` | Converts CIDR prefix length (0-32) to IPv4 dotted-decimal subnet mask |
| | `maskToPrefix(mask)` | `Function` | Converts IPv4 subnet mask to CIDR prefix length |
| | `calculateSubnet(cidr)` | `Function` | Calculates network address, broadcast, mask, usable range, gateway, and host counts |
| | `isIpInSubnet(ip, cidr)` | `Function` | Checks whether an IP address falls within a CIDR subnet block via bitwise masking |
| | `findMatchingSubnet(ip, subnets)` | `Function` | Identifies the most specific subnet for an IP using Longest Prefix Match (LPM) |
| | `findNextAvailableIp(subnetCidr, allocatedIps)` | `Function` | Resolves lowest unallocated usable IPv4 address in a subnet |
| | `normalizeMac(mac)` | `Function` | Normalizes MAC address string to standard colon-separated format (`XX:XX:XX:XX:XX:XX`) |
| | `lookupMacVendor(mac)` | `Function` | Resolves hardware manufacturer from MAC address OUI prefix table |
| | `calculateUtilization(totalUsable, allocatedCount)` | `Function` | Calculates subnet allocation percentage rounded to 1 decimal place |
| **Date & Formatting** | `formatDate(date, formatOrOptions?, tz?)` | `Function` | Formats date with pattern and timezone options |
| | `formatDateTime(date, optionsOrFormat?, tz?)` | `Function` | Formats date-time with options or pattern |
| | `formatTime(date, options?)` | `Function` | Formats time-only string (12h/24h, optional seconds) |
| | `fromNow(date)` | `Function` | Returns localized relative time string (e.g., 'a day ago') |
| | `formatCurrency(amount, currency?)` | `Function` | Formats numeric value as currency string using `Intl.NumberFormat` |
| **Timezone** | `dayjs` | `Dayjs instance` | Pre-configured Day.js instance with extended plugins (utc, timezone, relativeTime, duration) |
| | `POPULAR_TIMEZONES` | `const array` | Catalog of curated enterprise IANA timezone definitions |
| | `isValidTimezone(tz)` | `Function` | Validates IANA timezone string against runtime `Intl.DateTimeFormat` |
| | `getBrowserTimezone()` | `Function` | Resolves client browser timezone or defaults to UTC |
| | `getTimezoneOffset(tz, refDate?)` | `Function` | Calculates formatted UTC offset string (e.g., `+07:00`) |
| | `getTimezoneOffsetMinutes(tz, refDate?)` | `Function` | Calculates UTC offset in integer minutes |
| | `getTimezoneAbbr(tz, refDate?)` | `Function` | Resolves timezone abbreviation (e.g., `ICT`, `EST`, `UTC`) |
| | `getTimezoneOptions(refDate?)` | `Function` | Returns complete timezone options array with dynamic offsets and DST awareness |
| | `formatInTimezone(date, tz?, formatStr?)` | `Function` | Formats date in a specified timezone |
| | `formatEnterpriseDateTime(date, options?)` | `Function` | Advanced date-time formatter supporting offsets, abbreviations, and 12h/24h toggle |
| | `FormatDateTimeOptions` | `interface` | Options interface for `formatEnterpriseDateTime` |
| | `RawTimezoneDefinition` | `interface` | Definition interface for entries in `POPULAR_TIMEZONES` |
| **Enum Mappers** | `mapAssetStatus(status?)` | `Function` | Normalizes input string to `AssetStatus` enum |
| | `mapAssetStatusToLabel(status?)` | `Function` | Maps `AssetStatus` enum to human-friendly UI label |
| | `mapLicenseType(type?)` | `Function` | Normalizes input string to `LicenseType` enum |
| | `mapLicenseTypeToLabel(type?)` | `Function` | Maps `LicenseType` enum to human-friendly UI label |
| | `mapLicenseStatus(status?)` | `Function` | Normalizes input string to `LicenseStatus` enum |
| | `mapLicenseStatusToLabel(status?)` | `Function` | Maps `LicenseStatus` enum to human-friendly UI label |
| | `mapDirectoryAccountStatus(status?)` | `Function` | Normalizes input string to `AccountStatus` enum |
| | `mapDirectoryAccountStatusToLabel(status?)` | `Function` | Maps `AccountStatus` enum to human-friendly UI label |
| | `mapIPStatus(status?)` | `Function` | Normalizes input string to `IPStatus` enum |
| | `mapIPStatusToLabel(status?)` | `Function` | Maps `IPStatus` enum to human-friendly UI label |

## Testing

The test suite runs with [Vitest](https://vitest.dev/) and covers all calculation edge cases, boundary conditions, and timezone conversions:

```bash
# Run test suite within the shared-utils workspace
pnpm --filter @uims/shared-utils test

# Run tests in watch mode
pnpm --filter @uims/shared-utils test --watch
```

### Test Suites Coverage

- `src/network.test.ts` (30 tests): IPv4/CIDR validation, integer/IP conversions, subnet calculations, LPM matching, next IP allocation, MAC formatting, vendor lookup, and utilization calculation.
- `src/network.stress.test.ts` (50 tests): High-volume IP exhaustion tests, large subnet allocations, RFC 3021 /31 point-to-point links, /32 host routes, and boundary conditions.
- `src/timezone.test.ts` (8 tests): IANA timezone validation, UTC offset calculation, browser detection fallback, and dynamic DST handling.
- `src/enum.test.ts` (4 tests): Normalization and UI label mappings for assets, licenses, directory accounts, and IP statuses.
- `src/format.test.ts` (2 tests): Date, time, relative time, and currency formatting.

Total: **94 passing tests** across 5 test suites.

## Development Scripts

The following scripts are configured in `package.json`:

- `pnpm run build` — Bundles package using `tsdown` to ESM with generated type declarations (`.d.mts`).
- `pnpm run dev` — Runs `tsdown` in watch mode for local development.
- `pnpm run typecheck` — Runs `tsc --noEmit` to verify TypeScript strict type safety.
- `pnpm run test` — Executes test suite with `vitest`.
- `pnpm run clean` — Removes build artifacts (`dist`).

## License

UNLICENSED (Internal / Private package for the UIMS platform)

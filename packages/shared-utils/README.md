<!-- generated-by: gsd-doc-writer -->
# @uims/shared-utils

> Shared utility functions, formatters, enum mappers, and timezone helpers for the UIMS platform.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/shared-utils` provides reusable utilities and standard helpers across both frontend applications and backend services in the UIMS monorepo. It centralizes formatting logic (dates, currencies, bytes, durations), timezone management and conversions, enum normalization and UI label mapping, input validation helpers, string manipulation routines, and enterprise branding metadata.

## Installation

In a workspace package `package.json`:

```json
{
  "dependencies": {
    "@uims/shared-utils": "workspace:*"
  }
}
```

Or add the package dependency via pnpm:

```bash
pnpm --filter <target-app-or-package> add @uims/shared-utils@workspace:*
```

## Quick Start

Import utilities directly from `@uims/shared-utils`:

```typescript
import {
  formatDate,
  formatCurrency,
  isValidEmail,
  SYSTEM_INFO,
} from '@uims/shared-utils';

// Format dates with timezone support
console.log(formatDate(new Date(), { format: 'YYYY-MM-DD', timezone: 'Asia/Ho_Chi_Minh' }));

// Format currency amounts
console.log(formatCurrency(1250000, 'USD')); // '$1,250,000.00'

// Validate email address
console.log(isValidEmail('admin@uims.internal')); // true

// Access system metadata
console.log(SYSTEM_INFO.name); // 'UIMS Enterprise'
```

## Usage Examples

### 1. Date, Time & Timezone Formatting

Enterprise-grade date and time formatting powered by `dayjs` with full IANA timezone support, UTC offsets, and localization:

```typescript
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatEnterpriseDateTime,
  fromNow,
  formatInTimezone,
} from '@uims/shared-utils';

// Standard date formatting
formatDate('2026-08-20'); // '2026-08-20'
formatDate(new Date(), { format: 'DD/MM/YYYY', timezone: 'Asia/Ho_Chi_Minh' });

// Enterprise date-time with timezone offsets
formatEnterpriseDateTime('2026-08-20T05:30:00.000Z', {
  timezone: 'Asia/Ho_Chi_Minh',
  format: 'YYYY-MM-DD',
  timeFormat: '24h',
  showOffset: true,
});
// Output: '2026-08-20 12:30:00 (UTC+07:00)'

// Time formatting (12h vs 24h)
formatTime(new Date(), { use24Hour: false, includeSeconds: false }); // '02:30 PM'

// Relative time
fromNow('2026-08-19T10:00:00Z'); // 'a day ago'
```

### 2. Timezone Catalog & Helpers

Helpers for detecting client timezones, validating IANA identifiers, calculating dynamic UTC offsets (accounting for DST), and populating UI select dropdowns:

```typescript
import {
  getBrowserTimezone,
  isValidTimezone,
  getTimezoneOffset,
  getTimezoneOffsetMinutes,
  getTimezoneAbbr,
  getTimezoneOptions,
  POPULAR_TIMEZONES,
} from '@uims/shared-utils';

// Validate IANA timezone
isValidTimezone('Asia/Tokyo'); // true
isValidTimezone('Invalid/Zone'); // false

// Detect client timezone (falls back to 'UTC')
const userTz = getBrowserTimezone();

// Calculate offset string and minutes
getTimezoneOffset('America/New_York'); // '-04:00' (EDT during daylight saving)
getTimezoneOffsetMinutes('Asia/Ho_Chi_Minh'); // 420

// Timezone abbreviation
getTimezoneAbbr('Asia/Ho_Chi_Minh'); // 'ICT'

// Get formatted options for dropdowns
const tzOptions = getTimezoneOptions();
```

### 3. Enum Normalization & UI Labeling

Normalizes loose string representations or legacy values into strict TypeScript enums (from `@uims/shared-types`) and maps enum values to human-friendly display labels:

```typescript
import {
  mapAssetStatus,
  mapAssetStatusToLabel,
  mapLicenseType,
  mapLicenseTypeToLabel,
  mapLicenseStatus,
  mapLicenseStatusToLabel,
  mapDirectoryAccountStatus,
  mapDirectoryAccountStatusToLabel,
  mapIPStatus,
  mapIPStatusToLabel,
} from '@uims/shared-utils';
import { AssetStatus, LicenseStatus, LicenseType } from '@uims/shared-types';

// Asset status normalization & label mapping
mapAssetStatus('Active'); // AssetStatus.IN_USE
mapAssetStatus('In Repair'); // AssetStatus.MAINTENANCE
mapAssetStatusToLabel(AssetStatus.IN_USE); // 'Active'
mapAssetStatusToLabel(AssetStatus.MAINTENANCE); // 'In Repair'

// License type normalization & label mapping
mapLicenseType('OPENSOURCE'); // LicenseType.OPEN_SOURCE
mapLicenseTypeToLabel(LicenseType.SUBSCRIPTION); // 'Subscription'

// License status normalization & label mapping
mapLicenseStatus('EXPIRING_SOON'); // LicenseStatus.EXPIRING_SOON
mapLicenseStatusToLabel(LicenseStatus.ACTIVE); // 'Active'
```

### 4. Data Formatting (Currency, Bytes, Duration)

```typescript
import { formatBytes, formatCurrency, formatDuration } from '@uims/shared-utils';

// Currency formatting (Intl.NumberFormat)
formatCurrency(1250000, 'USD'); // '$1,250,000.00'

// File size formatting (base 1024)
formatBytes(1048576); // '1 MB'
formatBytes(5368709120, 1); // '5 GB'

// Duration formatting
formatDuration(90061000); // '1d 1h 1m 1s'
```

### 5. String Helpers

```typescript
import { slugify, truncate, capitalize, generateCode } from '@uims/shared-utils';

slugify('Enterprise Asset Tracker v2'); // 'enterprise-asset-tracker-v2'
truncate('Long description text exceeding limit', 15); // 'Long descriptio...'
capitalize('hardware'); // 'Hardware'
generateCode('AST', 6); // 'AST-A8F2K9'
```

### 6. Validation Helpers

Fast regex-based validation for identifiers, email addresses, and network primitives:

```typescript
import {
  isValidEmail,
  isValidIP,
  isValidCIDR,
  isValidMAC,
  isValidUUID,
} from '@uims/shared-utils';

isValidEmail('admin@uims.internal'); // true
isValidIP('192.168.1.1'); // true
isValidCIDR('10.0.0.0/24'); // true
isValidMAC('00:1A:2B:3C:4D:5E'); // true
isValidUUID('123e4567-e89b-12d3-a456-426614174000'); // true
```

### 7. Brand & System Metadata

Single source of truth for platform metadata and standard brand attributes:

```typescript
import { SYSTEM_INFO } from '@uims/shared-utils';

console.log(SYSTEM_INFO.name); // 'UIMS Enterprise'
console.log(SYSTEM_INFO.version); // '2.4.0'
console.log(SYSTEM_INFO.releaseChannel); // 'Enterprise LTS (2026)'
console.log(SYSTEM_INFO.securityStandard); // 'FIPS 140-3 & SOC 2 Compliant'
```

## API Summary

| Category | Export | Type | Description |
| :--- | :--- | :--- | :--- |
| **Brand** | `SYSTEM_INFO` | `const object` | System name, version, copyright, and standard navigation links |
| | `SystemInfo` | `type` | Type definition for `SYSTEM_INFO` |
| **Enum** | `mapAssetStatus(status?)` | `Function` | Maps and normalizes raw strings to `AssetStatus` enum |
| | `mapAssetStatusToLabel(status?)` | `Function` | Maps `AssetStatus` enum to human-readable UI label |
| | `mapLicenseType(type?)` | `Function` | Maps and normalizes raw strings to `LicenseType` enum |
| | `mapLicenseTypeToLabel(type?)` | `Function` | Maps `LicenseType` enum to human-readable UI label |
| | `mapLicenseStatus(status?)` | `Function` | Maps and normalizes raw strings to `LicenseStatus` enum |
| | `mapLicenseStatusToLabel(status?)` | `Function` | Maps `LicenseStatus` enum to human-readable UI label |
| | `mapDirectoryAccountStatus(status?)` | `Function` | Maps raw strings to `AccountStatus` enum |
| | `mapDirectoryAccountStatusToLabel(status?)` | `Function` | Maps `AccountStatus` enum to human-readable UI label |
| | `mapIPStatus(status?)` | `Function` | Maps raw strings to `IPStatus` enum |
| | `mapIPStatusToLabel(status?)` | `Function` | Maps `IPStatus` enum to human-readable UI label |
| **Format** | `formatDate(date, options?, tz?)` | `Function` | Formats date with pattern and timezone options |
| | `formatDateTime(date, options?, tz?)` | `Function` | Formats date-time with options or pattern |
| | `formatTime(date, options?)` | `Function` | Formats time-only string (12h/24h) |
| | `fromNow(date)` | `Function` | Returns localized relative time string |
| | `formatCurrency(amount, currency?)` | `Function` | Formats numeric value as currency string (`Intl.NumberFormat`) |
| | `formatBytes(bytes, decimals?)` | `Function` | Converts byte count to human-readable file size (KB, MB, GB, etc.) |
| | `formatDuration(ms)` | `Function` | Formats millisecond duration to days/hours/minutes/seconds string |
| **Timezone** | `dayjs` | `Dayjs instance` | Pre-configured Day.js instance with extended plugins |
| | `POPULAR_TIMEZONES` | `const array` | Catalog of curated enterprise IANA timezone definitions |
| | `isValidTimezone(tz)` | `Function` | Validates IANA timezone string against runtime `Intl` API |
| | `getBrowserTimezone()` | `Function` | Resolves client browser timezone or defaults to UTC |
| | `getTimezoneOffset(tz, refDate?)` | `Function` | Calculates formatted UTC offset string (e.g., `+07:00`) |
| | `getTimezoneOffsetMinutes(tz, refDate?)` | `Function` | Calculates UTC offset in minutes |
| | `getTimezoneAbbr(tz, refDate?)` | `Function` | Resolves timezone abbreviation (e.g., `ICT`, `EST`, `UTC`) |
| | `getTimezoneOptions(refDate?)` | `Function` | Returns full timezone options array with dynamic offsets |
| | `formatInTimezone(date, tz?, formatStr?)` | `Function` | Formats date string in a specified timezone |
| | `formatEnterpriseDateTime(date, options?)` | `Function` | Enterprise date-time formatter with offsets & 12h/24h toggle |
| | `FormatDateTimeOptions` | `interface` | Options interface for `formatEnterpriseDateTime` |
| | `RawTimezoneDefinition` | `interface` | Definition interface for items in `POPULAR_TIMEZONES` |
| **String** | `slugify(text)` | `Function` | Generates URL-friendly slug from string |
| | `truncate(text, length?, suffix?)` | `Function` | Truncates string to maximum length with suffix |
| | `capitalize(text)` | `Function` | Capitalizes first letter of string |
| | `generateCode(prefix?, length?)` | `Function` | Generates random alphanumeric asset/record code |
| **Validation** | `isValidEmail(email)` | `Function` | Validates email address format |
| | `isValidIP(ip)` | `Function` | Validates IPv4 and IPv6 addresses |
| | `isValidCIDR(cidr)` | `Function` | Validates CIDR subnet notation |
| | `isValidMAC(mac)` | `Function` | Validates MAC address format |
| | `isValidUUID(uuid)` | `Function` | Validates UUID v1-v5 format |

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

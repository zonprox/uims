import {
  AccountStatus,
  AssetStatus,
  IPStatus,
  LicenseStatus,
  LicenseType,
  TicketPriority,
  TicketStatus,
} from '@uims/shared-types';

/**
 * Normalizes input string to AssetStatus enum
 */
export function mapAssetStatus(status?: string | null): AssetStatus {
  if (!status) return AssetStatus.AVAILABLE;
  const normalized = status.toUpperCase().trim();
  if (normalized === 'ACTIVE' || normalized === 'IN_USE') return AssetStatus.IN_USE;
  if (normalized === 'IN REPAIR' || normalized === 'MAINTENANCE') return AssetStatus.MAINTENANCE;
  if (normalized === 'IN STORAGE' || normalized === 'AVAILABLE') return AssetStatus.AVAILABLE;
  if (normalized === 'RETIRED') return AssetStatus.RETIRED;
  if (normalized === 'LOST' || normalized === 'DISPOSED') return AssetStatus.LOST;
  return AssetStatus.AVAILABLE;
}

/**
 * Maps AssetStatus enum to human-friendly UI label
 */
export function mapAssetStatusToLabel(status?: AssetStatus | string | null): string {
  if (!status) return 'In Storage';
  const s = typeof status === 'string' ? status.toUpperCase() : status;
  switch (s) {
    case AssetStatus.IN_USE:
    case 'IN_USE':
      return 'Active';
    case AssetStatus.MAINTENANCE:
    case 'MAINTENANCE':
      return 'In Repair';
    case AssetStatus.RETIRED:
    case 'RETIRED':
      return 'Retired';
    case AssetStatus.LOST:
    case 'LOST':
      return 'Lost';
    default:
      return 'In Storage';
  }
}

/**
 * Normalizes input string to TicketPriority enum
 */
export function mapTicketPriority(priority?: string | null): TicketPriority {
  if (!priority) return TicketPriority.MEDIUM;
  const normalized = priority.toUpperCase().trim();
  if (normalized === 'URGENT' || normalized === 'CRITICAL') return TicketPriority.URGENT;
  if (normalized === 'HIGH') return TicketPriority.HIGH;
  if (normalized === 'LOW') return TicketPriority.LOW;
  return TicketPriority.MEDIUM;
}

/**
 * Maps TicketPriority enum to human-friendly UI label
 */
export function mapTicketPriorityToLabel(priority?: TicketPriority | string | null): string {
  if (!priority) return 'Medium';
  const p = typeof priority === 'string' ? priority.toUpperCase() : priority;
  switch (p) {
    case TicketPriority.URGENT:
    case 'URGENT':
      return 'Urgent';
    case TicketPriority.HIGH:
    case 'HIGH':
      return 'High';
    case TicketPriority.LOW:
    case 'LOW':
      return 'Low';
    default:
      return 'Medium';
  }
}

/**
 * Normalizes input string to TicketStatus enum
 */
export function mapTicketStatus(status?: string | null): TicketStatus {
  if (!status) return TicketStatus.OPEN;
  const normalized = status.toUpperCase().trim().replace(/\s+/g, '_');
  if (normalized === 'IN_PROGRESS' || normalized === 'INPROGRESS') return TicketStatus.IN_PROGRESS;
  if (normalized === 'RESOLVED') return TicketStatus.RESOLVED;
  if (normalized === 'CLOSED') return TicketStatus.CLOSED;
  return TicketStatus.OPEN;
}

/**
 * Maps TicketStatus enum to human-friendly UI label
 */
export function mapTicketStatusToLabel(status?: TicketStatus | string | null): string {
  if (!status) return 'Open';
  const s = typeof status === 'string' ? status.toUpperCase() : status;
  switch (s) {
    case TicketStatus.IN_PROGRESS:
    case 'IN_PROGRESS':
      return 'In Progress';
    case TicketStatus.RESOLVED:
    case 'RESOLVED':
      return 'Resolved';
    case TicketStatus.CLOSED:
    case 'CLOSED':
      return 'Closed';
    default:
      return 'Open';
  }
}

/**
 * Normalizes input string to LicenseType enum
 */
export function mapLicenseType(type?: string | null): LicenseType {
  if (!type) return LicenseType.SUBSCRIPTION;
  const normalized = type.toUpperCase().trim().replace(/\s+/g, '_');
  if (normalized === 'PERPETUAL') return LicenseType.PERPETUAL;
  if (normalized === 'VOLUME') return LicenseType.VOLUME;
  if (normalized === 'OEM') return LicenseType.OEM;
  if (normalized === 'OPEN_SOURCE' || normalized === 'OPENSOURCE') return LicenseType.OPEN_SOURCE;
  return LicenseType.SUBSCRIPTION;
}

/**
 * Maps LicenseType enum to human-friendly UI label
 */
export function mapLicenseTypeToLabel(type?: LicenseType | string | null): string {
  if (!type) return 'Subscription';
  const t = typeof type === 'string' ? type.toUpperCase() : type;
  switch (t) {
    case LicenseType.PERPETUAL:
    case 'PERPETUAL':
      return 'Perpetual';
    case LicenseType.VOLUME:
    case 'VOLUME':
      return 'Volume';
    case LicenseType.OEM:
    case 'OEM':
      return 'OEM';
    case LicenseType.OPEN_SOURCE:
    case 'OPEN_SOURCE':
      return 'Open Source';
    default:
      return 'Subscription';
  }
}

/**
 * Normalizes input string to LicenseStatus enum
 */
export function mapLicenseStatus(status?: string | null): LicenseStatus {
  if (!status) return LicenseStatus.ACTIVE;
  const normalized = status.toUpperCase().trim().replace(/\s+/g, '_');
  if (normalized === 'EXPIRING' || normalized === 'EXPIRING_SOON')
    return LicenseStatus.EXPIRING_SOON;
  if (normalized === 'EXPIRED') return LicenseStatus.EXPIRED;
  if (normalized === 'REVOKED') return LicenseStatus.REVOKED;
  return LicenseStatus.ACTIVE;
}

/**
 * Maps LicenseStatus enum to human-friendly UI label
 */
export function mapLicenseStatusToLabel(status?: LicenseStatus | string | null): string {
  if (!status) return 'Active';
  const s = typeof status === 'string' ? status.toUpperCase() : status;
  switch (s) {
    case LicenseStatus.EXPIRING_SOON:
    case 'EXPIRING_SOON':
      return 'Expiring';
    case LicenseStatus.EXPIRED:
    case 'EXPIRED':
      return 'Expired';
    case LicenseStatus.REVOKED:
    case 'REVOKED':
      return 'Revoked';
    default:
      return 'Active';
  }
}

/**
 * Normalizes input string to AccountStatus enum
 */
export function mapDirectoryAccountStatus(status?: string | null): AccountStatus {
  if (!status) return AccountStatus.ACTIVE;
  const normalized = status.toUpperCase().trim();
  if (normalized === 'SUSPENDED') return AccountStatus.SUSPENDED;
  if (normalized === 'DISABLED' || normalized === 'INACTIVE') return AccountStatus.DISABLED;
  if (normalized === 'LOCKED') return AccountStatus.LOCKED;
  return AccountStatus.ACTIVE;
}

/**
 * Maps AccountStatus enum to human-friendly UI label
 */
export function mapDirectoryAccountStatusToLabel(status?: AccountStatus | string | null): string {
  if (!status) return 'Active';
  const s = typeof status === 'string' ? status.toUpperCase() : status;
  switch (s) {
    case AccountStatus.SUSPENDED:
    case 'SUSPENDED':
      return 'Suspended';
    case AccountStatus.DISABLED:
    case 'DISABLED':
      return 'Inactive';
    case AccountStatus.LOCKED:
    case 'LOCKED':
      return 'Locked';
    default:
      return 'Active';
  }
}

/**
 * Normalizes input string to IPStatus enum
 */
export function mapIPStatus(status?: string | null): IPStatus {
  if (!status) return IPStatus.AVAILABLE;
  const normalized = status.toUpperCase().trim();
  if (normalized === 'RESERVED') return IPStatus.RESERVED;
  if (normalized === 'ASSIGNED' || normalized === 'ALLOCATED') return IPStatus.ASSIGNED;
  return IPStatus.AVAILABLE;
}

/**
 * Maps IPStatus enum to human-friendly UI label
 */
export function mapIPStatusToLabel(status?: IPStatus | string | null): string {
  if (!status) return 'Available';
  const s = typeof status === 'string' ? status.toUpperCase() : status;
  switch (s) {
    case IPStatus.RESERVED:
    case 'RESERVED':
      return 'Reserved';
    case IPStatus.ASSIGNED:
    case 'ASSIGNED':
      return 'Allocated';
    default:
      return 'Available';
  }
}

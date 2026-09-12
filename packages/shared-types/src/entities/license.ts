import type { DirectoryUser } from './directory';

export enum LicenseType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  PERPETUAL = 'PERPETUAL',
  OPEN_SOURCE = 'OPEN_SOURCE',
  VOLUME = 'VOLUME',
  OEM = 'OEM',
}

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  REVOKED = 'REVOKED',
}

export interface LicenseAssignedUser {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  department?: string;
  assignedDate?: string;
}

export interface License {
  id: string;
  name: string;
  vendor?: string | null;
  publisher?: string | null;
  licenseKey?: string | null;
  maskedKey?: string | null;
  type: LicenseType | `${LicenseType}` | string;
  totalSeats: number;
  usedSeats: number;
  remainingSeats?: number;
  costPerSeat?: number | null;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  expirationDate?: string | null;
  cost?: number | null;
  status: LicenseStatus | `${LicenseStatus}` | string;
  autoRenew: boolean;
  notes?: string | null;
  assignments?: LicenseAssignment[];
  assignedUsers?: LicenseAssignedUser[];
  createdAt: string;
  updatedAt: string;
}

export interface LicenseAssignment {
  id: string;
  licenseId: string;
  userId?: string | null;
  user?: DirectoryUser | null;
  assignedName?: string | null;
  assignedEmail?: string | null;
  department?: string | null;
  assignedAt: string;
  unassignedAt?: string | null;
}

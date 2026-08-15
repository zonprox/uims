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

export interface License {
  id: string;
  name: string;
  vendor?: string | null;
  licenseKey?: string | null;
  type: LicenseType;
  totalSeats: number;
  usedSeats: number;
  costPerSeat?: number | null;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  cost?: number | null;
  status: LicenseStatus;
  autoRenew: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseAssignment {
  id: string;
  licenseId: string;
  userId?: string | null;
  assignedName?: string | null;
  assignedEmail?: string | null;
  department?: string | null;
  assignedAt: string;
  unassignedAt?: string | null;
}

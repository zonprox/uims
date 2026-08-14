export enum LicenseType {
  PERPETUAL = 'PERPETUAL',
  SUBSCRIPTION = 'SUBSCRIPTION',
  OEM = 'OEM',
  OPEN_SOURCE = 'OPEN_SOURCE',
  TRIAL = 'TRIAL',
}

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export interface License {
  id: string;
  name: string;
  publisher: string;
  type: LicenseType;
  status: LicenseStatus;
  totalSeats: number;
  availableSeats: number;
  cost: number | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  key: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseAssignment {
  id: string;
  licenseId: string;
  assignedToId: string; // UserId or AssetId
  assignedType: 'USER' | 'ASSET';
  assignedAt: string;
  assignedById: string;
}

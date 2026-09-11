import type { LicenseStatus, LicenseType } from '../entities/license';

export interface CreateLicenseDto {
  name: string;
  vendor?: string;
  type?: string | LicenseType;
  totalSeats?: number | string;
  costPerSeat?: number | string;
  purchaseDate?: string | Date;
  expiryDate?: string | Date;
  cost?: number | string;
  licenseKey?: string;
  status?: string | LicenseStatus;
  autoRenew?: boolean;
  notes?: string;
}

export interface UpdateLicenseDto extends Partial<CreateLicenseDto> {}

export interface LicenseQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vendor?: string;
  type?: string;
  status?: string;
}

export interface AssignUserLicenseDto {
  userId?: string;
  name?: string;
  email?: string;
  department?: string;
}

export interface BatchAssignUserLicenseDto {
  userIds: string[];
}

export interface LicenseStatsDto {
  total: number;
  annualSpend: number;
  utilization: number;
  expiringCount: number;
}

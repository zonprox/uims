import type { AccountStatus, DirectorySource } from '../entities/directory';

export interface CreateDirectoryUserDto {
  name?: string;
  displayName?: string;
  email: string;
  jobTitle?: string;
  department?: string;
  role?: string;
  phone?: string;
  location?: string;
  twoFactorEnabled?: boolean;
  status?: string | AccountStatus;
  source?: DirectorySource;
}

export interface UpdateDirectoryUserDto extends Partial<CreateDirectoryUserDto> {}

export interface DirectoryUserQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
}

export interface CreateDirectoryGroupDto {
  name: string;
  email?: string;
  address?: string;
  description?: string;
  memberCount?: number | string;
  scope?: string;
  managedBy?: string;
}

export interface DirectoryStatsDto {
  totalUsers: number;
  activeUsers: number;
  custodiansCount?: number;
  twoFactorRate?: number;
  suspendedAccounts: number;
}

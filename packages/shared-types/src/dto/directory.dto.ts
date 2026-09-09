import type { AccountStatus, DirectorySource } from '../entities/directory';

export interface CreateDirectoryUserDto {
  employeeCode?: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  jobTitle?: string;
  company?: string;
  groupCompany?: string;
  plant?: string;
  section?: string;
  subSection?: string;
  department?: string;
  location?: string;
  managerName?: string;
  telephone?: string;
  phone?: string;
  avatar?: string;
  computerName?: string;
  computerName2?: string;
  adGroup?: string;
  ouPath?: string;
  status?: AccountStatus;
  source?: DirectorySource;
  isClosed?: boolean;
  accountExpiresAt?: string;
  departmentId?: string;
  positionId?: string;
  organizationId?: string;
  locationId?: string;
}

export interface UpdateDirectoryUserDto extends Partial<CreateDirectoryUserDto> {}

export interface DirectoryUserQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  company?: string;
  plant?: string;
  department?: string;
  section?: string;
  adGroup?: string;
  ouPath?: string;
  source?: string;
  status?: string;
  isClosed?: boolean;
}

export interface CreateDirectoryGroupDto {
  name: string;
  email?: string;
  address?: string;
  description?: string;
  type?: string;
  scope?: string;
  ouPath?: string;
  memberCount?: number | string;
  managedBy?: string;
}

export interface BatchImportDirectoryUserItem {
  stt?: number | string;
  employeeCode?: string;
  name: string;
  email: string;
  designation?: string;
  groupCompany?: string;
  company?: string;
  plant?: string;
  department?: string;
  section?: string;
  subSection?: string;
  telephone?: string;
  computerName?: string;
  computerName2?: string;
  adGroup?: string;
  ouPath?: string;
  managerName?: string;
  isClosed?: boolean | string;
  status?: string;
}

export type BatchImportADUserItem = BatchImportDirectoryUserItem;

export interface BatchImportDirectoryResponse {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; email?: string; error: string }>;
}

export type BatchImportADResponse = BatchImportDirectoryResponse;

export interface DomainSyncResult {
  domain: string;
  controller: string;
  status: string;
  latencyMs: number;
  replicatedObjects: number;
  activeIdentities: number;
  lastSyncTimestamp: string;
}

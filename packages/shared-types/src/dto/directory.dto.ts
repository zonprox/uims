import type { AccountStatus, DirectorySource, DomainJoinStatus } from '../entities/directory';

export interface CreateDirectoryUserDto {
  employeeCode?: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
  managerName?: string;
  status?: AccountStatus;
  source?: DirectorySource;
  accountExpiresAt?: string;
  organizationId?: string;
  departmentId?: string;
  positionId?: string;

  // Active Directory Domain Join Metadata
  adDomain?: string;
  computerName?: string;
  domainJoined?: boolean;
  domainJoinStatus?: DomainJoinStatus | string;

  // Enterprise Email Password (Encrypted at rest by backend service)
  emailPassword?: string;
}

export interface UpdateDirectoryUserDto extends Partial<CreateDirectoryUserDto> {}

export interface ResetEmailPasswordDto {
  password?: string;
  newPassword?: string;
  generateRandom?: boolean;
}

export interface RevealEmailPasswordResponse {
  userId?: string;
  email?: string;
  password: string;
  revealedAt: string;
}

export interface RevealEmailPasswordResponseDto {
  password: string;
  revealedAt: string;
  userId?: string;
  email?: string;
}

export interface EmailPasswordResponse {
  userId: string;
  email: string;
  password: string;
  revealedAt?: string;
  copiedAt?: string;
  updatedAt?: string;
}

export interface AssignAssetDto {
  assetId: string;
}

export interface AssignLicenseDto {
  licenseId: string;
}

export interface DirectoryUserQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  source?: string;
  status?: string;

  // Active Directory Domain Join Filters
  domainJoined?: boolean;
  domainJoinStatus?: DomainJoinStatus | string;
  adDomain?: string;
}

export interface CreateDirectoryGroupDto {
  name: string;
  email?: string;
  description?: string;
  type?: string;
  scope?: string;
  ouPath?: string;
  memberCount?: number | string;
  managedBy?: string;
}

export interface UpdateDirectoryGroupDto extends Partial<CreateDirectoryGroupDto> {}

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

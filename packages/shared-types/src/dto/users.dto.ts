import type { DirectorySource } from '../entities/directory';
import type { UserStatus } from '../entities/user';

export interface CreateSystemUserDto {
  username?: string;
  email: string;
  employeeCode?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  jobTitle?: string;
  company?: string;
  groupCompany?: string;
  plant?: string;
  section?: string;
  subSection?: string;
  computerName?: string;
  computerName2?: string;
  adGroup?: string;
  telephone?: string;
  isClosed?: boolean;
  ouPath?: string;
  managerName?: string;
  isLocked?: boolean;
  accountExpiresAt?: string;
  source?: DirectorySource;
  adInitialPassword?: string;
  roleId?: string;
  roleName?: string;
  status?: UserStatus;
  avatar?: string;
  phone?: string;
  department?: string;
  location?: string;
  departmentId?: string;
  positionId?: string;
  organizationId?: string;
  locationId?: string;
}

export interface UpdateSystemUserDto extends Partial<CreateSystemUserDto> {}

export interface ToggleUserStatusDto {
  status: UserStatus;
}

export interface UserQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  department?: string;
  section?: string;
  company?: string;
  plant?: string;
  adGroup?: string;
  ouPath?: string;
  source?: string;
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

export interface BatchImportADUserItem {
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
  initialPassword?: string;
  adGroup?: string;
  ouPath?: string;
  managerName?: string;
  isClosed?: boolean | string;
  status?: string;
}

export interface BatchImportADResponse {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; email?: string; error: string }>;
}

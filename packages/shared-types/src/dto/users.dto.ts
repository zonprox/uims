import type { UserStatus } from '../entities/user';
export type {
  BatchImportADResponse,
  BatchImportADUserItem,
  CreateDirectoryGroupDto,
} from './directory.dto';

export interface CreateAppUserDto {
  username?: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  roleId?: string;
  roleName?: string;
  status?: UserStatus;
  isLocked?: boolean;
  mustChangePassword?: boolean;
}

export interface UpdateAppUserDto extends Partial<CreateAppUserDto> {}

export interface ToggleAppUserStatusDto {
  status: UserStatus;
}

export interface ResetAppUserPasswordDto {
  newPassword: string;
}

export interface AppUserQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  isLocked?: boolean;
}

// Backward-compatible aliases for system user operations
export type CreateSystemUserDto = CreateAppUserDto & {
  employeeCode?: string;
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
  accountExpiresAt?: string;
  source?: import('../entities/directory').DirectorySource;
  department?: string;
  location?: string;
  departmentId?: string;
  positionId?: string;
  organizationId?: string;
  locationId?: string;
};

export type UpdateSystemUserDto = Partial<CreateSystemUserDto>;
export type ToggleUserStatusDto = ToggleAppUserStatusDto;
export type UserQueryDto = AppUserQueryDto & {
  department?: string;
  section?: string;
  company?: string;
  plant?: string;
  adGroup?: string;
  ouPath?: string;
  source?: string;
};

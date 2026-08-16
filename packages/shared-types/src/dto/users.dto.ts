import type { DirectorySource } from '../entities/directory';
import type { UserStatus } from '../entities/user';

export interface CreateSystemUserDto {
  username?: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  jobTitle?: string;
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

export interface ResetUserPasswordDto {
  password: string;
}

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
  source?: string;
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

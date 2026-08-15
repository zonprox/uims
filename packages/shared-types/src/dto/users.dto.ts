import type { UserStatus } from '../entities/user';

export interface CreateSystemUserDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
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
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  department?: string;
}

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
  roleId?: string;
  role?: string;
  status?: string;
  isLocked?: boolean;
}

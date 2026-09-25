import type { Role } from './role';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  displayName?: string | null;
  avatar?: string | null;
  phone?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  role?: Role | null;
  status: UserStatus;
  isLocked: boolean;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppUserSummaryStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  lockedUsers?: number;
  suspendedUsers: number;
  recentActiveCount: number;
}

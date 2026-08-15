import type { Role } from './role';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  roleId?: string | null;
  roleName?: string | null;
  avatar?: string | null;
  phone?: string | null;
  department?: string | null;
  location?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  organizationId?: string | null;
  locationId?: string | null;
  status: UserStatus;
  role?: Role | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummaryStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  suspendedUsers: number;
  recentActiveCount: number;
}

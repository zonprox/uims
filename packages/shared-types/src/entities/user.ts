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
  fullName: string;
  avatar: string | null;
  status: UserStatus;
  role: Role;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

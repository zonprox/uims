import type { PermissionAction, PermissionSubject } from '../enums/permissions';

export interface Permission {
  id: string;
  action: string | PermissionAction;
  subject: string | PermissionSubject;
  conditions?: Record<string, unknown> | null;
  name?: string;
  description?: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  permission?: Permission;
}

export interface RoleAssignedUser {
  id: string;
  username: string;
  email: string;
  name?: string;
  displayName?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  status: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  userCount?: number;
  permissionCount?: number;
  permissions?: Array<Permission | RolePermission>;
  users?: RoleAssignedUser[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionCatalogAction {
  id: string;
  action: string;
  name: string;
  description: string;
}

export interface PermissionCatalogSubject {
  subject: string;
  displayName: string;
  description: string;
  category: string;
  actions: PermissionCatalogAction[];
}

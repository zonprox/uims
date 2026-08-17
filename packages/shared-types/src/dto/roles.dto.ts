import type { Role, Permission, PermissionCatalogSubject } from '../entities/role';

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface CloneRoleRequest {
  targetRoleName: string;
  description?: string;
}

export interface SyncRolePermissionsRequest {
  permissionIds: string[];
}

export interface RoleDetailResponse extends Role {
  effectivePermissions?: string[];
}

export interface RoleSummaryStats {
  totalRoles: number;
  systemRolesCount: number;
  customRolesCount: number;
  totalPermissionsCount: number;
  superAdminsCount: number;
  assignedUsersCoverage: number;
}

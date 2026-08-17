import type {
  CloneRoleRequest,
  CreateRoleRequest,
  PermissionCatalogSubject,
  Role,
  RoleDetailResponse,
  RoleSummaryStats,
  UpdateRoleRequest,
} from '@uims/shared-types';
import { api } from './api';

export const rolesService = {
  async getRoles(): Promise<Role[]> {
    const res = await api.get<Role[]>('/roles');
    return res.data;
  },

  async getStats(): Promise<RoleSummaryStats> {
    const res = await api.get<RoleSummaryStats>('/roles/stats');
    return res.data;
  },

  async getCatalog(): Promise<PermissionCatalogSubject[]> {
    const res = await api.get<PermissionCatalogSubject[]>('/roles/catalog');
    return res.data;
  },

  async getRole(id: string): Promise<RoleDetailResponse> {
    const res = await api.get<RoleDetailResponse>(`/roles/${id}`);
    return res.data;
  },

  async createRole(data: CreateRoleRequest): Promise<Role> {
    const res = await api.post<Role>('/roles', data);
    return res.data;
  },

  async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    const res = await api.patch<Role>(`/roles/${id}`, data);
    return res.data;
  },

  async cloneRole(id: string, data: CloneRoleRequest): Promise<Role> {
    const res = await api.post<Role>(`/roles/${id}/clone`, data);
    return res.data;
  },

  async syncPermissions(id: string, permissionIds: string[]): Promise<Role> {
    const res = await api.post<Role>(`/roles/${id}/permissions`, { permissionIds });
    return res.data;
  },

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/roles/${id}`);
    return res.data;
  },
};

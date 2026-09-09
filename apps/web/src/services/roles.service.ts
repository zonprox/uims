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
    const res = await api.get('/roles');
    return res.data?.data ?? res.data;
  },

  async getStats(): Promise<RoleSummaryStats> {
    const res = await api.get('/roles/stats');
    return res.data?.data ?? res.data;
  },

  async getCatalog(): Promise<PermissionCatalogSubject[]> {
    const res = await api.get('/roles/catalog');
    return res.data?.data ?? res.data;
  },

  async getRole(id: string): Promise<RoleDetailResponse> {
    const res = await api.get(`/roles/${id}`);
    return res.data?.data ?? res.data;
  },

  async createRole(data: CreateRoleRequest): Promise<Role> {
    const res = await api.post('/roles', data);
    return res.data?.data ?? res.data;
  },

  async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    const res = await api.patch(`/roles/${id}`, data);
    return res.data?.data ?? res.data;
  },

  async cloneRole(id: string, data: CloneRoleRequest): Promise<Role> {
    const res = await api.post(`/roles/${id}/clone`, data);
    return res.data?.data ?? res.data;
  },

  async syncPermissions(id: string, permissionIds: string[]): Promise<Role> {
    const res = await api.post(`/roles/${id}/permissions`, { permissionIds });
    return res.data?.data ?? res.data;
  },

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/roles/${id}`);
    return res.data?.data ?? res.data;
  },
};

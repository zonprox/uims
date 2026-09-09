import type {
  BatchImportDirectoryResponse,
  BatchImportDirectoryUserItem,
  CreateDirectoryGroupDto,
  CreateDirectoryUserDto,
  DirectoryGroup,
  DirectorySummaryStats,
  DirectoryUser,
  DirectoryUserQueryDto,
  DomainSyncResult,
  OrganizationalUnit,
  UpdateDirectoryUserDto,
} from '@uims/shared-types';
import { api } from './api';

export type {
  BatchImportDirectoryResponse,
  BatchImportDirectoryUserItem,
  CreateDirectoryGroupDto,
  CreateDirectoryUserDto,
  DirectoryGroup,
  DirectorySummaryStats,
  DirectoryUser,
  DirectoryUserQueryDto,
  DomainSyncResult,
  OrganizationalUnit,
  UpdateDirectoryUserDto,
};

export interface PaginatedDirectoryUsersResponse {
  items: DirectoryUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const directoryService = {
  getStats: async (): Promise<DirectorySummaryStats> => {
    const res = await api.get('/directory/stats');
    return res.data.data || res.data;
  },

  getEmployees: async (
    params?: DirectoryUserQueryDto,
  ): Promise<PaginatedDirectoryUsersResponse> => {
    const res = await api.get('/directory/users', { params });
    const data = res.data.data || res.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      };
    }
    return data;
  },

  getEmployee: async (id: string): Promise<DirectoryUser> => {
    const res = await api.get(`/directory/users/${id}`);
    return res.data.data || res.data;
  },

  createEmployee: async (data: CreateDirectoryUserDto): Promise<DirectoryUser> => {
    const res = await api.post('/directory/users', data);
    return res.data.data || res.data;
  },

  updateEmployee: async (id: string, data: UpdateDirectoryUserDto): Promise<DirectoryUser> => {
    const res = await api.patch(`/directory/users/${id}`, data);
    return res.data.data || res.data;
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await api.delete(`/directory/users/${id}`);
  },

  getGroups: async (): Promise<DirectoryGroup[]> => {
    const res = await api.get('/directory/groups');
    return res.data.data || res.data;
  },

  createGroup: async (data: CreateDirectoryGroupDto): Promise<DirectoryGroup> => {
    const res = await api.post('/directory/groups', data);
    return res.data.data || res.data;
  },

  getOrganizationalUnits: async (): Promise<OrganizationalUnit[]> => {
    const res = await api.get('/directory/organizational-units');
    return res.data.data || res.data;
  },

  syncDomain: async (): Promise<DomainSyncResult> => {
    const res = await api.post('/directory/sync-domain');
    return res.data.data || res.data;
  },

  exportEmployees: async (): Promise<Record<string, unknown>[]> => {
    const res = await api.get('/directory/export');
    return res.data.data || res.data;
  },

  importEmployees: async (
    users: BatchImportDirectoryUserItem[],
  ): Promise<BatchImportDirectoryResponse> => {
    const res = await api.post('/directory/import', { users });
    return res.data.data || res.data;
  },
};

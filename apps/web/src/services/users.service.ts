import type {
  BatchImportADResponse,
  BatchImportADUserItem,
  CreateDirectoryGroupDto,
  CreateSystemUserDto,
  DirectoryGroup,
  OrganizationalUnit,
  Role,
  UpdateSystemUserDto,
  User,
  UserQueryDto,
  UserStatus,
  UserSummaryStats,
} from '@uims/shared-types';
import { api } from './api';

export type {
  BatchImportADResponse,
  BatchImportADUserItem,
  DirectoryGroup,
  OrganizationalUnit,
  User,
  UserStatus,
  UserSummaryStats,
};

export interface PaginatedUsersResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DomainSyncResult {
  domain: string;
  controller: string;
  status: string;
  latencyMs: number;
  replicatedObjects: number;
  activeIdentities: number;
  lastSyncTimestamp: string;
}

export const usersService = {
  getStats: async (): Promise<UserSummaryStats> => {
    const res = await api.get('/users/stats');
    return res.data.data || res.data;
  },

  getRoles: async (): Promise<Role[]> => {
    const res = await api.get('/users/roles/list');
    return res.data.data || res.data;
  },

  getGroups: async (): Promise<DirectoryGroup[]> => {
    const res = await api.get('/users/groups');
    return res.data.data || res.data;
  },

  createGroup: async (data: CreateDirectoryGroupDto): Promise<DirectoryGroup> => {
    const res = await api.post('/users/groups', data);
    return res.data.data || res.data;
  },

  getOrganizationalUnits: async (): Promise<OrganizationalUnit[]> => {
    const res = await api.get('/users/organizational-units');
    return res.data.data || res.data;
  },

  syncDomain: async (): Promise<DomainSyncResult> => {
    const res = await api.post('/users/sync-domain');
    return res.data.data || res.data;
  },

  getUsers: async (params?: UserQueryDto): Promise<PaginatedUsersResponse> => {
    const res = await api.get('/users', { params });
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

  getUser: async (id: string): Promise<User> => {
    const res = await api.get(`/users/${id}`);
    return res.data.data || res.data;
  },

  createUser: async (data: CreateSystemUserDto): Promise<User> => {
    const res = await api.post('/users', data);
    return res.data.data || res.data;
  },

  updateUser: async (id: string, data: UpdateSystemUserDto): Promise<User> => {
    const res = await api.patch(`/users/${id}`, data);
    return res.data.data || res.data;
  },

  toggleStatus: async (id: string, status: UserStatus): Promise<User> => {
    const res = await api.patch(`/users/${id}/toggle-status`, { status });
    return res.data.data || res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  importUsers: async (users: BatchImportADUserItem[]): Promise<BatchImportADResponse> => {
    const res = await api.post('/users/import', { users });
    return res.data.data || res.data;
  },

  exportUsers: async (): Promise<Record<string, unknown>[]> => {
    const res = await api.get('/users/export');
    return res.data.data || res.data;
  },
};

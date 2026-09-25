import type {
  AppUser,
  AppUserQueryDto,
  AppUserSummaryStats,
  CreateAppUserDto,
  UpdateAppUserDto,
  UserStatus,
} from '@uims/shared-types';
import { api } from './api';

export type {
  AppUser,
  AppUserQueryDto,
  AppUserSummaryStats,
  CreateAppUserDto,
  UpdateAppUserDto,
  UserStatus,
};

export interface PaginatedUsersResponse {
  items: AppUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const usersService = {
  getStats: async (): Promise<AppUserSummaryStats> => {
    const res = await api.get('/users/stats');
    return res.data.data || res.data;
  },

  getUsers: async (params?: AppUserQueryDto): Promise<PaginatedUsersResponse> => {
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

  getUser: async (id: string): Promise<AppUser> => {
    const res = await api.get(`/users/${id}`);
    return res.data.data || res.data;
  },

  createUser: async (data: CreateAppUserDto): Promise<AppUser> => {
    const res = await api.post('/users', data);
    return res.data.data || res.data;
  },

  updateUser: async (id: string, data: UpdateAppUserDto): Promise<AppUser> => {
    const res = await api.patch(`/users/${id}`, data);
    return res.data.data || res.data;
  },

  toggleStatus: async (id: string, status: UserStatus): Promise<AppUser> => {
    const res = await api.patch(`/users/${id}/toggle-status`, { status });
    return res.data.data || res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

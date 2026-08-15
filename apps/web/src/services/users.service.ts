import type {
  CreateSystemUserDto,
  Role,
  UpdateSystemUserDto,
  User,
  UserQueryDto,
  UserStatus,
  UserSummaryStats,
} from '@uims/shared-types';
import { api } from './api';

export interface PaginatedUsersResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const usersService = {
  getStats: async (): Promise<UserSummaryStats> => {
    const res = await api.get('/users/stats/summary');
    return res.data.data;
  },

  getRoles: async (): Promise<Role[]> => {
    const res = await api.get('/users/roles/list');
    return res.data.data;
  },

  getUsers: async (params?: UserQueryDto): Promise<PaginatedUsersResponse> => {
    const res = await api.get('/users', { params });
    // if backend returns raw items or wrapped envelope
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
    return res.data.data;
  },

  createUser: async (data: CreateSystemUserDto): Promise<User> => {
    const res = await api.post('/users', data);
    return res.data.data;
  },

  updateUser: async (id: string, data: UpdateSystemUserDto): Promise<User> => {
    const res = await api.patch(`/users/${id}`, data);
    return res.data.data;
  },

  resetPassword: async (
    id: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/users/${id}/reset-password`, { password });
    return res.data.data;
  },

  toggleStatus: async (id: string, status: UserStatus): Promise<User> => {
    const res = await api.patch(`/users/${id}/toggle-status`, { status });
    return res.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

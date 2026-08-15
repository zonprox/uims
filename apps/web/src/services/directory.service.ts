import { api } from './api';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  role: 'Super Admin' | 'IT Specialist' | 'Developer' | 'Manager' | 'Employee';
  status: 'Active' | 'Suspended' | 'Inactive';
  twoFactorEnabled?: boolean;
  phone: string;
  location: string;
  assignedAssetsCount: number;
  assignedLicensesCount: number;
  lastLogin: string;
}

export interface DirectoryGroup {
  id: string;
  name: string;
  email: string;
  memberCount: number;
  scope: string;
  managedBy: string;
}

export interface DirectoryStats {
  totalUsers: number;
  activeUsers: number;
  custodiansCount?: number;
  twoFactorRate?: number;
  suspendedAccounts: number;
}

export const directoryService = {
  getUsers: async (params?: {
    search?: string;
    department?: string;
    status?: string;
  }): Promise<Array<DirectoryUser>> => {
    const res = await api.get('/directory/users', { params });
    return res.data.data;
  },
  getUser: async (id: string): Promise<DirectoryUser> => {
    const res = await api.get(`/directory/users/${id}`);
    return res.data.data;
  },
  createUser: async (data: Partial<DirectoryUser>): Promise<DirectoryUser> => {
    const res = await api.post('/directory/users', data);
    return res.data.data;
  },
  updateUser: async (id: string, data: Partial<DirectoryUser>): Promise<DirectoryUser> => {
    const res = await api.patch(`/directory/users/${id}`, data);
    return res.data.data;
  },
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/directory/users/${id}`);
  },
  getGroups: async (): Promise<Array<DirectoryGroup>> => {
    const res = await api.get('/directory/groups');
    return res.data.data;
  },
  createGroup: async (data: Partial<DirectoryGroup>): Promise<DirectoryGroup> => {
    const res = await api.post('/directory/groups', data);
    return res.data.data;
  },
  getStats: async (): Promise<DirectoryStats> => {
    const res = await api.get('/directory/stats');
    return res.data.data;
  },
};

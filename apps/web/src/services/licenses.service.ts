import { api } from './api';

export interface AssignedUser {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedDate: string;
}

export interface License {
  id: string;
  name: string;
  vendor: string;
  type: 'Subscription' | 'Perpetual' | 'Volume' | 'OEM';
  totalSeats: number;
  usedSeats: number;
  costPerSeat: number;
  expiryDate: string;
  licenseKey: string;
  status: 'Active' | 'Expiring' | 'Expired';
  autoRenew: boolean;
  assignedUsers: Array<AssignedUser>;
  notes?: string;
}

export interface LicenseStats {
  total: number;
  annualSpend: number;
  utilization: number;
  expiringCount: number;
}

export const licensesService = {
  getLicenses: async (params?: {
    search?: string;
    vendor?: string;
    type?: string;
  }): Promise<Array<License>> => {
    const res = await api.get('/licenses', { params });
    return res.data.data;
  },
  getLicense: async (id: string): Promise<License> => {
    const res = await api.get(`/licenses/${id}`);
    return res.data.data;
  },
  createLicense: async (data: Partial<License>): Promise<License> => {
    const res = await api.post('/licenses', data);
    return res.data.data;
  },
  updateLicense: async (id: string, data: Partial<License>): Promise<License> => {
    const res = await api.patch(`/licenses/${id}`, data);
    return res.data.data;
  },
  deleteLicense: async (id: string): Promise<void> => {
    await api.delete(`/licenses/${id}`);
  },
  assignUser: async (
    licenseId: string,
    payload: { name: string; email: string; department?: string },
  ) => {
    const res = await api.post(`/licenses/${licenseId}/assign`, payload);
    return res.data.data;
  },
  revokeUser: async (licenseId: string, assignmentId: string) => {
    const res = await api.delete(`/licenses/${licenseId}/assign/${assignmentId}`);
    return res.data.data;
  },
  getStats: async (): Promise<LicenseStats> => {
    const res = await api.get('/licenses/stats');
    return res.data.data;
  },
};

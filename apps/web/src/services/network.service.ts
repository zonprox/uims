import type {
  AutoDetectResult,
  IPAddress,
  NetworkCalculation,
  NetworkCredential,
  NetworkStats,
  Subnet,
  VLAN,
} from '@uims/shared-types';
import { IPStatus, VlanStatus } from '@uims/shared-types';
import { api } from './api';

export type {
  AutoDetectResult,
  IPAddress,
  NetworkCalculation,
  NetworkCredential,
  NetworkStats,
  Subnet,
  VLAN,
};
export { IPStatus, VlanStatus };

export interface VlanQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  status?: string;
  locationId?: string;
}

export interface SubnetQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
  locationId?: string;
}

export interface IpQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
  vlan?: string;
  subnetId?: string;
  subnet?: string;
  status?: string;
  deviceType?: string;
  locationId?: string;
}

export interface MacVendorLookupResult {
  mac: string;
  vendor: string;
  isKnown: boolean;
}

export interface NextAvailableIpResult {
  subnetId: string;
  cidr: string;
  nextAvailableIp: string | null;
}

export interface RevealedCredentialResult {
  id: string;
  name: string;
  username: string;
  password?: string;
  protocol?: string | null;
  port?: number | null;
  notes?: string | null;
  accessedAt?: string;
  accessedBy?: string;
}

export const networkService = {
  // Statistics & Automation Engine
  getStats: async (): Promise<NetworkStats> => {
    const res = await api.get('/network/stats');
    return res.data.data;
  },

  calculateSubnet: async (cidr: string): Promise<NetworkCalculation> => {
    const res = await api.get('/network/calculate-subnet', { params: { cidr } });
    return res.data.data;
  },

  autoDetect: async (ip: string): Promise<AutoDetectResult> => {
    const res = await api.get('/network/auto-detect', { params: { ip } });
    return res.data.data;
  },

  lookupMacVendor: async (mac: string): Promise<MacVendorLookupResult> => {
    const res = await api.get('/network/mac-vendor', { params: { mac } });
    return res.data.data;
  },

  // VLAN Management
  getVlans: async (params?: VlanQueryParams): Promise<Array<VLAN>> => {
    const res = await api.get('/network/vlans', { params });
    return res.data.data;
  },

  getVlan: async (id: string): Promise<VLAN> => {
    const res = await api.get(`/network/vlans/${id}`);
    return res.data.data;
  },

  createVlan: async (data: {
    vlanNumber: number;
    name: string;
    description?: string | null;
    status?: VlanStatus | `${VlanStatus}`;
    locationId?: string | null;
  }): Promise<VLAN> => {
    const res = await api.post('/network/vlans', data);
    return res.data.data;
  },

  updateVlan: async (id: string, data: Partial<VLAN>): Promise<VLAN> => {
    const res = await api.patch(`/network/vlans/${id}`, data);
    return res.data.data;
  },

  deleteVlan: async (id: string): Promise<void> => {
    await api.delete(`/network/vlans/${id}`);
  },

  // Subnet Management
  getSubnets: async (params?: SubnetQueryParams): Promise<Array<Subnet>> => {
    const res = await api.get('/network/subnets', { params });
    return res.data.data;
  },

  getSubnet: async (id: string): Promise<Subnet> => {
    const res = await api.get(`/network/subnets/${id}`);
    return res.data.data;
  },

  createSubnet: async (data: {
    cidr: string;
    name: string;
    vlanId?: string | null;
    locationId?: string | null;
    gateway?: string | null;
    description?: string | null;
  }): Promise<Subnet> => {
    const res = await api.post('/network/subnets', data);
    return res.data.data;
  },

  updateSubnet: async (id: string, data: Partial<Subnet>): Promise<Subnet> => {
    const res = await api.patch(`/network/subnets/${id}`, data);
    return res.data.data;
  },

  deleteSubnet: async (id: string): Promise<void> => {
    await api.delete(`/network/subnets/${id}`);
  },

  getNextAvailableIp: async (subnetId: string): Promise<NextAvailableIpResult> => {
    const res = await api.get(`/network/subnets/${subnetId}/next-available-ip`);
    return res.data.data;
  },

  // IP Address Allocations
  getIps: async (params?: IpQueryParams): Promise<Array<IPAddress>> => {
    const res = await api.get('/network/ips', { params });
    return res.data.data;
  },

  getIp: async (id: string): Promise<IPAddress> => {
    const res = await api.get(`/network/ips/${id}`);
    return res.data.data;
  },

  createIp: async (data: Partial<IPAddress>): Promise<IPAddress> => {
    const res = await api.post('/network/ips', data);
    return res.data.data;
  },

  updateIp: async (id: string, data: Partial<IPAddress>): Promise<IPAddress> => {
    const res = await api.patch(`/network/ips/${id}`, data);
    return res.data.data;
  },

  deleteIp: async (id: string): Promise<void> => {
    await api.delete(`/network/ips/${id}`);
  },

  revealCredential: async (id: string): Promise<RevealedCredentialResult> => {
    const res = await api.post(`/network/ips/${id}/reveal-credential`);
    return res.data.data;
  },

  getCredentials: async (): Promise<Array<NetworkCredential>> => {
    try {
      const res = await api.get('/network/credentials');
      return res.data.data;
    } catch {
      return [];
    }
  },
};

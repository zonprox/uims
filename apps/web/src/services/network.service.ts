import { api } from './api';

export interface IPAddress {
  id: string;
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  subnet: string;
  vlan: string;
  deviceType: 'Server' | 'Workstation' | 'Switch' | 'Access Point' | 'Printer';
  status: 'Allocated' | 'Reserved' | 'Available';
  pingStatus: 'online' | 'offline' | 'warning';
  lastSeen: string;
}

export interface Subnet {
  id: string;
  cidr: string;
  name: string;
  vlanName: string;
  gateway: string;
  totalIps: number;
  usedIps: number;
  location: string;
}

export interface DNSRecord {
  key: string;
  host: string;
  type: string;
  target: string;
  ttl: string;
}

export interface NetworkStats {
  managedSubnets: number;
  allocatedStaticIps: number;
  reservedDhcpLeases: number;
  freeIpCapacity: number;
}

export const networkService = {
  getIps: async (params?: {
    search?: string;
    vlan?: string;
    status?: string;
  }): Promise<Array<IPAddress>> => {
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
  pingIp: async (
    ip: string,
  ): Promise<{ ip: string; reachable: boolean; timeMs: number; message: string }> => {
    const res = await api.post('/network/ping', { ip });
    return res.data.data;
  },
  getSubnets: async (): Promise<Array<Subnet>> => {
    const res = await api.get('/network/subnets');
    return res.data.data;
  },
  createSubnet: async (data: Partial<Subnet>): Promise<Subnet> => {
    const res = await api.post('/network/subnets', data);
    return res.data.data;
  },
  getDnsRecords: async (): Promise<Array<DNSRecord>> => {
    const res = await api.get('/network/dns');
    return res.data.data;
  },
  getStats: async (): Promise<NetworkStats> => {
    const res = await api.get('/network/stats');
    return res.data.data;
  },
};

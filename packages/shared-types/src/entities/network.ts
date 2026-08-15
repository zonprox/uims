export enum IPStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ASSIGNED = 'ASSIGNED',
}

export interface VLAN {
  id: string;
  vlanNumber: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subnet {
  id: string;
  cidr: string;
  name: string;
  vlanId?: string | null;
  vlanName?: string | null;
  gateway?: string | null;
  totalIps: number;
  usedIps: number;
  location?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPAddress {
  id: string;
  address: string;
  hostname?: string | null;
  macAddress?: string | null;
  vendor?: string | null;
  deviceType?: string | null;
  subnetId?: string | null;
  subnetName?: string | null;
  vlanName?: string | null;
  status: IPStatus;
  pingStatus?: string | null;
  lastSeen?: string | null;
  assignedTo?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

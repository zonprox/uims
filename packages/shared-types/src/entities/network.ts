export enum IPStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  RESERVED = 'RESERVED',
  DEPRECATED = 'DEPRECATED',
}

export interface VLAN {
  id: string;
  vlanId: number; // 1-4094
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subnet {
  id: string;
  name: string;
  networkAddress: string;
  cidr: number;
  gateway: string | null;
  vlanId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPAddress {
  id: string;
  address: string;
  status: IPStatus;
  subnetId: string;
  macAddress: string | null;
  hostname: string | null;
  assetId: string | null;
  notes: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

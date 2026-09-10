import type { Asset } from './asset';
import type { Location } from './common';
import type { DirectoryUser } from './directory';

export enum IPStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ASSIGNED = 'ASSIGNED',
}

export enum VlanStatus {
  ACTIVE = 'ACTIVE',
  RESERVED = 'RESERVED',
  DEPRECATED = 'DEPRECATED',
}

export interface NetworkCredential {
  id: string;
  name: string;
  username: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  protocol?: string | null;
  port?: number | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface VLAN {
  id: string;
  vlanNumber: number;
  name: string;
  description?: string | null;
  status: VlanStatus | `${VlanStatus}`;
  locationId?: string | null;
  location?: Location | null;
  subnets?: Subnet[];
  ipAddresses?: IPAddress[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Subnet {
  id: string;
  cidr: string;
  name: string;
  vlanId?: string | null;
  locationId?: string | null;
  gateway?: string | null;
  networkAddress?: string | null;
  netmask?: string | null;
  broadcastAddress?: string | null;
  startIp?: string | null;
  endIp?: string | null;
  totalIps: number;
  usedIps: number;
  reservedIps?: number;
  description?: string | null;
  vlan?: VLAN | null;
  location?: Location | null;
  ipAddresses?: IPAddress[];
  vlanName?: string | null;
  locationName?: string | null;
  utilization?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IPAddress {
  id: string;
  address: string;
  hostname?: string | null;
  macAddress?: string | null;
  vendor?: string | null;
  deviceType?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  section?: string | null;
  floor?: string | null;
  subnetId?: string | null;
  vlanId?: string | null;
  locationId?: string | null;
  assetId?: string | null;
  assignedUserId?: string | null;
  credentialId?: string | null;
  status: IPStatus | `${IPStatus}`;
  pingStatus?: string | null;
  responseTimeMs?: number | null;
  lastSeen?: string | Date | null;
  description?: string | null;
  subnet?: Subnet | null;
  vlan?: VLAN | null;
  location?: Location | null;
  asset?: Asset | null;
  assignedUser?: DirectoryUser | null;
  credential?: NetworkCredential | null;
  // UI legacy / convenience aliases
  ip?: string;
  mac?: string;
  subnetName?: string | null;
  vlanName?: string | null;
  assignedTo?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NetworkCalculation {
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  prefix: number;
  totalHosts: number;
  usableHosts: number;
  usableStart: string;
  usableEnd: string;
  suggestedGateway: string;
}

export interface AutoDetectResult {
  ip: string;
  matchedSubnet: Subnet | null;
  matchedVlan: VLAN | null;
  isWithinSubnet: boolean;
  suggestedGateway?: string | null;
}

export interface NetworkStats {
  totalVlans: number;
  managedSubnets: number;
  totalIps: number;
  allocatedStaticIps: number;
  reservedDhcpLeases: number;
  availableIps: number;
  freeIpCapacity: number;
  averageUtilization: number;
}

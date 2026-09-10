import type { IPStatus, VlanStatus } from '../entities/network';

// --- VLAN DTOs ---

export interface CreateVlanDto {
  vlanNumber: number;
  name: string;
  description?: string | null;
  status?: VlanStatus | `${VlanStatus}` | string;
  locationId?: string | null;
}

export interface UpdateVlanDto extends Partial<CreateVlanDto> {}

export interface VlanQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  status?: string;
  locationId?: string;
}

// --- Subnet DTOs ---

export interface CreateSubnetDto {
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
  totalIps?: number | string;
  reservedIps?: number;
  description?: string | null;
  // legacy compatibility fields
  vlan?: string;
  vlanName?: string;
  location?: string;
}

export interface UpdateSubnetDto extends Partial<CreateSubnetDto> {}

export interface SubnetQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
  locationId?: string;
}

// --- IP Address DTOs ---

export interface CreateIPAddressDto {
  address?: string;
  ip?: string; // legacy support
  hostname?: string | null;
  macAddress?: string | null;
  mac?: string | null; // legacy support
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
  status?: IPStatus | `${IPStatus}` | string;
  pingStatus?: string;
  responseTimeMs?: number;
  lastSeen?: string | Date;
  description?: string | null;
  // legacy fields
  subnet?: string;
  subnetName?: string;
  vlan?: string;
  vlanName?: string;
}

export interface UpdateIPAddressDto extends Partial<CreateIPAddressDto> {}

export interface IPAddressQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
  vlan?: string; // legacy support
  subnetId?: string;
  subnet?: string; // legacy support
  status?: string;
  deviceType?: string;
  locationId?: string;
}

// --- Network Automation & Utility DTOs ---

export interface CalculateSubnetQueryDto {
  cidr: string;
}

export interface AutoDetectQueryDto {
  ip: string;
}

export interface MacVendorQueryDto {
  mac: string;
}

export interface RevealCredentialDto {
  password?: string;
}

export interface RevealCredentialResponse {
  id: string;
  name: string;
  username: string;
  password?: string;
  protocol?: string | null;
  port?: number | null;
  notes?: string | null;
}

export interface NetworkStatsDto {
  totalVlans: number;
  managedSubnets: number;
  totalIps: number;
  allocatedStaticIps: number;
  reservedDhcpLeases: number;
  availableIps: number;
  freeIpCapacity: number;
  averageUtilization: number;
}

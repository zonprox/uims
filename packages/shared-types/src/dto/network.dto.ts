import type { IPStatus } from '../entities/network';

export interface CreateIPAddressDto {
  ip?: string;
  address?: string;
  hostname?: string;
  mac?: string;
  macAddress?: string;
  vendor?: string;
  subnet?: string;
  subnetName?: string;
  vlan?: string;
  vlanName?: string;
  deviceType?: string;
  status?: string | IPStatus;
}

export interface UpdateIPAddressDto extends Partial<CreateIPAddressDto> {}

export interface IPAddressQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlan?: string;
  status?: string;
}

export interface CreateSubnetDto {
  cidr: string;
  name: string;
  vlan?: string;
  vlanName?: string;
  gateway?: string;
  totalIps?: number | string;
  location?: string;
  description?: string;
}

export interface NetworkStatsDto {
  managedSubnets: number;
  allocatedStaticIps: number;
  reservedDhcpLeases: number;
  freeIpCapacity: number;
}

import type {
  IPStatus,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  VlanStatus,
} from '../entities/network';

// --- VLAN DTOs ---

export interface CreateVlanDto {
  vlanNumber: number;
  name: string;
  description?: string | null;
  status?: VlanStatus | `${VlanStatus}`;
}

export interface UpdateVlanDto extends Partial<CreateVlanDto> {}

export interface VlanQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// --- Subnet DTOs ---

export interface CreateSubnetDto {
  cidr: string;
  name: string;
  vlanId?: string | null;
  gateway?: string | null;
  networkAddress?: string | null;
  netmask?: string | null;
  broadcastAddress?: string | null;
  startIp?: string | null;
  endIp?: string | null;
  totalIps?: number | string;
  reservedIps?: number;
  description?: string | null;
}

export interface UpdateSubnetDto extends Partial<CreateSubnetDto> {}

export interface SubnetQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
}

// --- IP Address DTOs ---

export interface CreateIPAddressDto {
  address?: string;
  macAddress?: string | null;
  vendor?: string | null;
  deviceType?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  section?: string | null;
  floor?: string | null;
  subnetId?: string | null;
  vlanId?: string | null;
  assetId?: string | null;
  assignedUserId?: string | null;
  status?: IPStatus | `${IPStatus}`;
  pingStatus?: string;
  responseTimeMs?: number;
  lastSeen?: string | Date;
  description?: string | null;
  switchPortId?: string | null;
}

export interface UpdateIPAddressDto extends Partial<CreateIPAddressDto> {}

export interface IPAddressQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
  subnetId?: string;
  status?: string;
  deviceType?: string;
  switchPortId?: string;
  switchId?: string;
}

// --- Network Rack DTOs ---

export interface CreateRackDto {
  name: string;
  code: string;
  totalHeight?: number; // default 42
  depth?: number | null; // mm
  width?: number | null; // mm
  maxPowerKw?: number | null; // kW
  maxWeightKg?: number | null; // kg
  status?: RackStatus | `${RackStatus}`;
  notes?: string | null;
}

export interface UpdateRackDto extends Partial<CreateRackDto> {}

export interface RackQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// --- Network Switch DTOs ---

export interface CreateSwitchDto {
  name: string;
  model: string;
  vendor: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  ipAddressId?: string | null;
  firmwareVersion?: string | null;
  role?: SwitchRole | `${SwitchRole}`;
  status?: SwitchStatus | `${SwitchStatus}`;
  totalPorts?: number; // Strictly even integer [2, 48], default 24
  uplinkPorts?: number | null; // Dedicated RJ45 uplink count [0, 8], default 2
  fiberPorts?: number | null; // Dedicated SFP/SFP+ fiber count [0, 8], default 2
  uplinkSpeed?: string | null; // '1 Gbps' | '2.5 Gbps' | '10 Gbps'
  fiberSpeed?: string | null; // '1 Gbps' | '10 Gbps'
  rackId?: string | null;
  rackPosition?: number | null;
  rackHeight?: number;
  assetId?: string | null;
  notes?: string | null;
  autoGeneratePorts?: boolean;
}

export interface UpdateSwitchDto extends Partial<CreateSwitchDto> {}

export interface SwitchQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  rackId?: string;
  vendor?: string;
  role?: string;
  status?: string;
}

// --- Switch Port DTOs ---

export interface CreateSwitchPortDto {
  switchId: string;
  portNumber: number;
  name: string;
  formFactor?: PortFormFactor | `${PortFormFactor}`;
  poeEnabled?: boolean;
  adminStatus?: PortAdminStatus | `${PortAdminStatus}`;
  operStatus?: PortOperStatus | `${PortOperStatus}`;
  speed?: string | null;
  duplex?: string | null;
  vlanId?: string | null;
  mode?: PortMode | `${PortMode}`;
  taggedVlanIds?: number[] | string[] | null;
  ipAddressId?: string | null;
  connectedAssetId?: string | null;
  description?: string | null;
}

export interface UpdateSwitchPortDto {
  name?: string;
  formFactor?: PortFormFactor | `${PortFormFactor}`;
  poeEnabled?: boolean;
  adminStatus?: PortAdminStatus | `${PortAdminStatus}`;
  operStatus?: PortOperStatus | `${PortOperStatus}`;
  speed?: string | null;
  duplex?: string | null;
  vlanId?: string | null;
  mode?: PortMode | `${PortMode}`;
  taggedVlanIds?: number[] | string[] | null;
  ipAddressId?: string | null;
  connectedAssetId?: string | null;
  description?: string | null;
}

export interface SwitchPortQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  switchId?: string;
  vlanId?: string;
  adminStatus?: string;
  operStatus?: string;
  mode?: string;
  search?: string;
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

export interface NetworkStatsDto {
  totalVlans: number;
  managedSubnets: number;
  totalIps: number;
  allocatedStaticIps: number;
  reservedDhcpLeases: number;
  availableIps: number;
  freeIpCapacity: number;
  averageUtilization: number;
  totalRacks?: number;
  totalSwitches?: number;
  totalPorts?: number;
  portUtilization?: number;
}

import type { Asset } from './asset';
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

export enum RackStatus {
  ACTIVE = 'ACTIVE',
  PLANNED = 'PLANNED',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum SwitchRole {
  CORE = 'CORE',
  DISTRIBUTION = 'DISTRIBUTION',
  ACCESS = 'ACCESS',
  TOR = 'TOR',
}

export enum SwitchStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum PortFormFactor {
  RJ45_1G = 'RJ45_1G',
  SFP_1G = 'SFP_1G',
  SFP_PLUS_10G = 'SFP_PLUS_10G',
  SFP28_25G = 'SFP28_25G',
  QSFP_PLUS_40G = 'QSFP_PLUS_40G',
  QSFP28_100G = 'QSFP28_100G',
}

export enum PortAdminStatus {
  UP = 'UP',
  DOWN = 'DOWN',
}

export enum PortOperStatus {
  ACTIVE = 'ACTIVE',
  DOWN = 'DOWN',
  CONNECTED_NO_SIGNAL = 'CONNECTED_NO_SIGNAL',
  RESERVED = 'RESERVED',
}

export enum PortMode {
  ACCESS = 'ACCESS',
  TRUNK = 'TRUNK',
  LACP = 'LACP',
}

export enum PortSpeed {
  SPEED_100M = '100 Mbps',
  SPEED_1G = '1 Gbps',
  SPEED_2_5G = '2.5 Gbps',
  SPEED_10G = '10 Gbps',
  SPEED_25G = '25 Gbps',
  SPEED_40G = '40 Gbps',
  SPEED_100G = '100 Gbps',
  AUTO = 'Auto',
}

export const SPEED_1G = PortSpeed.SPEED_1G;
export const SPEED_2_5G = PortSpeed.SPEED_2_5G;
export const SPEED_10G = PortSpeed.SPEED_10G;

export interface VLAN {
  id: string;
  vlanNumber: number;
  name: string;
  description?: string | null;
  status: VlanStatus | `${VlanStatus}`;
  subnets?: Subnet[];
  ipAddresses?: IPAddress[];
  switchPorts?: SwitchPort[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Subnet {
  id: string;
  cidr: string;
  name: string;
  vlanId?: string | null;
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
  ipAddresses?: IPAddress[];
  vlanName?: string | null;
  utilization?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NetworkRack {
  id: string;
  name: string;
  code: string;
  totalHeight: number; // 12, 24, 42, 48 RU
  depth?: number | null; // mm
  width?: number | null; // mm
  maxPowerKw?: number | null; // kW capacity
  maxWeightKg?: number | null; // kg capacity
  status: RackStatus | `${RackStatus}`;
  notes?: string | null;
  switches?: NetworkSwitch[];
  usedUnits?: number;
  availableUnits?: number;
  occupancyRate?: number;
  powerUtilization?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const STANDARD_SWITCH_PORT_COUNTS = [8, 16, 24, 48] as const;
export type StandardSwitchPortCount = (typeof STANDARD_SWITCH_PORT_COUNTS)[number];

export interface NetworkSwitch {
  id: string;
  name: string;
  model: string;
  vendor: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  ipAddressId?: string | null;
  ipAddress?: IPAddress | null;
  firmwareVersion?: string | null;
  role: SwitchRole | `${SwitchRole}`;
  status: SwitchStatus | `${SwitchStatus}`;
  totalPorts: number;
  uplinkPorts?: number | null;
  fiberPorts?: number | null;
  uplinkSpeed?: string | null;
  fiberSpeed?: string | null;
  rackId?: string | null;
  rack?: NetworkRack | null;
  rackPosition?: number | null; // 1-48 RU starting slot
  rackHeight: number; // default 1
  assetId?: string | null;
  asset?: Asset | null;
  notes?: string | null;
  ports?: SwitchPort[];
  activePortsCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SwitchPort {
  id: string;
  switchId: string;
  switch?: NetworkSwitch | null;
  portNumber: number;
  name: string;
  formFactor: PortFormFactor | `${PortFormFactor}`;
  poeEnabled: boolean;
  adminStatus: PortAdminStatus | `${PortAdminStatus}`;
  operStatus: PortOperStatus | `${PortOperStatus}`;
  speed?: string | null;
  duplex?: string | null;
  vlanId?: string | null;
  vlan?: VLAN | null;
  mode: PortMode | `${PortMode}`;
  taggedVlanIds?: number[] | string[] | null;
  ipAddressId?: string | null;
  ipAddress?: IPAddress | null;
  connectedAssetId?: string | null;
  connectedAsset?: Asset | null;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface RackElevationSlot {
  unitNumber: number; // 1..48
  isOccupied: boolean;
  switch?: {
    id: string;
    name: string;
    model: string;
    vendor: string;
    role: SwitchRole | `${SwitchRole}`;
    status: SwitchStatus | `${SwitchStatus}`;
    rackHeight: number;
    rackPosition: number;
    totalPorts: number;
    activePortsCount?: number;
  } | null;
  isStartingUnit: boolean;
  occupiedByUnit?: number | null;
}

export interface RackElevationData {
  rackId: string;
  rackName: string;
  rackCode: string;
  totalHeight: number;
  usedUnits: number;
  availableUnits: number;
  occupancyRate: number;
  maxPowerKw?: number | null;
  estimatedPowerUsageKw?: number | null;
  slots: RackElevationSlot[];
}

export interface IPAddress {
  id: string;
  address: string;
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
  status: IPStatus | `${IPStatus}`;
  pingStatus?: string | null;
  responseTimeMs?: number | null;
  lastSeen?: string | Date | null;
  description?: string | null;
  subnet?: Subnet | null;
  vlan?: VLAN | null;
  asset?: Asset | null;
  assignedUser?: DirectoryUser | null;
  // Upstream Switch & Port linkage
  switchPortId?: string | null;
  switchPort?: SwitchPort | null;
  switchPorts?: SwitchPort[];
  upstreamSwitch?: {
    id: string;
    name: string;
    model?: string | null;
    rackName?: string | null;
    rackPosition?: number | null;
  } | null;
  upstreamPort?: {
    id: string;
    name: string;
    portNumber?: number;
    operStatus?: string;
  } | null;
  switchName?: string | null;
  portName?: string | null;
  rackName?: string | null;
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
  totalRacks?: number;
  totalSwitches?: number;
  totalPorts?: number;
  portUtilization?: number;
}

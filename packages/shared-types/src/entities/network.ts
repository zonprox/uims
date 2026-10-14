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

export enum InfrastructureDomain {
  NETWORK = 'NETWORK',
  CCTV = 'CCTV',
  SHARED = 'SHARED',
}

export type NetworkDomain = InfrastructureDomain;
export const NetworkDomain = InfrastructureDomain;

export enum TopologyViewMode {
  ALL = 'ALL',
  NETWORK = 'NETWORK',
  CCTV = 'CCTV',
}

export enum LinkMediumType {
  COPPER = 'COPPER',
  FIBER_SINGLE = 'FIBER_SINGLE',
  FIBER_MULTI = 'FIBER_MULTI',
  DAC = 'DAC',
  WIRELESS = 'WIRELESS',
}

export enum PortRole {
  ACCESS = 'ACCESS',
  TRUNK = 'TRUNK',
  UPLINK = 'UPLINK',
  STACK = 'STACK',
  ROUTED = 'ROUTED',
}

export enum TopologyNodeType {
  CORE_SWITCH = 'CORE_SWITCH',
  DISTRIBUTION_SWITCH = 'DISTRIBUTION_SWITCH',
  ACCESS_SWITCH = 'ACCESS_SWITCH',
  ROUTER = 'ROUTER',
  FIREWALL = 'FIREWALL',
  SERVER = 'SERVER',
  NVR = 'NVR',
  CAMERA = 'CAMERA',
  AP = 'AP',
  RACK = 'RACK',
  ENDPOINT = 'ENDPOINT',
  SWITCH = 'SWITCH',
  ASSET = 'ASSET',
  ACCESS_POINT = 'ACCESS_POINT',
}

export enum TopologyNodeStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  DEGRADED = 'DEGRADED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum TopologyEdgeStatus {
  ACTIVE = 'ACTIVE',
  DOWN = 'DOWN',
  CONNECTED_NO_SIGNAL = 'CONNECTED_NO_SIGNAL',
  DEGRADED = 'DEGRADED',
}

export enum TopologyPoeStatus {
  OFF = 'OFF',
  DELIVERING = 'DELIVERING',
  FAULT = 'FAULT',
  OVERLOAD = 'OVERLOAD',
}


export enum SwitchRole {
  CORE = 'CORE',
  DISTRIBUTION = 'DISTRIBUTION',
  ACCESS = 'ACCESS',
  TOR = 'TOR',
  POE_ACCESS = 'POE_ACCESS',
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
  domain?: NetworkDomain | `${NetworkDomain}`;
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
  domain?: NetworkDomain | `${NetworkDomain}`;
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
  depth?: number | null; // mm
  width?: number | null; // mm
  maxPowerKw?: number | null; // kW capacity
  maxWeightKg?: number | null; // kg capacity
  positionX?: number | null;
  positionY?: number | null;
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
  domain?: NetworkDomain | `${NetworkDomain}`;
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
  positionX?: number | null;
  positionY?: number | null;
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
  connectedPortId?: string | null;
  connectedPort?: SwitchPort | null;
  peerPort?: SwitchPort | null;
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

// ==========================================
// TOPOLOGY GRAPH & CANVAS INTERFACES
// ==========================================

export interface NodeCanvasPosition {
  /** Horizontal canvas coordinate in pixels */
  x: number;
  /** Vertical canvas coordinate in pixels */
  y: number;
  /** Whether the node position is pinned by the operator */
  isPinned?: boolean;
}

export interface TopologyNode {
  /** Unique identifier of the node (Switch ID, Asset ID, Rack ID, Endpoint ID) */
  id: string;
  /** Human-readable display label (Switch Name, Asset Tag, Camera Name) */
  label: string;
  /** Subsystem domain */
  domain: InfrastructureDomain | `${InfrastructureDomain}`;
  /** Granular hardware type */
  type: TopologyNodeType | `${TopologyNodeType}`;
  /** Subtype or model name (e.g. 'Catalyst 9300', 'Bullet 4K IR') */
  subType?: string | null;
  /** Operational connectivity status */
  status: TopologyNodeStatus | `${TopologyNodeStatus}`;
  /** Equipment rack identifier if mounted */
  rackId?: string | null;
  /** Equipment rack display name */
  rackName?: string | null;
  /** Starting rack unit position (1..48 RU slot) */
  rackUnit?: number | null;
  /** Legacy rack position */
  rackPosition?: number | null;
  /** Primary management or stream IP address */
  ipAddress?: string | null;
  /** Hardware MAC address */
  macAddress?: string | null;
  /** PoE power delivery state */
  poeStatus?: TopologyPoeStatus | `${TopologyPoeStatus}` | null;
  /** Primary link or uplink speed string (e.g. '10 Gbps', '1 Gbps') */
  linkSpeed?: string | null;
  /** Structured 2D coordinate container */
  position?: NodeCanvasPosition;

  // Flattened coordinates for direct canvas rendering compatibility
  x: number;
  y: number;
  isPinned?: boolean;

  // Additional hardware telemetry
  model?: string | null;
  vendor?: string | null;
  serialNumber?: string | null;
  floor?: string | null;
  section?: string | null;
  totalPorts?: number;
  activePorts?: number;
  poeActivePorts?: number;
  poePowerWatts?: number;
  data?: Record<string, unknown>;
}

export interface TopologyEdge {
  /** Unique link identifier */
  id: string;
  /** Source node UUID */
  sourceNodeId?: string;
  /** Source switch port UUID */
  sourcePortId?: string;
  /** Source switch port display name (e.g. 'Gi1/0/24', 'Te1/0/49') */
  sourcePortName?: string;
  /** Target node UUID (peer switch or endpoint device) */
  targetNodeId?: string;
  /** Target switch port UUID (for inter-switch uplink) */
  targetPortId?: string | null;
  /** Target switch port display name (for inter-switch uplink) */
  targetPortName?: string | null;
  /** Physical cabling medium */
  medium?: LinkMediumType | `${LinkMediumType}`;
  /** Subsystem domain */
  domain: InfrastructureDomain | `${InfrastructureDomain}`;
  /** Link speed in Megabits per second (e.g. 1000, 10000, 40000) */
  speedMbps?: number;
  /** Whether PoE power delivery is active on this link */
  poeDelivering?: boolean;
  /** Link operational signaling status */
  status: TopologyEdgeStatus | `${TopologyEdgeStatus}`;
  /** Operational port role */
  portRole?: PortRole | `${PortRole}`;
  /** Native/access VLAN UUID */
  vlanId?: string | null;
  /** Native/access VLAN number */
  vlanNumber?: number | null;
  /** Allowed tagged VLAN numbers on trunk link */
  taggedVlanIds?: number[];

  // 2D Canvas rendering compatibility aliases
  source: string;
  target: string;
  speed?: string | null;
  linkType?: 'UPLINK' | 'DOWNLINK' | 'ENDPOINT' | 'TRUNK' | 'POE';
  mediaType?: 'COPPER' | 'FIBER_SFP' | 'FIBER_SFP_PLUS' | 'FIBER_QSFP';
  poeEnabled?: boolean;
}

export interface TopologyRackGroup {
  id: string;
  name: string;
  code: string;
  status: string;
  switchCount: number;
  positionX?: number | null;
  positionY?: number | null;
}

export interface TopologyVlanSummary {
  id: string;
  vlanNumber: number;
  name: string;
  domain: InfrastructureDomain | `${InfrastructureDomain}`;
  subnetCount: number;
  switchCount: number;
}

export interface TopologySubnetSummary {
  id: string;
  cidr: string;
  name: string;
  domain: InfrastructureDomain | `${InfrastructureDomain}`;
  vlanId?: string | null;
  utilization: number;
}

export interface TopologyMetrics {
  totalNodes: number;
  totalSwitches: number;
  totalRacks: number;
  totalEndpoints: number;
  totalCameras: number;
  totalNvrs: number;
  totalServers: number;
  totalAccessPoints?: number;
  totalEdges: number;
  activeLinks: number;
  degradedLinks: number;
  downLinks: number;
  poePowerUsageWatts: number;
  onlinePercentage: number;
}

export type { TopologyMetrics as TopologySummaryMetrics };

export interface TopologyGraphResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  racks: TopologyRackGroup[];
  vlans: TopologyVlanSummary[];
  subnets: TopologySubnetSummary[];
  metrics: TopologyMetrics;
  summaryMetrics?: TopologyMetrics;
}

export type { TopologyGraphResponse as NetworkTopologyData };


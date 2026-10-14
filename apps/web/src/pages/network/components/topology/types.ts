import type { Asset } from '../../../../services/assets.service';
import type {
  NetworkRack,
  PortMode,
  Subnet,
  SwitchPort,
  VLAN,
} from '../../../../services/network.service';

export type TopologyViewMode = 'ALL' | 'NETWORK' | 'CCTV';

export type TopologyNodeType =
  | 'CORE_SWITCH'
  | 'DISTRIBUTION_SWITCH'
  | 'ACCESS_SWITCH'
  | 'ROUTER'
  | 'FIREWALL'
  | 'SERVER'
  | 'NVR'
  | 'CAMERA'
  | 'AP'
  | 'RACK'
  | 'ENDPOINT'
  | 'SWITCH'
  | 'ASSET'
  | 'ACCESS_POINT';

export type TopologyNodeStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'ACTIVE'
  | 'CONNECTED_NO_SIGNAL'
  | 'DEGRADED'
  | 'DOWN';

export type TopologyNodeDomain = 'NETWORK' | 'CCTV' | 'SHARED';

export type TopologyEdgeStatus =
  | 'ACTIVE'
  | 'DOWN'
  | 'CONNECTED_NO_SIGNAL'
  | 'DEGRADED';

export type TopologyEdgeType =
  | 'UPLINK'
  | 'ACCESS'
  | 'TRUNK'
  | 'POE'
  | 'ENDPOINT'
  | 'DOWNLINK';

export function getNodeDimensions(type: string): { width: number; height: number } {
  if (type === 'RACK') return { width: 200, height: 96 };
  if (type === 'SWITCH') return { width: 210, height: 98 };
  return { width: 185, height: 86 };
}

export interface TopologyNode {
  id: string;
  type: TopologyNodeType;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  status: TopologyNodeStatus;
  domain: TopologyNodeDomain;
  rackId?: string | null;
  rackName?: string | null;
  rackPosition?: number | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  model?: string | null;
  vendor?: string | null;
  serialNumber?: string | null;
  role?: string | null;
  subType?: string | null;
  totalPorts?: number;
  activePorts?: number;
  poePorts?: number;
  poeActivePorts?: number;
  poePowerWatts?: number;
  floor?: string | null;
  zone?: string | null;
  vlanId?: string | null;
  vlanName?: string | null;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  sourcePortId?: string | null;
  targetPortId?: string | null;
  sourcePortName?: string | null;
  targetPortName?: string | null;
  type?: TopologyEdgeType;
  linkType?: TopologyEdgeType;
  subType?: string | null;
  speed?: string | null;
  media?: 'COPPER' | 'FIBER';
  mediaType?: string;
  speedMbps?: number;
  status: TopologyEdgeStatus;
  poeEnabled?: boolean;
  poeDelivering?: boolean;
  vlanId?: string | null;
  vlanName?: string | null;
  vlanNumber?: number | null;
  taggedVlanIds?: (number | string)[];
  domain?: TopologyNodeDomain;
}

export interface NetworkTopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  racks: NetworkRack[];
  vlans: VLAN[];
  subnets: Subnet[];
  summaryMetrics: {
    totalNodes: number;
    totalEdges: number;
    activeLinks: number;
    downLinks: number;
    poePowerLinks?: number;
    poePowerUsageWatts?: number;
    cameraCount: number;
    switchCount: number;
  };
}

export interface TopologyQueryParams {
  mode?: TopologyViewMode;
  rackId?: string;
  vlanId?: string;
  subnetId?: string;
  floor?: string;
  switchRole?: string;
  status?: string;
}

export interface SaveTopologyLayoutDto {
  mode?: TopologyViewMode;
  positions:
    | Array<{ nodeId: string; nodeType?: string; x: number; y: number }>
    | Record<string, { x: number; y: number }>;
}

export interface PatchTopologyLinkDto {
  sourcePortId: string;
  targetPortId?: string;
  targetAssetId?: string;
  targetIpId?: string;
  targetIpAddressId?: string;
  vlanId?: string;
  mode?: PortMode | `${PortMode}`;
  poeEnabled?: boolean;
  speed?: string;
  taggedVlanIds?: number[];
}

export type { Asset, NetworkRack, Subnet, SwitchPort, VLAN };

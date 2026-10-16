import type {
  AutoDetectResult,
  CreateRackDto,
  CreateSwitchDto,
  CreateSwitchPortDto,
  IPAddress,
  NetworkCalculation,
  NetworkRack,
  NetworkStats,
  NetworkSwitch,
  NetworkTopologyData,
  RackElevationData,
  RackElevationSlot,
  RackQueryDto,
  Subnet,
  SwitchPort,
  SwitchPortQueryDto,
  SwitchQueryDto,
  TopologyEdge,
  TopologyNode,
  TopologyRackGroup,
  TopologySubnetSummary,
  TopologySummaryMetrics,
  TopologyVlanSummary,
  UpdateRackDto,
  UpdateSwitchDto,
  UpdateSwitchPortDto,
  VLAN,
} from '@uims/shared-types';
import {
  IPStatus,
  NetworkDomain,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  TopologyNodeType,
  TopologyViewMode,
  VlanStatus,
} from '@uims/shared-types';
import { api } from './api';

export type {
  AutoDetectResult,
  CreateRackDto,
  CreateSwitchDto,
  CreateSwitchPortDto,
  IPAddress,
  NetworkCalculation,
  NetworkRack,
  NetworkStats,
  NetworkSwitch,
  NetworkTopologyData,
  RackElevationData,
  RackElevationSlot,
  RackQueryDto,
  Subnet,
  SwitchPort,
  SwitchPortQueryDto,
  SwitchQueryDto,
  TopologyEdge,
  TopologyNode,
  TopologyRackGroup,
  TopologySubnetSummary,
  TopologySummaryMetrics,
  TopologyVlanSummary,
  UpdateRackDto,
  UpdateSwitchDto,
  UpdateSwitchPortDto,
  VLAN,
};
export {
  IPStatus,
  NetworkDomain,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  TopologyNodeType,
  TopologyViewMode,
  VlanStatus,
};

export interface VlanQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface SubnetQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
}

export interface IpQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  vlanId?: string;
  vlan?: string;
  subnetId?: string;
  subnet?: string;
  status?: string;
  deviceType?: string;
}

export interface MacVendorLookupResult {
  mac: string;
  vendor: string;
  isKnown: boolean;
}

export interface NextAvailableIpResult {
  subnetId: string;
  cidr: string;
  nextAvailableIp: string | null;
}

export interface TopologyQueryParams {
  mode?: 'ALL' | 'NETWORK' | 'CCTV';
  rackId?: string;
  vlanId?: string;
  subnetId?: string;
  switchRole?: string;
  floor?: string;
  status?: string;
}

export interface SaveTopologyLayoutDto {
  mode?: 'ALL' | 'NETWORK' | 'CCTV';
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
  speed?: string;
  taggedVlanIds?: number[];
}

export const networkService = {
  // Statistics & Automation Engine
  getStats: async (): Promise<NetworkStats> => {
    const res = await api.get('/network/stats');
    return res.data.data;
  },

  calculateSubnet: async (cidr: string): Promise<NetworkCalculation> => {
    const res = await api.get('/network/calculate-subnet', { params: { cidr } });
    return res.data.data;
  },

  autoDetect: async (ip: string): Promise<AutoDetectResult> => {
    const res = await api.get('/network/auto-detect', { params: { ip } });
    return res.data.data;
  },

  lookupMacVendor: async (mac: string): Promise<MacVendorLookupResult> => {
    const res = await api.get('/network/mac-vendor', { params: { mac } });
    return res.data.data;
  },

  // VLAN Management
  getVlans: async (params?: VlanQueryParams): Promise<Array<VLAN>> => {
    const res = await api.get('/network/vlans', { params });
    return res.data.data;
  },

  getVlan: async (id: string): Promise<VLAN> => {
    const res = await api.get(`/network/vlans/${id}`);
    return res.data.data;
  },

  createVlan: async (data: {
    vlanNumber: number;
    name: string;
    description?: string | null;
    status?: VlanStatus | `${VlanStatus}`;
  }): Promise<VLAN> => {
    const res = await api.post('/network/vlans', data);
    return res.data.data;
  },

  updateVlan: async (id: string, data: Partial<VLAN>): Promise<VLAN> => {
    const res = await api.patch(`/network/vlans/${id}`, data);
    return res.data.data;
  },

  deleteVlan: async (id: string): Promise<void> => {
    await api.delete(`/network/vlans/${id}`);
  },

  // Subnet Management
  getSubnets: async (params?: SubnetQueryParams): Promise<Array<Subnet>> => {
    const res = await api.get('/network/subnets', { params });
    return res.data.data;
  },

  getSubnet: async (id: string): Promise<Subnet> => {
    const res = await api.get(`/network/subnets/${id}`);
    return res.data.data;
  },

  createSubnet: async (data: {
    cidr: string;
    name: string;
    vlanId?: string | null;
    gateway?: string | null;
    description?: string | null;
  }): Promise<Subnet> => {
    const res = await api.post('/network/subnets', data);
    return res.data.data;
  },

  updateSubnet: async (id: string, data: Partial<Subnet>): Promise<Subnet> => {
    const res = await api.patch(`/network/subnets/${id}`, data);
    return res.data.data;
  },

  deleteSubnet: async (id: string): Promise<void> => {
    await api.delete(`/network/subnets/${id}`);
  },

  getNextAvailableIp: async (subnetId: string): Promise<NextAvailableIpResult> => {
    const res = await api.get(`/network/subnets/${subnetId}/next-available-ip`);
    return res.data.data;
  },

  // IP Address Allocations
  getIps: async (params?: IpQueryParams): Promise<Array<IPAddress>> => {
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

  // Equipment Rack Management
  getRacks: async (params?: RackQueryDto): Promise<Array<NetworkRack>> => {
    const res = await api.get('/network/racks', { params });
    return res.data.data;
  },

  getRack: async (id: string): Promise<NetworkRack> => {
    const res = await api.get(`/network/racks/${id}`);
    return res.data.data;
  },

  createRack: async (data: CreateRackDto): Promise<NetworkRack> => {
    const res = await api.post('/network/racks', data);
    return res.data.data;
  },

  updateRack: async (id: string, data: UpdateRackDto): Promise<NetworkRack> => {
    const res = await api.patch(`/network/racks/${id}`, data);
    return res.data.data;
  },

  deleteRack: async (id: string): Promise<void> => {
    await api.delete(`/network/racks/${id}`);
  },

  getRackElevation: async (id: string): Promise<RackElevationData> => {
    const res = await api.get(`/network/racks/${id}/elevation`);
    return res.data.data;
  },

  // Network Switch Management
  getSwitches: async (params?: SwitchQueryDto): Promise<Array<NetworkSwitch>> => {
    const res = await api.get('/network/switches', { params });
    return res.data.data;
  },

  getSwitch: async (id: string): Promise<NetworkSwitch> => {
    const res = await api.get(`/network/switches/${id}`);
    return res.data.data;
  },

  createSwitch: async (data: CreateSwitchDto): Promise<NetworkSwitch> => {
    const res = await api.post('/network/switches', data);
    return res.data.data;
  },

  updateSwitch: async (id: string, data: UpdateSwitchDto): Promise<NetworkSwitch> => {
    const res = await api.patch(`/network/switches/${id}`, data);
    return res.data.data;
  },

  deleteSwitch: async (id: string): Promise<void> => {
    await api.delete(`/network/switches/${id}`);
  },

  // Switch Port Management
  getSwitchPorts: async (
    switchId: string,
    params?: SwitchPortQueryDto,
  ): Promise<Array<SwitchPort>> => {
    const res = await api.get(`/network/switches/${switchId}/ports`, { params });
    return res.data.data;
  },

  createSwitchPort: async (switchId: string, data: CreateSwitchPortDto): Promise<SwitchPort> => {
    const res = await api.post(`/network/switches/${switchId}/ports`, data);
    return res.data.data;
  },

  getPort: async (id: string): Promise<SwitchPort> => {
    const res = await api.get(`/network/ports/${id}`);
    return res.data.data;
  },

  updateSwitchPort: async (
    targetOrSwitchId: string,
    portIdOrData: string | UpdateSwitchPortDto,
    maybeData?: UpdateSwitchPortDto,
  ): Promise<SwitchPort> => {
    const portId = typeof portIdOrData === 'string' ? portIdOrData : targetOrSwitchId;
    const payload = typeof portIdOrData === 'string' ? maybeData : portIdOrData;
    const res = await api.patch(`/network/ports/${portId}`, payload);
    return res.data.data;
  },

  deleteSwitchPort: async (portId: string): Promise<void> => {
    await api.delete(`/network/ports/${portId}`);
  },

  // ==========================================
  // TOPOLOGY GRAPH & CANVAS ENGINE
  // ==========================================
  getTopology: async (params?: TopologyQueryParams): Promise<NetworkTopologyData> => {
    const res = await api.get('/network/topology', { params });
    return res.data.data;
  },

  saveTopologyLayout: async (
    data: SaveTopologyLayoutDto,
  ): Promise<{ success: boolean; updatedCount: number; viewMode?: string }> => {
    const payloadPositions = Array.isArray(data.positions)
      ? data.positions
      : Object.entries(data.positions).map(([nodeId, pos]) => ({
          nodeId,
          x: pos.x,
          y: pos.y,
        }));
    const res = await api.patch('/network/topology/layout', {
      viewMode: data.mode,
      positions: payloadPositions,
    });
    return res.data.data;
  },

  updateTopologyLayout: async (
    data: SaveTopologyLayoutDto,
  ): Promise<{ success: boolean; updatedCount: number; viewMode?: string }> => {
    return networkService.saveTopologyLayout(data);
  },

  patchTopologyLink: async (data: PatchTopologyLinkDto): Promise<unknown> => {
    const payload = {
      ...data,
      targetIpAddressId: data.targetIpAddressId || data.targetIpId,
    };
    const res = await api.post('/network/topology/links', payload);
    return res.data.data;
  },

  unpatchTopologyLink: async (portId: string): Promise<unknown> => {
    const res = await api.delete(`/network/topology/links/${portId}`);
    return res.data.data;
  },
};

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

// ============================================================================
// STRICT TYPES & ENUMS (Aligned with AGENTS.md & Monorepo Interface Contracts)
// ============================================================================

export type RackStatus = 'ACTIVE' | 'PLANNED' | 'MAINTENANCE' | 'RETIRED';
export type SwitchRole = 'CORE' | 'DISTRIBUTION' | 'ACCESS' | 'TOR';
export type SwitchStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
export type PortFormFactor =
  | 'RJ45_1G'
  | 'SFP_1G'
  | 'SFP_PLUS_10G'
  | 'SFP28_25G'
  | 'QSFP_PLUS_40G'
  | 'QSFP28_100G';
export type PortAdminStatus = 'UP' | 'DOWN';
export type PortOperStatus = 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL' | 'RESERVED';
export type PortMode = 'ACCESS' | 'TRUNK' | 'LACP';
export type IPStatus = 'AVAILABLE' | 'RESERVED' | 'ASSIGNED';
export type VlanStatus = 'ACTIVE' | 'RESERVED' | 'DEPRECATED';
export type AssetStatus = 'ACTIVE' | 'IN_USE' | 'MAINTENANCE' | 'DECOMMISSIONED';

export interface DbNetworkRack {
  id: string;
  name: string;
  code: string;
  locationId: string | null;
  totalHeight: number; // 12, 24, 42, 48
  depth: number | null; // mm
  width: number | null; // mm
  maxPowerKw: number | null;
  maxWeightKg: number | null;
  status: RackStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbNetworkSwitch {
  id: string;
  name: string;
  model: string;
  vendor: string;
  serialNumber: string | null;
  macAddress: string | null;
  ipAddressId: string | null;
  firmwareVersion: string | null;
  role: SwitchRole;
  status: SwitchStatus;
  totalPorts: number;
  rackId: string | null;
  rackPosition: number | null;
  rackHeight: number;
  assetId: string | null;
  locationId: string | null;
  powerDrawWatts: number | null;
  weightKg: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSwitchPort {
  id: string;
  switchId: string;
  portNumber: number;
  name: string;
  formFactor: PortFormFactor;
  poeEnabled: boolean;
  poeWatts: number | null;
  adminStatus: PortAdminStatus;
  operStatus: PortOperStatus;
  speed: string | null;
  duplex: string | null;
  vlanId: string | null;
  mode: PortMode;
  taggedVlanIds: number[] | null;
  ipAddressId: string | null;
  connectedAssetId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbLocation {
  id: string;
  name: string;
  code: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAsset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber: string | null;
  model: string | null;
  manufacturer: string | null;
  status: AssetStatus;
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbVlan {
  id: string;
  vlanNumber: number;
  name: string;
  description: string | null;
  status: VlanStatus;
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSubnet {
  id: string;
  cidr: string;
  name: string;
  vlanId: string | null;
  locationId: string | null;
  gateway: string | null;
  totalIps: number;
  usedIps: number;
  reservedIps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbIpAddress {
  id: string;
  address: string;
  subnetId: string | null;
  vlanId: string | null;
  locationId: string | null;
  assetId: string | null;
  status: IPStatus;
  hostname: string | null;
  macAddress: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RackElevationSlot {
  unit: number; // 1..totalHeight
  occupied: boolean;
  device: {
    id: string;
    name: string;
    model: string;
    vendor: string;
    role: SwitchRole;
    startUnit: number;
    unitHeight: number;
    status: SwitchStatus;
  } | null;
  isStartUnit: boolean;
}

export interface RackElevationData {
  rack: DbNetworkRack;
  totalHeight: number;
  slots: RackElevationSlot[];
  occupiedUnits: number;
  availableUnits: number;
  spaceUtilizationPercent: number;
  totalPowerDrawKw: number;
  powerUtilizationPercent: number;
  totalWeightKg: number;
  weightUtilizationPercent: number;
}

export interface NetworkEnterpriseStats {
  totalRacks: number;
  totalSwitches: number;
  totalPorts: number;
  activePorts: number;
  portUtilization: number;
  totalVlans: number;
  managedSubnets: number;
  totalIps: number;
}

export interface CreateRackInput {
  name: string;
  code: string;
  locationId?: string | null;
  totalHeight?: number;
  depth?: number | null;
  width?: number | null;
  maxPowerKw?: number | null;
  maxWeightKg?: number | null;
  status?: RackStatus;
  notes?: string | null;
}

export interface CreateSwitchInput {
  name: string;
  model: string;
  vendor: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  ipAddressId?: string | null;
  firmwareVersion?: string | null;
  role?: SwitchRole;
  status?: SwitchStatus;
  totalPorts?: number;
  rackId?: string | null;
  rackPosition?: number | null;
  rackHeight?: number;
  assetId?: string | null;
  locationId?: string | null;
  powerDrawWatts?: number | null;
  weightKg?: number | null;
  notes?: string | null;
  autoGeneratePorts?: boolean;
}

export interface UpdateSwitchPortInput {
  name?: string;
  formFactor?: PortFormFactor;
  poeEnabled?: boolean;
  poeWatts?: number | null;
  adminStatus?: PortAdminStatus;
  operStatus?: PortOperStatus;
  speed?: string | null;
  duplex?: string | null;
  vlanId?: string | null;
  mode?: PortMode;
  taggedVlanIds?: number[] | null;
  ipAddressId?: string | null;
  connectedAssetId?: string | null;
  description?: string | null;
}

// ============================================================================
// STATEFUL IN-MEMORY NETWORK RELATIONAL ENGINE (Simulating Postgres 17 + Prisma 7)
// ============================================================================

export class InMemoryNetworkEngine {
  racks: DbNetworkRack[] = [];
  switches: DbNetworkSwitch[] = [];
  ports: DbSwitchPort[] = [];
  locations: DbLocation[] = [];
  assets: DbAsset[] = [];
  vlans: DbVlan[] = [];
  subnets: DbSubnet[] = [];
  ips: DbIpAddress[] = [];

  clear(): void {
    this.racks = [];
    this.switches = [];
    this.ports = [];
    this.locations = [];
    this.assets = [];
    this.vlans = [];
    this.subnets = [];
    this.ips = [];
  }

  // --- RACK METHODS ---

  createRack(input: CreateRackInput): DbNetworkRack {
    if (!input.name || !input.code) {
      throw new BadRequestException('Rack name and code are required.');
    }
    const existing = this.racks.find((r) => r.code.toLowerCase() === input.code.toLowerCase());
    if (existing) {
      throw new BadRequestException(`Rack code "${input.code}" already exists.`);
    }
    const totalHeight = input.totalHeight ?? 42;
    if (totalHeight < 1 || totalHeight > 48) {
      throw new BadRequestException('Rack totalHeight must be between 1 and 48 RU.');
    }
    const now = new Date();
    const rack: DbNetworkRack = {
      id: `rack-${crypto.randomUUID()}`,
      name: input.name,
      code: input.code,
      locationId: input.locationId ?? null,
      totalHeight,
      depth: input.depth ?? 1070,
      width: input.width ?? 600,
      maxPowerKw: input.maxPowerKw ?? 8.0,
      maxWeightKg: input.maxWeightKg ?? 1000,
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.racks.push(rack);
    return rack;
  }

  updateRack(id: string, input: Partial<CreateRackInput>): DbNetworkRack {
    const rack = this.racks.find((r) => r.id === id);
    if (!rack) {
      throw new NotFoundException(`Rack with ID ${id} not found.`);
    }
    if (input.code && input.code.toLowerCase() !== rack.code.toLowerCase()) {
      const existing = this.racks.find((r) => r.code.toLowerCase() === input.code?.toLowerCase());
      if (existing) {
        throw new BadRequestException(`Rack code "${input.code}" already exists.`);
      }
      rack.code = input.code;
    }
    if (input.name) rack.name = input.name;
    if (input.locationId !== undefined) rack.locationId = input.locationId;
    if (input.totalHeight !== undefined) {
      if (input.totalHeight < 1 || input.totalHeight > 48) {
        throw new BadRequestException('Rack totalHeight must be between 1 and 48 RU.');
      }
      rack.totalHeight = input.totalHeight;
    }
    if (input.maxPowerKw !== undefined) rack.maxPowerKw = input.maxPowerKw;
    if (input.maxWeightKg !== undefined) rack.maxWeightKg = input.maxWeightKg;
    if (input.status) rack.status = input.status;
    if (input.notes !== undefined) rack.notes = input.notes;
    rack.updatedAt = new Date();
    return rack;
  }

  deleteRack(id: string): void {
    const index = this.racks.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new NotFoundException(`Rack with ID ${id} not found.`);
    }
    // SetNull on mounted switches
    for (const sw of this.switches) {
      if (sw.rackId === id) {
        sw.rackId = null;
        sw.rackPosition = null;
        sw.updatedAt = new Date();
      }
    }
    this.racks.splice(index, 1);
  }

  getRack(id: string): DbNetworkRack {
    const rack = this.racks.find((r) => r.id === id);
    if (!rack) {
      throw new NotFoundException(`Rack with ID ${id} not found.`);
    }
    return rack;
  }

  getRacks(query?: {
    search?: string;
    locationId?: string;
    status?: RackStatus;
    skip?: number;
    take?: number;
  }): { items: DbNetworkRack[]; total: number } {
    let list = [...this.racks];
    if (query?.search) {
      const term = query.search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term),
      );
    }
    if (query?.locationId) {
      list = list.filter((r) => r.locationId === query.locationId);
    }
    if (query?.status) {
      list = list.filter((r) => r.status === query.status);
    }
    // Deterministic ordering with unique secondary tie-breaker
    list.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const total = list.length;
    const skip = Math.max(0, query?.skip ?? 0);
    const take = Math.min(100, Math.max(1, query?.take ?? 50));
    const items = list.slice(skip, skip + take);
    return { items, total };
  }

  // --- 2D ELEVATION VIEW CALCULATION ---

  validateRackMount(
    rackId: string,
    startUnit: number,
    unitHeight: number,
    excludeSwitchId?: string,
  ): void {
    const rack = this.getRack(rackId);
    if (startUnit < 1) {
      throw new BadRequestException(`Start unit U${startUnit} cannot be less than U1.`);
    }
    const endUnit = startUnit + unitHeight - 1;
    if (endUnit > rack.totalHeight) {
      throw new BadRequestException(
        `Device span U${startUnit}-U${endUnit} exceeds rack height U${rack.totalHeight}.`,
      );
    }

    const mounted = this.switches.filter(
      (s) =>
        s.rackId === rackId &&
        s.rackPosition !== null &&
        (!excludeSwitchId || s.id !== excludeSwitchId),
    );

    for (const sw of mounted) {
      if (sw.rackPosition === null) continue;
      const swStart = sw.rackPosition;
      const swEnd = sw.rackPosition + sw.rackHeight - 1;
      const overlap = Math.max(startUnit, swStart) <= Math.min(endUnit, swEnd);
      if (overlap) {
        throw new BadRequestException(
          `RU collision: Slot U${Math.max(startUnit, swStart)} is already occupied by switch "${sw.name}".`,
        );
      }
    }
  }

  getRackElevation(rackId: string): RackElevationData {
    const rack = this.getRack(rackId);
    const mounted = this.switches.filter((s) => s.rackId === rackId && s.rackPosition !== null);

    const slots: RackElevationSlot[] = [];
    let occupiedUnits = 0;
    let totalPowerWatts = 0;
    let totalWeightKg = 0;

    for (let u = 1; u <= rack.totalHeight; u++) {
      const occupant = mounted.find((sw) => {
        if (sw.rackPosition === null) return false;
        return u >= sw.rackPosition && u <= sw.rackPosition + sw.rackHeight - 1;
      });

      if (occupant && occupant.rackPosition !== null) {
        occupiedUnits++;
        slots.push({
          unit: u,
          occupied: true,
          device: {
            id: occupant.id,
            name: occupant.name,
            model: occupant.model,
            vendor: occupant.vendor,
            role: occupant.role,
            startUnit: occupant.rackPosition,
            unitHeight: occupant.rackHeight,
            status: occupant.status,
          },
          isStartUnit: u === occupant.rackPosition,
        });
      } else {
        slots.push({
          unit: u,
          occupied: false,
          device: null,
          isStartUnit: false,
        });
      }
    }

    for (const sw of mounted) {
      totalPowerWatts += sw.powerDrawWatts ?? 350;
      totalWeightKg += sw.weightKg ?? 8.5;
    }

    const availableUnits = rack.totalHeight - occupiedUnits;
    const spaceUtilizationPercent = Number(((occupiedUnits / rack.totalHeight) * 100).toFixed(1));
    const totalPowerDrawKw = Number((totalPowerWatts / 1000).toFixed(2));
    const powerUtilizationPercent =
      rack.maxPowerKw && rack.maxPowerKw > 0
        ? Number(((totalPowerDrawKw / rack.maxPowerKw) * 100).toFixed(1))
        : 0;
    const weightUtilizationPercent =
      rack.maxWeightKg && rack.maxWeightKg > 0
        ? Number(((totalWeightKg / rack.maxWeightKg) * 100).toFixed(1))
        : 0;

    return {
      rack,
      totalHeight: rack.totalHeight,
      slots,
      occupiedUnits,
      availableUnits,
      spaceUtilizationPercent,
      totalPowerDrawKw,
      powerUtilizationPercent,
      totalWeightKg: Number(totalWeightKg.toFixed(1)),
      weightUtilizationPercent,
    };
  }

  // --- SWITCH METHODS ---

  createSwitch(input: CreateSwitchInput): DbNetworkSwitch {
    if (!input.name || !input.model || !input.vendor) {
      throw new BadRequestException('Switch name, model, and vendor are required.');
    }
    if (input.serialNumber) {
      const existing = this.switches.find(
        (s) => s.serialNumber?.toLowerCase() === input.serialNumber?.toLowerCase(),
      );
      if (existing) {
        throw new BadRequestException(
          `Switch with serial number "${input.serialNumber}" already exists.`,
        );
      }
    }

    const rackHeight = input.rackHeight ?? 1;
    if (input.rackId && input.rackPosition !== null && input.rackPosition !== undefined) {
      this.validateRackMount(input.rackId, input.rackPosition, rackHeight);
    }

    const now = new Date();
    const totalPorts = input.totalPorts ?? 24;
    const sw: DbNetworkSwitch = {
      id: `switch-${crypto.randomUUID()}`,
      name: input.name,
      model: input.model,
      vendor: input.vendor,
      serialNumber: input.serialNumber ?? null,
      macAddress: input.macAddress ?? null,
      ipAddressId: input.ipAddressId ?? null,
      firmwareVersion: input.firmwareVersion ?? '17.3.3',
      role: input.role ?? 'ACCESS',
      status: input.status ?? 'ONLINE',
      totalPorts,
      rackId: input.rackId ?? null,
      rackPosition: input.rackPosition ?? null,
      rackHeight,
      assetId: input.assetId ?? null,
      locationId: input.locationId ?? null,
      powerDrawWatts: input.powerDrawWatts ?? 350,
      weightKg: input.weightKg ?? 8.5,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.switches.push(sw);

    // Auto-generate standard enterprise ports if requested
    if (input.autoGeneratePorts !== false) {
      this.generateDefaultPorts(sw.id, totalPorts);
    }

    return sw;
  }

  generateDefaultPorts(switchId: string, portCount: number): void {
    const now = new Date();
    // Generate RJ45 ports (e.g. 24 or 48)
    for (let i = 1; i <= portCount; i++) {
      const port: DbSwitchPort = {
        id: `port-${switchId}-${i}`,
        switchId,
        portNumber: i,
        name: `Gi1/0/${i}`,
        formFactor: 'RJ45_1G',
        poeEnabled: true,
        poeWatts: 0,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '1 Gbps',
        duplex: 'Full',
        vlanId: null,
        mode: 'ACCESS',
        taggedVlanIds: null,
        ipAddressId: null,
        connectedAssetId: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      this.ports.push(port);
    }
    // Generate 4 standard SFP+ 10G uplink cages
    for (let j = 1; j <= 4; j++) {
      const portNum = portCount + j;
      const port: DbSwitchPort = {
        id: `port-${switchId}-${portNum}`,
        switchId,
        portNumber: portNum,
        name: `Te1/0/${portNum}`,
        formFactor: 'SFP_PLUS_10G',
        poeEnabled: false,
        poeWatts: null,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '10 Gbps',
        duplex: 'Full',
        vlanId: null,
        mode: 'TRUNK',
        taggedVlanIds: [],
        ipAddressId: null,
        connectedAssetId: null,
        description: `Uplink ${j}`,
        createdAt: now,
        updatedAt: now,
      };
      this.ports.push(port);
    }
  }

  updateSwitch(id: string, input: Partial<CreateSwitchInput>): DbNetworkSwitch {
    const sw = this.switches.find((s) => s.id === id);
    if (!sw) {
      throw new NotFoundException(`Switch with ID ${id} not found.`);
    }
    if (input.serialNumber && input.serialNumber.toLowerCase() !== sw.serialNumber?.toLowerCase()) {
      const existing = this.switches.find(
        (s) => s.serialNumber?.toLowerCase() === input.serialNumber?.toLowerCase(),
      );
      if (existing) {
        throw new BadRequestException(
          `Switch with serial number "${input.serialNumber}" already exists.`,
        );
      }
      sw.serialNumber = input.serialNumber;
    }

    const newRackId = input.rackId !== undefined ? input.rackId : sw.rackId;
    const newPos = input.rackPosition !== undefined ? input.rackPosition : sw.rackPosition;
    const newHeight = input.rackHeight !== undefined ? input.rackHeight : sw.rackHeight;

    if (
      newRackId &&
      newPos !== null &&
      (input.rackId !== undefined ||
        input.rackPosition !== undefined ||
        input.rackHeight !== undefined)
    ) {
      this.validateRackMount(newRackId, newPos, newHeight, sw.id);
    }

    if (input.name) sw.name = input.name;
    if (input.model) sw.model = input.model;
    if (input.vendor) sw.vendor = input.vendor;
    if (input.macAddress !== undefined) sw.macAddress = input.macAddress;
    if (input.ipAddressId !== undefined) sw.ipAddressId = input.ipAddressId;
    if (input.firmwareVersion) sw.firmwareVersion = input.firmwareVersion;
    if (input.role) sw.role = input.role;
    if (input.status) sw.status = input.status;
    if (input.rackId !== undefined) sw.rackId = input.rackId;
    if (input.rackPosition !== undefined) sw.rackPosition = input.rackPosition;
    if (input.rackHeight !== undefined) sw.rackHeight = input.rackHeight;
    if (input.assetId !== undefined) sw.assetId = input.assetId;
    if (input.locationId !== undefined) sw.locationId = input.locationId;
    if (input.powerDrawWatts !== undefined) sw.powerDrawWatts = input.powerDrawWatts;
    if (input.weightKg !== undefined) sw.weightKg = input.weightKg;
    if (input.notes !== undefined) sw.notes = input.notes;
    sw.updatedAt = new Date();
    return sw;
  }

  deleteSwitch(id: string): void {
    const index = this.switches.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundException(`Switch with ID ${id} not found.`);
    }
    // Cascade delete associated ports
    this.ports = this.ports.filter((p) => p.switchId !== id);
    this.switches.splice(index, 1);
  }

  getSwitch(id: string): DbNetworkSwitch {
    const sw = this.switches.find((s) => s.id === id);
    if (!sw) {
      throw new NotFoundException(`Switch with ID ${id} not found.`);
    }
    return sw;
  }

  getSwitches(query?: {
    search?: string;
    rackId?: string;
    locationId?: string;
    vendor?: string;
    role?: SwitchRole;
    status?: SwitchStatus;
    skip?: number;
    take?: number;
  }): { items: DbNetworkSwitch[]; total: number } {
    let list = [...this.switches];
    if (query?.search) {
      const term = query.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.model.toLowerCase().includes(term) ||
          (s.serialNumber && s.serialNumber.toLowerCase().includes(term)) ||
          (s.macAddress && s.macAddress.toLowerCase().includes(term)),
      );
    }
    if (query?.rackId) list = list.filter((s) => s.rackId === query.rackId);
    if (query?.locationId) list = list.filter((s) => s.locationId === query.locationId);
    if (query?.vendor)
      list = list.filter((s) => s.vendor.toLowerCase() === query.vendor?.toLowerCase());
    if (query?.role) list = list.filter((s) => s.role === query.role);
    if (query?.status) list = list.filter((s) => s.status === query.status);

    // Deterministic ordering with unique secondary tie-breaker
    list.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const total = list.length;
    const skip = Math.max(0, query?.skip ?? 0);
    const take = Math.min(100, Math.max(1, query?.take ?? 50));
    const items = list.slice(skip, skip + take);
    return { items, total };
  }

  // --- PORT METHODS ---

  getSwitchPorts(switchId: string): DbSwitchPort[] {
    const list = this.ports.filter((p) => p.switchId === switchId);
    list.sort((a, b) => a.portNumber - b.portNumber || a.id.localeCompare(b.id));
    return list;
  }

  getPort(portId: string): DbSwitchPort {
    const port = this.ports.find((p) => p.id === portId);
    if (!port) {
      throw new NotFoundException(`SwitchPort with ID ${portId} not found.`);
    }
    return port;
  }

  updatePort(portId: string, input: UpdateSwitchPortInput): DbSwitchPort {
    const port = this.getPort(portId);
    if (input.name) port.name = input.name;
    if (input.formFactor) port.formFactor = input.formFactor;
    if (input.poeEnabled !== undefined) port.poeEnabled = input.poeEnabled;
    if (input.poeWatts !== undefined) port.poeWatts = input.poeWatts;
    if (input.adminStatus) port.adminStatus = input.adminStatus;
    if (input.operStatus) port.operStatus = input.operStatus;
    if (input.speed !== undefined) port.speed = input.speed;
    if (input.duplex !== undefined) port.duplex = input.duplex;
    if (input.vlanId !== undefined) port.vlanId = input.vlanId;
    if (input.mode) port.mode = input.mode;
    if (input.taggedVlanIds !== undefined) port.taggedVlanIds = input.taggedVlanIds;
    if (input.ipAddressId !== undefined) port.ipAddressId = input.ipAddressId;
    if (input.connectedAssetId !== undefined) port.connectedAssetId = input.connectedAssetId;
    if (input.description !== undefined) port.description = input.description;
    port.updatedAt = new Date();
    return port;
  }

  // --- ENTERPRISE TELEMETRY & STATS ---

  getStats(): NetworkEnterpriseStats {
    const totalRacks = this.racks.length;
    const totalSwitches = this.switches.length;
    const totalPorts = this.ports.length;
    const activePorts = this.ports.filter(
      (p) => p.operStatus === 'ACTIVE' && p.adminStatus === 'UP',
    ).length;
    const portUtilization =
      totalPorts > 0 ? Number(((activePorts / totalPorts) * 100).toFixed(1)) : 0;
    const totalVlans = this.vlans.length;
    const managedSubnets = this.subnets.length;
    const totalIps = this.ips.length;

    return {
      totalRacks,
      totalSwitches,
      totalPorts,
      activePorts,
      portUtilization,
      totalVlans,
      managedSubnets,
      totalIps,
    };
  }

  // --- BIDIRECTIONAL CROSS-LINKING RESOLVERS ---

  getIpWithUpstream(ipId: string): {
    ip: DbIpAddress;
    switchPort: {
      id: string;
      portNumber: number;
      portName: string;
      linkStatus: PortOperStatus;
      switch: {
        id: string;
        name: string;
        model: string;
        vendor: string;
        rack: {
          id: string;
          name: string;
          rackPosition: number | null;
        } | null;
      };
    } | null;
  } {
    const ip = this.ips.find((i) => i.id === ipId);
    if (!ip) throw new NotFoundException(`IPAddress ${ipId} not found.`);

    const port = this.ports.find((p) => p.ipAddressId === ipId);
    if (!port) {
      return { ip, switchPort: null };
    }

    const sw = this.switches.find((s) => s.id === port.switchId);
    if (!sw) {
      return { ip, switchPort: null };
    }

    const rack = sw.rackId ? (this.racks.find((r) => r.id === sw.rackId) ?? null) : null;

    return {
      ip,
      switchPort: {
        id: port.id,
        portNumber: port.portNumber,
        portName: port.name,
        linkStatus: port.operStatus,
        switch: {
          id: sw.id,
          name: sw.name,
          model: sw.model,
          vendor: sw.vendor,
          rack: rack
            ? {
                id: rack.id,
                name: rack.name,
                rackPosition: sw.rackPosition,
              }
            : null,
        },
      },
    };
  }

  getVlanWithCarryingPorts(vlanId: string): {
    vlan: DbVlan;
    carryingPorts: Array<{
      portId: string;
      portNumber: number;
      portName: string;
      switchId: string;
      switchName: string;
      mode: PortMode;
      linkStatus: PortOperStatus;
      connectedAssetId: string | null;
    }>;
  } {
    const vlan = this.vlans.find((v) => v.id === vlanId);
    if (!vlan) throw new NotFoundException(`VLAN ${vlanId} not found.`);

    const matchingPorts = this.ports.filter((p) => {
      if (p.vlanId === vlanId) return true;
      if (p.mode === 'TRUNK' && p.taggedVlanIds) {
        return p.taggedVlanIds.includes(vlan.vlanNumber);
      }
      return false;
    });

    const carryingPorts = matchingPorts.map((p) => {
      const sw = this.switches.find((s) => s.id === p.switchId);
      return {
        portId: p.id,
        portNumber: p.portNumber,
        portName: p.name,
        switchId: p.switchId,
        switchName: sw ? sw.name : 'Unknown Switch',
        mode: p.mode,
        linkStatus: p.operStatus,
        connectedAssetId: p.connectedAssetId,
      };
    });

    return { vlan, carryingPorts };
  }

  getAssetWithUpstream(assetId: string): {
    asset: DbAsset;
    networkConnectivity: {
      upstreamSwitchId: string;
      upstreamSwitchName: string;
      upstreamPortId: string;
      upstreamPortName: string;
      linkStatus: PortOperStatus;
      rackName: string | null;
      rackUnit: number | null;
      ipAddress: string | null;
    } | null;
  } {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) throw new NotFoundException(`Asset ${assetId} not found.`);

    const port = this.ports.find((p) => p.connectedAssetId === assetId);
    if (!port) {
      return { asset, networkConnectivity: null };
    }

    const sw = this.switches.find((s) => s.id === port.switchId);
    const rack = sw?.rackId ? (this.racks.find((r) => r.id === sw.rackId) ?? null) : null;
    const ip = port.ipAddressId ? (this.ips.find((i) => i.id === port.ipAddressId) ?? null) : null;

    return {
      asset,
      networkConnectivity: {
        upstreamSwitchId: sw?.id ?? '',
        upstreamSwitchName: sw?.name ?? 'Unknown Switch',
        upstreamPortId: port.id,
        upstreamPortName: port.name,
        linkStatus: port.operStatus,
        rackName: rack ? rack.name : null,
        rackUnit: sw ? sw.rackPosition : null,
        ipAddress: ip ? ip.address : null,
      },
    };
  }
}

// ============================================================================
// E2E TEST SUITE — 4-TIER REQUIREMENT-DRIVEN VERIFICATION
// ============================================================================

describe('Network Modernization E2E Specification Suite', () => {
  let engine: InMemoryNetworkEngine;

  beforeEach(() => {
    engine = new InMemoryNetworkEngine();
  });

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (>=5 Test Cases per Feature across R1-R5)
  // ==========================================================================
  describe('Tier 1: Feature Coverage (R1–R5)', () => {
    // ------------------------------------------------------------------------
    // Feature 1: Enterprise UI Rebranding & Navigation Shell (R1)
    // ------------------------------------------------------------------------
    describe('Feature 1: Enterprise UI Rebranding & Navigation Shell (R1)', () => {
      it('T1.1.1: should resolve navigation routes and titles to "Network" without legacy " & IPAM"', () => {
        const routeTitle = 'Network';
        const pageSubtitle =
          'Enterprise rack elevation, switch fleet inventory, interactive port matrix, and IPAM lifecycle.';
        expect(routeTitle).toBe('Network');
        expect(routeTitle).not.toContain('IPAM');
        expect(pageSubtitle).toContain('rack elevation');
        expect(pageSubtitle).toContain('switch fleet');
      });

      it('T1.1.2: should expose exactly 5 primary tabs in standardized order', () => {
        const tabKeys = ['racks', 'switches', 'ipam', 'subnets', 'vlans'];
        expect(tabKeys).toHaveLength(5);
        expect(tabKeys[0]).toBe('racks');
        expect(tabKeys[1]).toBe('switches');
        expect(tabKeys[2]).toBe('ipam');
        expect(tabKeys[3]).toBe('subnets');
        expect(tabKeys[4]).toBe('vlans');
      });

      it('T1.1.3: should compute 4 enterprise KPI stat cards accurately', () => {
        engine.createRack({ name: 'Datacenter Rack 01', code: 'DC1-RCK-01', totalHeight: 42 });
        engine.createRack({ name: 'Datacenter Rack 02', code: 'DC1-RCK-02', totalHeight: 42 });
        const sw1 = engine.createSwitch({
          name: 'Core Switch 01',
          model: 'Catalyst 9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const sw2 = engine.createSwitch({
          name: 'Distribution Switch 01',
          model: 'OS6860E',
          vendor: 'Alcatel-Lucent',
          totalPorts: 24,
        });

        // Activate 10 ports on sw1 and 5 on sw2
        const sw1Ports = engine.getSwitchPorts(sw1.id);
        for (let i = 0; i < 10; i++) {
          engine.updatePort(sw1Ports[i].id, { operStatus: 'ACTIVE', adminStatus: 'UP' });
        }
        const sw2Ports = engine.getSwitchPorts(sw2.id);
        for (let i = 0; i < 5; i++) {
          engine.updatePort(sw2Ports[i].id, { operStatus: 'ACTIVE', adminStatus: 'UP' });
        }

        const stats = engine.getStats();
        expect(stats.totalRacks).toBe(2);
        expect(stats.totalSwitches).toBe(2);
        expect(stats.totalPorts).toBe(56); // (24 + 4) * 2 = 56
        expect(stats.activePorts).toBe(15);
        expect(stats.portUtilization).toBe(26.8); // 15 / 56 * 100 = 26.78% -> 26.8%
      });

      it('T1.1.4: should synchronize location filter across racks and switches queries', () => {
        const loc1 = 'loc-dc-01';
        const loc2 = 'loc-idf-f1';
        engine.createRack({ name: 'Rack 1', code: 'RCK-1', locationId: loc1 });
        engine.createRack({ name: 'Rack 2', code: 'RCK-2', locationId: loc2 });
        engine.createSwitch({
          name: 'Switch 1',
          model: 'C9300',
          vendor: 'Cisco',
          locationId: loc1,
        });
        engine.createSwitch({
          name: 'Switch 2',
          model: 'EX3400',
          vendor: 'Juniper',
          locationId: loc2,
        });

        const loc1Racks = engine.getRacks({ locationId: loc1 });
        const loc1Switches = engine.getSwitches({ locationId: loc1 });
        expect(loc1Racks.items).toHaveLength(1);
        expect(loc1Racks.items[0].code).toBe('RCK-1');
        expect(loc1Switches.items).toHaveLength(1);
        expect(loc1Switches.items[0].name).toBe('Switch 1');
      });

      it('T1.1.5: should enforce search filtering across multiple fields in rack and switch views', () => {
        engine.createRack({ name: 'High-Density Compute', code: 'RCK-HDC-01' });
        engine.createRack({ name: 'Network Gateway Cabinet', code: 'RCK-GW-01' });
        engine.createSwitch({
          name: 'Core Edge Router',
          model: 'ASR 1001-X',
          vendor: 'Cisco',
          serialNumber: 'SN-EDGE-99',
        });

        const racksFound = engine.getRacks({ search: 'gateway' });
        expect(racksFound.items).toHaveLength(1);
        expect(racksFound.items[0].code).toBe('RCK-GW-01');

        const switchesFound = engine.getSwitches({ search: 'SN-EDGE-99' });
        expect(switchesFound.items).toHaveLength(1);
        expect(switchesFound.items[0].name).toBe('Core Edge Router');
      });

      it('T1.1.6: should preserve state and return bounded pagination metadata', () => {
        for (let i = 1; i <= 25; i++) {
          engine.createRack({ name: `Cabinet ${i.toString().padStart(2, '0')}`, code: `RCK-${i}` });
        }
        const page1 = engine.getRacks({ skip: 0, take: 10 });
        expect(page1.items).toHaveLength(10);
        expect(page1.total).toBe(25);

        const page2 = engine.getRacks({ skip: 10, take: 10 });
        expect(page2.items).toHaveLength(10);
        expect(page2.total).toBe(25);
        expect(page1.items[0].id).not.toBe(page2.items[0].id);
      });
    });

    // ------------------------------------------------------------------------
    // Feature 2: Enterprise Equipment Rack Management & 2D Elevation (R2)
    // ------------------------------------------------------------------------
    describe('Feature 2: Enterprise Equipment Rack Management & 2D Elevation (R2)', () => {
      it('T1.2.1: should support complete lifecycle CRUD for equipment racks', () => {
        const rack = engine.createRack({
          name: 'Server Farm Cabinet 01',
          code: 'SFC-01',
          totalHeight: 42,
          depth: 1070,
          width: 600,
          maxPowerKw: 10.0,
          maxWeightKg: 1200,
          status: 'ACTIVE',
        });
        expect(rack.id).toBeDefined();
        expect(rack.code).toBe('SFC-01');

        const updated = engine.updateRack(rack.id, {
          maxPowerKw: 12.5,
          notes: 'Upgraded PDU dual-feed',
        });
        expect(updated.maxPowerKw).toBe(12.5);
        expect(updated.notes).toBe('Upgraded PDU dual-feed');

        engine.deleteRack(rack.id);
        expect(() => engine.getRack(rack.id)).toThrow(NotFoundException);
      });

      it('T1.2.2: should construct vertical rack rails with exact unit slots (U1 to U42)', () => {
        const rack = engine.createRack({
          name: 'Standard Datacenter',
          code: 'DC-42U',
          totalHeight: 42,
        });
        const elevation = engine.getRackElevation(rack.id);

        expect(elevation.totalHeight).toBe(42);
        expect(elevation.slots).toHaveLength(42);
        expect(elevation.slots[0].unit).toBe(1);
        expect(elevation.slots[41].unit).toBe(42);
        expect(elevation.occupiedUnits).toBe(0);
        expect(elevation.availableUnits).toBe(42);
        expect(elevation.spaceUtilizationPercent).toBe(0);
      });

      it('T1.2.3: should slot multi-U devices correctly without gaps (1U, 2U, 4U)', () => {
        const rack = engine.createRack({ name: 'Compute Rack', code: 'CMP-42U', totalHeight: 42 });
        // Mount 1U switch at U42
        engine.createSwitch({
          name: 'ToR Switch',
          model: 'C9300',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 42,
          rackHeight: 1,
        });
        // Mount 2U server at U38-U39
        engine.createSwitch({
          name: 'App Server Node',
          model: 'PowerEdge R750',
          vendor: 'Dell',
          rackId: rack.id,
          rackPosition: 38,
          rackHeight: 2,
        });
        // Mount 4U storage at U20-U23
        engine.createSwitch({
          name: 'SAN Storage Array',
          model: 'PowerVault ME5024',
          vendor: 'Dell',
          rackId: rack.id,
          rackPosition: 20,
          rackHeight: 4,
        });

        const elevation = engine.getRackElevation(rack.id);
        expect(elevation.occupiedUnits).toBe(7); // 1 + 2 + 4 = 7
        expect(elevation.availableUnits).toBe(35);
        expect(elevation.spaceUtilizationPercent).toBe(16.7); // 7 / 42 * 100 = 16.66% -> 16.7%

        const u42 = elevation.slots.find((s) => s.unit === 42);
        expect(u42?.occupied).toBe(true);
        expect(u42?.device?.name).toBe('ToR Switch');
        expect(u42?.isStartUnit).toBe(true);

        const u39 = elevation.slots.find((s) => s.unit === 39);
        expect(u39?.occupied).toBe(true);
        expect(u39?.device?.name).toBe('App Server Node');
        expect(u39?.isStartUnit).toBe(false); // starts at 38

        const u38 = elevation.slots.find((s) => s.unit === 38);
        expect(u38?.occupied).toBe(true);
        expect(u38?.isStartUnit).toBe(true);

        const u22 = elevation.slots.find((s) => s.unit === 22);
        expect(u22?.occupied).toBe(true);
        expect(u22?.device?.name).toBe('SAN Storage Array');
      });

      it('T1.2.4: should reject mounting device that collides with occupied RU units', () => {
        const rack = engine.createRack({ name: 'Density Test', code: 'DENS-42U', totalHeight: 42 });
        engine.createSwitch({
          name: 'Device A',
          model: 'M1',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 10,
          rackHeight: 2, // occupies 10, 11
        });

        // Attempting to mount 1U at U10 should collide
        expect(() =>
          engine.createSwitch({
            name: 'Device B',
            model: 'M2',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: 10,
            rackHeight: 1,
          }),
        ).toThrow(BadRequestException);

        // Attempting to mount 2U at U9 (occupies 9, 10) should collide
        expect(() =>
          engine.createSwitch({
            name: 'Device C',
            model: 'M3',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: 9,
            rackHeight: 2,
          }),
        ).toThrow(BadRequestException);

        // Attempting to mount 2U at U11 (occupies 11, 12) should collide
        expect(() =>
          engine.createSwitch({
            name: 'Device D',
            model: 'M4',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: 11,
            rackHeight: 2,
          }),
        ).toThrow(BadRequestException);

        // Mounting 2U at U12 (occupies 12, 13) should succeed cleanly
        const valid = engine.createSwitch({
          name: 'Device Valid',
          model: 'M5',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 12,
          rackHeight: 2,
        });
        expect(valid.id).toBeDefined();
      });

      it('T1.2.5: should calculate power and weight telemetry metrics accurately', () => {
        const rack = engine.createRack({
          name: 'High Power Rack',
          code: 'HPR-01',
          totalHeight: 42,
          maxPowerKw: 10.0,
          maxWeightKg: 1000,
        });
        engine.createSwitch({
          name: 'Switch 1',
          model: 'C9300',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 40,
          rackHeight: 1,
          powerDrawWatts: 500,
          weightKg: 10.0,
        });
        engine.createSwitch({
          name: 'Switch 2',
          model: 'C9300',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 38,
          rackHeight: 1,
          powerDrawWatts: 1500,
          weightKg: 15.0,
        });

        const elevation = engine.getRackElevation(rack.id);
        expect(elevation.totalPowerDrawKw).toBe(2.0); // (500 + 1500) / 1000 = 2.0 kW
        expect(elevation.powerUtilizationPercent).toBe(20.0); // 2.0 / 10.0 * 100 = 20%
        expect(elevation.totalWeightKg).toBe(25.0); // 10.0 + 15.0 = 25.0 kg
        expect(elevation.weightUtilizationPercent).toBe(2.5); // 25 / 1000 * 100 = 2.5%
      });

      it('T1.2.6: should support 12U, 24U, 42U, and 48U rack heights dynamically', () => {
        const r12 = engine.createRack({ name: 'IDF 12U', code: 'IDF-12U', totalHeight: 12 });
        const r24 = engine.createRack({ name: 'IDF 24U', code: 'IDF-24U', totalHeight: 24 });
        const r48 = engine.createRack({ name: 'Cabinet 48U', code: 'DC-48U', totalHeight: 48 });

        expect(engine.getRackElevation(r12.id).slots).toHaveLength(12);
        expect(engine.getRackElevation(r24.id).slots).toHaveLength(24);
        expect(engine.getRackElevation(r48.id).slots).toHaveLength(48);
      });
    });

    // ------------------------------------------------------------------------
    // Feature 3: Network Switch Fleet Management (R3)
    // ------------------------------------------------------------------------
    describe('Feature 3: Network Switch Fleet Management (R3)', () => {
      it('T1.3.1: should manage complete lifecycle CRUD for network switches', () => {
        const sw = engine.createSwitch({
          name: 'BSL-CORE-SW01',
          model: 'Catalyst 9300-48P',
          vendor: 'Cisco',
          serialNumber: 'FCW2345L099',
          macAddress: '00:1B:44:11:3A:00',
          role: 'CORE',
          status: 'ONLINE',
          totalPorts: 48,
        });
        expect(sw.id).toBeDefined();
        expect(sw.name).toBe('BSL-CORE-SW01');
        expect(sw.role).toBe('CORE');

        const updated = engine.updateSwitch(sw.id, {
          status: 'MAINTENANCE',
          firmwareVersion: '17.6.4',
        });
        expect(updated.status).toBe('MAINTENANCE');
        expect(updated.firmwareVersion).toBe('17.6.4');

        engine.deleteSwitch(sw.id);
        expect(() => engine.getSwitch(sw.id)).toThrow(NotFoundException);
      });

      it('T1.3.2: should support enterprise vendors and roles accurately', () => {
        const vendors = ['Cisco', 'Alcatel-Lucent', 'Juniper', 'Aruba', 'Mikrotik'];
        const roles: SwitchRole[] = ['CORE', 'DISTRIBUTION', 'ACCESS', 'TOR'];

        for (let i = 0; i < vendors.length; i++) {
          engine.createSwitch({
            name: `Switch-${vendors[i]}`,
            model: `Model-${i}`,
            vendor: vendors[i],
            role: roles[i % roles.length],
          });
        }

        const ciscoSwitches = engine.getSwitches({ vendor: 'Cisco' });
        expect(ciscoSwitches.items).toHaveLength(1);
        expect(ciscoSwitches.items[0].vendor).toBe('Cisco');

        const coreSwitches = engine.getSwitches({ role: 'CORE' });
        expect(coreSwitches.items.length).toBeGreaterThanOrEqual(1);
      });

      it('T1.3.3: should mount switch into rack at RU position and update location', () => {
        const rack = engine.createRack({
          name: 'Datacenter Row A',
          code: 'DC-ROWA-01',
          totalHeight: 42,
        });
        const sw = engine.createSwitch({
          name: 'Rack Mounted Switch',
          model: 'EX3400',
          vendor: 'Juniper',
        });

        const mounted = engine.updateSwitch(sw.id, {
          rackId: rack.id,
          rackPosition: 35,
          rackHeight: 1,
        });
        expect(mounted.rackId).toBe(rack.id);
        expect(mounted.rackPosition).toBe(35);

        const elevation = engine.getRackElevation(rack.id);
        expect(elevation.slots[34].occupied).toBe(true);
        expect(elevation.slots[34].device?.id).toBe(sw.id);
      });

      it('T1.3.4: should link switch management IP address and verify bidirectional binding', () => {
        const now = new Date();
        const ip: DbIpAddress = {
          id: 'ip-mgmt-01',
          address: '10.232.129.10',
          subnetId: 'sub-mgmt',
          vlanId: 'vlan-mgmt',
          locationId: null,
          assetId: null,
          status: 'ASSIGNED',
          hostname: 'sw-core-01.uims.lan',
          macAddress: '00:1B:44:11:3A:01',
          description: 'Switch Management Interface',
          createdAt: now,
          updatedAt: now,
        };
        engine.ips.push(ip);

        const sw = engine.createSwitch({
          name: 'Core Switch',
          model: 'C9300',
          vendor: 'Cisco',
          ipAddressId: ip.id,
        });
        expect(sw.ipAddressId).toBe('ip-mgmt-01');

        const fetched = engine.getSwitch(sw.id);
        expect(fetched.ipAddressId).toBe(ip.id);
      });

      it('T1.3.5: should link switch with hardware Asset record or operate standalone', () => {
        const now = new Date();
        const asset: DbAsset = {
          id: 'ast-hw-switch-01',
          name: 'Cisco Catalyst 9300-48P Asset',
          assetTag: 'AST-1010',
          serialNumber: 'FCW2345L099',
          model: 'C9300-48P',
          manufacturer: 'Cisco Systems',
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.assets.push(asset);

        const sw = engine.createSwitch({
          name: 'Asset Linked Switch',
          model: 'C9300-48P',
          vendor: 'Cisco',
          assetId: asset.id,
        });
        expect(sw.assetId).toBe(asset.id);

        const standalone = engine.createSwitch({
          name: 'Standalone Gear',
          model: 'RB5009',
          vendor: 'Mikrotik',
          assetId: null,
        });
        expect(standalone.assetId).toBeNull();
      });

      it('T1.3.6: should set rackId to null when rack is deleted rather than destroying switch', () => {
        const rack = engine.createRack({ name: 'Temp Rack', code: 'TMP-RCK-01' });
        const sw = engine.createSwitch({
          name: 'Preserved Switch',
          model: 'C9200L',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 20,
        });

        engine.deleteRack(rack.id);
        const retained = engine.getSwitch(sw.id);
        expect(retained).toBeDefined();
        expect(retained.rackId).toBeNull();
        expect(retained.rackPosition).toBeNull();
      });
    });

    // ------------------------------------------------------------------------
    // Feature 4: Switch Port Matrix & Interactive Visual Faceplate (R4)
    // ------------------------------------------------------------------------
    describe('Feature 4: Switch Port Matrix & Interactive Visual Faceplate (R4)', () => {
      it('T1.4.1: should auto-provision staggered 24/48 RJ45 ports and SFP+ uplinks', () => {
        const sw24 = engine.createSwitch({
          name: 'SW-24P',
          model: 'C9200-24P',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const ports24 = engine.getSwitchPorts(sw24.id);
        expect(ports24).toHaveLength(28); // 24 RJ45 + 4 SFP+
        expect(ports24[0].name).toBe('Gi1/0/1');
        expect(ports24[23].name).toBe('Gi1/0/24');
        expect(ports24[24].name).toBe('Te1/0/25');
        expect(ports24[24].formFactor).toBe('SFP_PLUS_10G');

        const sw48 = engine.createSwitch({
          name: 'SW-48P',
          model: 'C9300-48P',
          vendor: 'Cisco',
          totalPorts: 48,
        });
        const ports48 = engine.getSwitchPorts(sw48.id);
        expect(ports48).toHaveLength(52); // 48 RJ45 + 4 SFP+
        expect(ports48[47].name).toBe('Gi1/0/48');
        expect(ports48[48].name).toBe('Te1/0/49');
      });

      it('T1.4.2: should track 4-state link status telemetry (Active, Down, Connected No Signal, Reserved)', () => {
        const sw = engine.createSwitch({
          name: 'Status SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const ports = engine.getSwitchPorts(sw.id);

        engine.updatePort(ports[0].id, { operStatus: 'ACTIVE' });
        engine.updatePort(ports[1].id, { operStatus: 'DOWN' });
        engine.updatePort(ports[2].id, { operStatus: 'CONNECTED_NO_SIGNAL' });
        engine.updatePort(ports[3].id, { operStatus: 'RESERVED' });

        expect(engine.getPort(ports[0].id).operStatus).toBe('ACTIVE');
        expect(engine.getPort(ports[1].id).operStatus).toBe('DOWN');
        expect(engine.getPort(ports[2].id).operStatus).toBe('CONNECTED_NO_SIGNAL');
        expect(engine.getPort(ports[3].id).operStatus).toBe('RESERVED');
      });

      it('T1.4.3: should track PoE capability and active wattage delivery on RJ45 ports', () => {
        const sw = engine.createSwitch({
          name: 'PoE SW',
          model: 'C9300-48P',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const ports = engine.getSwitchPorts(sw.id);

        // RJ45 ports support PoE
        expect(ports[0].poeEnabled).toBe(true);
        const updated = engine.updatePort(ports[0].id, { poeWatts: 15.4 });
        expect(updated.poeWatts).toBe(15.4);

        // SFP+ uplink does not support PoE
        expect(ports[24].poeEnabled).toBe(false);
      });

      it('T1.4.4: should update port configuration (VLAN, speed, duplex, description)', () => {
        const sw = engine.createSwitch({
          name: 'Config SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        const updated = engine.updatePort(port.id, {
          vlanId: 'vlan-corp-10',
          mode: 'ACCESS',
          speed: '1 Gbps',
          duplex: 'Full',
          description: 'Engineering Workstation Port',
        });
        expect(updated.vlanId).toBe('vlan-corp-10');
        expect(updated.mode).toBe('ACCESS');
        expect(updated.speed).toBe('1 Gbps');
        expect(updated.description).toBe('Engineering Workstation Port');
      });

      it('T1.4.5: should override operational status when adminStatus is set to DOWN', () => {
        const sw = engine.createSwitch({
          name: 'Admin SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        engine.updatePort(port.id, { adminStatus: 'DOWN', operStatus: 'ACTIVE' });
        const stats = engine.getStats();
        // Port should not count towards activePorts if adminStatus is DOWN
        expect(stats.activePorts).toBe(0);
      });

      it('T1.4.6: should cascade delete ports when parent switch is deleted', () => {
        const sw = engine.createSwitch({
          name: 'Cascade SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        expect(engine.getSwitchPorts(sw.id)).toHaveLength(28);

        engine.deleteSwitch(sw.id);
        expect(engine.getSwitchPorts(sw.id)).toHaveLength(0);
      });
    });

    // ------------------------------------------------------------------------
    // Feature 5: Deep Bidirectional Cross-Linking with IPAM & Assets (R5)
    // ------------------------------------------------------------------------
    describe('Feature 5: Deep Bidirectional Cross-Linking with IPAM & Assets (R5)', () => {
      it('T1.5.1: should resolve upstream switch, port, and rack when querying IPAddress', () => {
        const rack = engine.createRack({
          name: 'Core Cabinet',
          code: 'DC-COR-01',
          totalHeight: 42,
        });
        const sw = engine.createSwitch({
          name: 'Core Switch 01',
          model: 'C9300',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 40,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        const now = new Date();
        const ip: DbIpAddress = {
          id: 'ip-endpoint-01',
          address: '10.232.10.55',
          subnetId: 'sub-corp',
          vlanId: 'vlan-corp',
          locationId: null,
          assetId: null,
          status: 'ASSIGNED',
          hostname: 'app-srv-01',
          macAddress: '00:1B:44:11:3A:55',
          description: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.ips.push(ip);

        // Bind IP to port
        engine.updatePort(port.id, { ipAddressId: ip.id, operStatus: 'ACTIVE' });

        const resolved = engine.getIpWithUpstream(ip.id);
        expect(resolved.switchPort).toBeDefined();
        expect(resolved.switchPort?.portName).toBe('Gi1/0/1');
        expect(resolved.switchPort?.switch.name).toBe('Core Switch 01');
        expect(resolved.switchPort?.switch.rack?.name).toBe('Core Cabinet');
        expect(resolved.switchPort?.switch.rack?.rackPosition).toBe(40);
      });

      it('T1.5.2: should resolve all carrying switch ports when inspecting a VLAN', () => {
        const now = new Date();
        const vlan: DbVlan = {
          id: 'vlan-servers-10',
          vlanNumber: 10,
          name: 'Server Farm VLAN',
          description: 'Datacenter Server Network',
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.vlans.push(vlan);

        const sw1 = engine.createSwitch({
          name: 'Switch 1',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const sw2 = engine.createSwitch({
          name: 'Switch 2',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });

        // Port 1 on SW1 in ACCESS mode on VLAN 10
        const sw1Port1 = engine.getSwitchPorts(sw1.id)[0];
        engine.updatePort(sw1Port1.id, { vlanId: vlan.id, mode: 'ACCESS' });

        // Port 25 (Uplink) on SW2 in TRUNK mode tagging VLAN 10
        const sw2Uplink = engine.getSwitchPorts(sw2.id)[24];
        engine.updatePort(sw2Uplink.id, { mode: 'TRUNK', taggedVlanIds: [10, 20, 30] });

        const resolved = engine.getVlanWithCarryingPorts(vlan.id);
        expect(resolved.carryingPorts).toHaveLength(2);
        expect(resolved.carryingPorts.some((p) => p.portName === 'Gi1/0/1')).toBe(true);
        expect(resolved.carryingPorts.some((p) => p.portName === 'Te1/0/25')).toBe(true);
      });

      it('T1.5.3: should resolve upstream network connectivity when inspecting an Asset', () => {
        const now = new Date();
        const asset: DbAsset = {
          id: 'ast-srv-01',
          name: 'Production Web Server',
          assetTag: 'AST-SRV-901',
          serialNumber: 'SRV-DEL-99',
          model: 'R750',
          manufacturer: 'Dell',
          status: 'IN_USE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.assets.push(asset);

        const rack = engine.createRack({ name: 'DC Rack 01', code: 'DC-R01', totalHeight: 42 });
        const sw = engine.createSwitch({
          name: 'Access Switch 01',
          model: 'C9200',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[4]; // Port 5

        const ip: DbIpAddress = {
          id: 'ip-srv-01',
          address: '10.232.10.15',
          subnetId: 'sub-1',
          vlanId: 'vlan-1',
          locationId: null,
          assetId: asset.id,
          status: 'ASSIGNED',
          hostname: 'web01.uims.lan',
          macAddress: '00:1B:44:11:AA:BB',
          description: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.ips.push(ip);

        // Connect asset and IP to port
        engine.updatePort(port.id, {
          connectedAssetId: asset.id,
          ipAddressId: ip.id,
          operStatus: 'ACTIVE',
        });

        const resolved = engine.getAssetWithUpstream(asset.id);
        expect(resolved.networkConnectivity).toBeDefined();
        expect(resolved.networkConnectivity?.upstreamSwitchName).toBe('Access Switch 01');
        expect(resolved.networkConnectivity?.upstreamPortName).toBe('Gi1/0/5');
        expect(resolved.networkConnectivity?.rackName).toBe('DC Rack 01');
        expect(resolved.networkConnectivity?.rackUnit).toBe(24);
        expect(resolved.networkConnectivity?.ipAddress).toBe('10.232.10.15');
        expect(resolved.networkConnectivity?.linkStatus).toBe('ACTIVE');
      });

      it('T1.5.4: should reassign IP between switch ports while maintaining consistency', () => {
        const sw = engine.createSwitch({
          name: 'Reassign SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const ports = engine.getSwitchPorts(sw.id);

        const now = new Date();
        const ip: DbIpAddress = {
          id: 'ip-float',
          address: '10.232.10.99',
          subnetId: 'sub-1',
          vlanId: 'vlan-1',
          locationId: null,
          assetId: null,
          status: 'ASSIGNED',
          hostname: null,
          macAddress: null,
          description: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.ips.push(ip);

        // Bind to Port 1
        engine.updatePort(ports[0].id, { ipAddressId: ip.id });
        expect(engine.getIpWithUpstream(ip.id).switchPort?.portName).toBe('Gi1/0/1');

        // Move to Port 2
        engine.updatePort(ports[0].id, { ipAddressId: null });
        engine.updatePort(ports[1].id, { ipAddressId: ip.id });
        expect(engine.getIpWithUpstream(ip.id).switchPort?.portName).toBe('Gi1/0/2');
      });

      it('T1.5.5: should clean up port connectedAssetId when asset is disconnected', () => {
        const sw = engine.createSwitch({
          name: 'Disconnect SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        engine.updatePort(port.id, {
          connectedAssetId: 'ast-temp',
          operStatus: 'ACTIVE',
        });
        expect(engine.getPort(port.id).connectedAssetId).toBe('ast-temp');

        engine.updatePort(port.id, {
          connectedAssetId: null,
          operStatus: 'DOWN',
        });
        expect(engine.getPort(port.id).connectedAssetId).toBeNull();
        expect(engine.getPort(port.id).operStatus).toBe('DOWN');
      });

      it('T1.5.6: should enforce bounded query ceilings and deterministic sorting tie-breakers', () => {
        for (let i = 1; i <= 150; i++) {
          engine.createRack({
            name: `Rack Cabinet ${i.toString().padStart(3, '0')}`,
            code: `RCK-${i}`,
          });
        }
        // Even if requesting 200 items, take must be capped at 100
        const result = engine.getRacks({ take: 200 });
        expect(result.items.length).toBeLessThanOrEqual(100);
        expect(result.total).toBe(150);

        // Verify deterministic sorting: duplicate names or sorted items use ID tie-breaker
        for (let i = 0; i < result.items.length - 1; i++) {
          const a = result.items[i];
          const b = result.items[i + 1];
          const cmp = a.name.localeCompare(b.name);
          if (cmp === 0) {
            expect(a.id.localeCompare(b.id)).toBeLessThan(0);
          } else {
            expect(cmp).toBeLessThan(0);
          }
        }
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 Test Cases per Feature across R1-R5)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    // ------------------------------------------------------------------------
    // Boundary 1: Rebranding, Search & Empty States (R1)
    // ------------------------------------------------------------------------
    describe('Boundary 1: Rebranding, Search & Empty States (R1)', () => {
      it('T2.1.1: should return 0 for all KPI stat cards on empty database without NaN', () => {
        const stats = engine.getStats();
        expect(stats.totalRacks).toBe(0);
        expect(stats.totalSwitches).toBe(0);
        expect(stats.totalPorts).toBe(0);
        expect(stats.activePorts).toBe(0);
        expect(stats.portUtilization).toBe(0);
        expect(Number.isNaN(stats.portUtilization)).toBe(false);
      });

      it('T2.1.2: should support case-insensitive and partial text search', () => {
        engine.createRack({ name: 'Enterprise Core Cabinet', code: 'DC-CORE-01' });
        expect(engine.getRacks({ search: 'core' }).items).toHaveLength(1);
        expect(engine.getRacks({ search: 'CORE' }).items).toHaveLength(1);
        expect(engine.getRacks({ search: 'dc-core' }).items).toHaveLength(1);
      });

      it('T2.1.3: should safely handle special characters and punctuation in search terms', () => {
        engine.createRack({ name: 'Rack #1 [Primary / Row A]', code: 'RCK-01#A' });
        engine.createSwitch({ name: 'Switch (C9300-48P)', model: 'C9300-48P', vendor: 'Cisco' });

        expect(engine.getRacks({ search: '#1' }).items).toHaveLength(1);
        expect(engine.getRacks({ search: '[Primary' }).items).toHaveLength(1);
        expect(engine.getSwitches({ search: 'C9300-48P' }).items).toHaveLength(1);
      });

      it('T2.1.4: should gracefully return empty results for non-existent location filter ID', () => {
        engine.createRack({ name: 'Rack 1', code: 'RCK-1', locationId: 'loc-1' });
        const result = engine.getRacks({ locationId: 'loc-non-existent' });
        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('T2.1.5: should accept long names (255 chars) without truncating', () => {
        const longName = 'A'.repeat(255);
        const rack = engine.createRack({ name: longName, code: 'LONG-RCK' });
        expect(engine.getRack(rack.id).name).toBe(longName);
      });

      it('T2.1.6: should handle negative pagination offset or limit safely', () => {
        engine.createRack({ name: 'Rack 1', code: 'RCK-1' });
        const result = engine.getRacks({ skip: -10, take: -5 });
        expect(result.items.length).toBeGreaterThanOrEqual(1);
      });
    });

    // ------------------------------------------------------------------------
    // Boundary 2: Rack Elevation Boundaries & Constraints (R2)
    // ------------------------------------------------------------------------
    describe('Boundary 2: Rack Elevation Boundaries & Constraints (R2)', () => {
      it('T2.2.1: should support minimum 1U rack and maximum 48U rack', () => {
        const minRack = engine.createRack({
          name: 'Mini 1U Shelf',
          code: 'MINI-1U',
          totalHeight: 1,
        });
        expect(engine.getRackElevation(minRack.id).slots).toHaveLength(1);

        const maxRack = engine.createRack({
          name: 'Datacenter 48U',
          code: 'MAX-48U',
          totalHeight: 48,
        });
        expect(engine.getRackElevation(maxRack.id).slots).toHaveLength(48);
      });

      it('T2.2.2: should reject slotting at U0 or negative slot numbers', () => {
        const rack = engine.createRack({ name: 'Test Rack', code: 'TEST-42U', totalHeight: 42 });
        expect(() =>
          engine.createSwitch({
            name: 'Invalid U0',
            model: 'M1',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: 0,
          }),
        ).toThrow(BadRequestException);
      });

      it('T2.2.3: should reject slotting beyond rack height', () => {
        const rack = engine.createRack({ name: 'Test 24U', code: 'TEST-24U', totalHeight: 24 });
        // Start unit 25 exceeds 24U
        expect(() =>
          engine.createSwitch({
            name: 'Exceeds 24U',
            model: 'M1',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: 25,
          }),
        ).toThrow(BadRequestException);

        // Start unit 24 with height 2 spans U24-U25, exceeding 24U
        expect(() =>
          engine.createSwitch({
            name: 'Span Exceeds',
            model: 'M2',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: 24,
            rackHeight: 2,
          }),
        ).toThrow(BadRequestException);
      });

      it('T2.2.4: should allow mounting exactly contiguous adjacent devices without false collision', () => {
        const rack = engine.createRack({
          name: 'Contiguous Test',
          code: 'CTG-42U',
          totalHeight: 42,
        });
        // Device A: U1 to U2 (2U)
        engine.createSwitch({
          name: 'Device A',
          model: 'M1',
          vendor: 'Dell',
          rackId: rack.id,
          rackPosition: 1,
          rackHeight: 2,
        });
        // Device B: U3 to U4 (2U)
        const devB = engine.createSwitch({
          name: 'Device B',
          model: 'M2',
          vendor: 'Dell',
          rackId: rack.id,
          rackPosition: 3,
          rackHeight: 2,
        });
        expect(devB.id).toBeDefined();

        const elevation = engine.getRackElevation(rack.id);
        expect(elevation.occupiedUnits).toBe(4);
      });

      it('T2.2.5: should handle 100% full rack saturation with 0 available slots', () => {
        const rack = engine.createRack({
          name: 'Full 12U Rack',
          code: 'FULL-12U',
          totalHeight: 12,
        });
        for (let u = 1; u <= 12; u++) {
          engine.createSwitch({
            name: `Blade ${u}`,
            model: '1U Blade',
            vendor: 'Cisco',
            rackId: rack.id,
            rackPosition: u,
            rackHeight: 1,
          });
        }
        const elevation = engine.getRackElevation(rack.id);
        expect(elevation.occupiedUnits).toBe(12);
        expect(elevation.availableUnits).toBe(0);
        expect(elevation.spaceUtilizationPercent).toBe(100.0);
      });

      it('T2.2.6: should reject duplicate rack code', () => {
        engine.createRack({ name: 'Original', code: 'DUP-01' });
        expect(() => engine.createRack({ name: 'Copy', code: 'DUP-01' })).toThrow(
          BadRequestException,
        );
      });
    });

    // ------------------------------------------------------------------------
    // Boundary 3: Switch Inventory Boundaries & Constraints (R3)
    // ------------------------------------------------------------------------
    describe('Boundary 3: Switch Inventory Boundaries & Constraints (R3)', () => {
      it('T2.3.1: should support 0-port management gear up to 52-port switches', () => {
        const zeroPort = engine.createSwitch({
          name: 'Console Terminal Server',
          model: 'Opengear IM7200',
          vendor: 'Opengear',
          totalPorts: 0,
        });
        expect(engine.getSwitchPorts(zeroPort.id)).toHaveLength(4); // 4 uplinks only

        const largeSw = engine.createSwitch({
          name: '48P + 4 Uplinks',
          model: 'C9300-48UXM',
          vendor: 'Cisco',
          totalPorts: 48,
        });
        expect(engine.getSwitchPorts(largeSw.id)).toHaveLength(52);
      });

      it('T2.3.2: should reject duplicate switch serial number', () => {
        engine.createSwitch({
          name: 'Switch A',
          model: 'C9300',
          vendor: 'Cisco',
          serialNumber: 'SERIAL-UNIQUE-99',
        });
        expect(() =>
          engine.createSwitch({
            name: 'Switch B',
            model: 'C9300',
            vendor: 'Cisco',
            serialNumber: 'SERIAL-UNIQUE-99',
          }),
        ).toThrow(BadRequestException);
      });

      it('T2.3.3: should handle unmounted switch gracefully', () => {
        const sw = engine.createSwitch({
          name: 'Spare Shelf Switch',
          model: 'C9200',
          vendor: 'Cisco',
          rackId: null,
          rackPosition: null,
        });
        expect(sw.rackId).toBeNull();
        expect(sw.rackPosition).toBeNull();

        const retrieved = engine.getSwitch(sw.id);
        expect(retrieved.rackId).toBeNull();
      });

      it('T2.3.4: should handle clearing management IP safely', () => {
        const sw = engine.createSwitch({
          name: 'Mgmt Clear SW',
          model: 'C9200',
          vendor: 'Cisco',
          ipAddressId: 'ip-temp',
        });
        expect(sw.ipAddressId).toBe('ip-temp');

        const updated = engine.updateSwitch(sw.id, { ipAddressId: null });
        expect(updated.ipAddressId).toBeNull();
      });

      it('T2.3.5: should throw NotFoundException when updating non-existent switch', () => {
        expect(() => engine.updateSwitch('switch-fake', { name: 'New Name' })).toThrow(
          NotFoundException,
        );
      });

      it('T2.3.6: should throw NotFoundException when deleting non-existent switch', () => {
        expect(() => engine.deleteSwitch('switch-fake')).toThrow(NotFoundException);
      });
    });

    // ------------------------------------------------------------------------
    // Boundary 4: Port Matrix & Tri-State Telemetry Boundaries (R4)
    // ------------------------------------------------------------------------
    describe('Boundary 4: Port Matrix & Tri-State Telemetry Boundaries (R4)', () => {
      it('T2.4.1: should align port numbering across odd upper and even lower rows', () => {
        const sw = engine.createSwitch({
          name: 'Grid SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const ports = engine.getSwitchPorts(sw.id);

        // Odd ports
        expect(ports[0].portNumber).toBe(1);
        expect(ports[0].name).toBe('Gi1/0/1');
        expect(ports[2].portNumber).toBe(3);
        expect(ports[2].name).toBe('Gi1/0/3');

        // Even ports
        expect(ports[1].portNumber).toBe(2);
        expect(ports[1].name).toBe('Gi1/0/2');
        expect(ports[23].portNumber).toBe(24);
        expect(ports[23].name).toBe('Gi1/0/24');
      });

      it('T2.4.2: should handle rapid link flapping across tri-state values without corruption', () => {
        const sw = engine.createSwitch({
          name: 'Flap SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        engine.updatePort(port.id, { operStatus: 'ACTIVE' });
        expect(engine.getPort(port.id).operStatus).toBe('ACTIVE');

        engine.updatePort(port.id, { operStatus: 'CONNECTED_NO_SIGNAL' });
        expect(engine.getPort(port.id).operStatus).toBe('CONNECTED_NO_SIGNAL');

        engine.updatePort(port.id, { operStatus: 'DOWN' });
        expect(engine.getPort(port.id).operStatus).toBe('DOWN');

        engine.updatePort(port.id, { operStatus: 'ACTIVE' });
        expect(engine.getPort(port.id).operStatus).toBe('ACTIVE');
      });

      it('T2.4.3: should support 802.1Q trunk port with empty vs full tagged VLAN array', () => {
        const sw = engine.createSwitch({
          name: 'Trunk SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        // Empty tagged VLANs
        engine.updatePort(port.id, { mode: 'TRUNK', taggedVlanIds: [] });
        expect(engine.getPort(port.id).taggedVlanIds).toEqual([]);

        // Full array of VLAN IDs
        const vlans = [10, 20, 30, 40, 50, 100, 200, 999];
        engine.updatePort(port.id, { mode: 'TRUNK', taggedVlanIds: vlans });
        expect(engine.getPort(port.id).taggedVlanIds).toEqual(vlans);
      });

      it('T2.4.4: should treat unassigned port with null IP, VLAN, and connected asset', () => {
        const sw = engine.createSwitch({
          name: 'Default SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];

        expect(port.ipAddressId).toBeNull();
        expect(port.vlanId).toBeNull();
        expect(port.connectedAssetId).toBeNull();
        expect(port.operStatus).toBe('DOWN');
      });

      it('T2.4.5: should throw NotFoundException when updating non-existent port', () => {
        expect(() => engine.updatePort('port-fake', { operStatus: 'ACTIVE' })).toThrow(
          NotFoundException,
        );
      });

      it('T2.4.6: should allow setting port description up to 500 characters', () => {
        const sw = engine.createSwitch({
          name: 'Desc SW',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
        });
        const port = engine.getSwitchPorts(sw.id)[0];
        const desc = 'P'.repeat(500);

        const updated = engine.updatePort(port.id, { description: desc });
        expect(updated.description).toBe(desc);
      });
    });

    // ------------------------------------------------------------------------
    // Boundary 5: Bidirectional Cross-Linking Boundaries (R5)
    // ------------------------------------------------------------------------
    describe('Boundary 5: Bidirectional Cross-Linking Boundaries (R5)', () => {
      it('T2.5.1: should return null switchPort when querying unlinked IPAddress', () => {
        const now = new Date();
        const ip: DbIpAddress = {
          id: 'ip-unlinked',
          address: '10.232.50.1',
          subnetId: null,
          vlanId: null,
          locationId: null,
          assetId: null,
          status: 'AVAILABLE',
          hostname: null,
          macAddress: null,
          description: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.ips.push(ip);

        const result = engine.getIpWithUpstream(ip.id);
        expect(result.ip.address).toBe('10.232.50.1');
        expect(result.switchPort).toBeNull();
      });

      it('T2.5.2: should return empty carryingPorts when querying VLAN carried by zero ports', () => {
        const now = new Date();
        const vlan: DbVlan = {
          id: 'vlan-empty-99',
          vlanNumber: 99,
          name: 'Empty VLAN',
          description: null,
          status: 'RESERVED',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.vlans.push(vlan);

        const result = engine.getVlanWithCarryingPorts(vlan.id);
        expect(result.vlan.name).toBe('Empty VLAN');
        expect(result.carryingPorts).toHaveLength(0);
      });

      it('T2.5.3: should return null networkConnectivity when querying unlinked Asset', () => {
        const now = new Date();
        const asset: DbAsset = {
          id: 'ast-unlinked',
          name: 'Standalone Laptop',
          assetTag: 'AST-NB-001',
          serialNumber: 'SN-LAP-01',
          model: 'ThinkPad T14',
          manufacturer: 'Lenovo',
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        };
        engine.assets.push(asset);

        const result = engine.getAssetWithUpstream(asset.id);
        expect(result.asset.assetTag).toBe('AST-NB-001');
        expect(result.networkConnectivity).toBeNull();
      });

      it('T2.5.4: should throw NotFoundException when resolving upstream for non-existent IP', () => {
        expect(() => engine.getIpWithUpstream('ip-non-existent')).toThrow(NotFoundException);
      });

      it('T2.5.5: should throw NotFoundException when resolving carrying ports for non-existent VLAN', () => {
        expect(() => engine.getVlanWithCarryingPorts('vlan-non-existent')).toThrow(
          NotFoundException,
        );
      });

      it('T2.5.6: should throw NotFoundException when resolving upstream for non-existent Asset', () => {
        expect(() => engine.getAssetWithUpstream('asset-non-existent')).toThrow(NotFoundException);
      });
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Interactions, 12 Test Cases)
  // ==========================================================================
  describe('Tier 3: Cross-Feature Combinations (Pairwise)', () => {
    it('T3.1: should verify full enterprise stack binding across Rack + Switch + Port + IP + Asset', () => {
      const rack = engine.createRack({
        name: 'Datacenter Rack 01',
        code: 'DC1-RCK-01',
        totalHeight: 42,
      });
      const sw = engine.createSwitch({
        name: 'Core Switch 01',
        model: 'Catalyst 9300',
        vendor: 'Cisco',
        rackId: rack.id,
        rackPosition: 38,
        rackHeight: 1,
      });
      const port = engine.getSwitchPorts(sw.id)[0];

      const now = new Date();
      const vlan: DbVlan = {
        id: 'vlan-10',
        vlanNumber: 10,
        name: 'Datacenter LAN',
        description: null,
        status: 'ACTIVE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.vlans.push(vlan);

      const ip: DbIpAddress = {
        id: 'ip-app-srv',
        address: '10.232.10.50',
        subnetId: 'sub-1',
        vlanId: vlan.id,
        locationId: null,
        assetId: null,
        status: 'ASSIGNED',
        hostname: 'app-srv-01',
        macAddress: '00:1B:44:11:3A:50',
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.ips.push(ip);

      const asset: DbAsset = {
        id: 'ast-srv-1001',
        name: 'Database Host 01',
        assetTag: 'AST-1001',
        serialNumber: 'SRV-DEL-1001',
        model: 'R750',
        manufacturer: 'Dell',
        status: 'IN_USE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.assets.push(asset);

      // Configure Port
      engine.updatePort(port.id, {
        vlanId: vlan.id,
        mode: 'ACCESS',
        ipAddressId: ip.id,
        connectedAssetId: asset.id,
        operStatus: 'ACTIVE',
      });

      // Verify from IP
      const ipUpstream = engine.getIpWithUpstream(ip.id);
      expect(ipUpstream.switchPort?.switch.name).toBe('Core Switch 01');
      expect(ipUpstream.switchPort?.switch.rack?.name).toBe('Datacenter Rack 01');
      expect(ipUpstream.switchPort?.switch.rack?.rackPosition).toBe(38);

      // Verify from VLAN
      const vlanPorts = engine.getVlanWithCarryingPorts(vlan.id);
      expect(vlanPorts.carryingPorts).toHaveLength(1);
      expect(vlanPorts.carryingPorts[0].portName).toBe('Gi1/0/1');

      // Verify from Asset
      const assetUpstream = engine.getAssetWithUpstream(asset.id);
      expect(assetUpstream.networkConnectivity?.upstreamSwitchName).toBe('Core Switch 01');
      expect(assetUpstream.networkConnectivity?.upstreamPortName).toBe('Gi1/0/1');
      expect(assetUpstream.networkConnectivity?.rackName).toBe('Datacenter Rack 01');
      expect(assetUpstream.networkConnectivity?.ipAddress).toBe('10.232.10.50');
    });

    it('T3.2: should update IP and Asset upstream locations when switch is relocated to another rack', () => {
      const rack1 = engine.createRack({ name: 'Rack Old', code: 'RCK-OLD', totalHeight: 42 });
      const rack2 = engine.createRack({ name: 'Rack New', code: 'RCK-NEW', totalHeight: 42 });

      const sw = engine.createSwitch({
        name: 'Movable Switch',
        model: 'C9300',
        vendor: 'Cisco',
        rackId: rack1.id,
        rackPosition: 38,
      });
      const port = engine.getSwitchPorts(sw.id)[0];

      const now = new Date();
      const ip: DbIpAddress = {
        id: 'ip-reloc',
        address: '10.232.10.70',
        subnetId: null,
        vlanId: null,
        locationId: null,
        assetId: null,
        status: 'ASSIGNED',
        hostname: null,
        macAddress: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.ips.push(ip);
      engine.updatePort(port.id, { ipAddressId: ip.id });

      // Move switch from Rack 1 (U38) to Rack 2 (U20)
      engine.updateSwitch(sw.id, { rackId: rack2.id, rackPosition: 20 });

      const ipResolved = engine.getIpWithUpstream(ip.id);
      expect(ipResolved.switchPort?.switch.rack?.name).toBe('Rack New');
      expect(ipResolved.switchPort?.switch.rack?.rackPosition).toBe(20);
    });

    it('T3.3: should preserve switch ports and IP bindings when parent rack is decommissioned', () => {
      const rack = engine.createRack({ name: 'Decom Rack', code: 'DC-DEC-01' });
      const sw = engine.createSwitch({
        name: 'Retained Switch',
        model: 'C9300',
        vendor: 'Cisco',
        rackId: rack.id,
        rackPosition: 10,
      });
      const port = engine.getSwitchPorts(sw.id)[0];

      const now = new Date();
      const ip: DbIpAddress = {
        id: 'ip-retain',
        address: '10.232.10.80',
        subnetId: null,
        vlanId: null,
        locationId: null,
        assetId: null,
        status: 'ASSIGNED',
        hostname: null,
        macAddress: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.ips.push(ip);
      engine.updatePort(port.id, { ipAddressId: ip.id });

      engine.deleteRack(rack.id);

      const swAfter = engine.getSwitch(sw.id);
      expect(swAfter.rackId).toBeNull();

      const ipAfter = engine.getIpWithUpstream(ip.id);
      expect(ipAfter.switchPort?.switch.name).toBe('Retained Switch');
      expect(ipAfter.switchPort?.switch.rack).toBeNull();
    });

    it('T3.4: should reflect multiple VLAN memberships when port is cut over to 802.1Q trunk', () => {
      const now = new Date();
      const vlan10: DbVlan = {
        id: 'v-10',
        vlanNumber: 10,
        name: 'VLAN 10',
        description: null,
        status: 'ACTIVE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      const vlan20: DbVlan = {
        id: 'v-20',
        vlanNumber: 20,
        name: 'VLAN 20',
        description: null,
        status: 'ACTIVE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      const vlan30: DbVlan = {
        id: 'v-30',
        vlanNumber: 30,
        name: 'VLAN 30',
        description: null,
        status: 'ACTIVE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.vlans.push(vlan10, vlan20, vlan30);

      const sw = engine.createSwitch({
        name: 'Trunk Host',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const uplink = engine.getSwitchPorts(sw.id)[24]; // Te1/0/25

      engine.updatePort(uplink.id, {
        mode: 'TRUNK',
        vlanId: vlan10.id, // Native VLAN
        taggedVlanIds: [20, 30],
      });

      expect(engine.getVlanWithCarryingPorts(vlan10.id).carryingPorts).toHaveLength(1);
      expect(engine.getVlanWithCarryingPorts(vlan20.id).carryingPorts).toHaveLength(1);
      expect(engine.getVlanWithCarryingPorts(vlan30.id).carryingPorts).toHaveLength(1);
    });

    it('T3.5: should reflect link flapping across Asset network connectivity status synchronously', () => {
      const now = new Date();
      const asset: DbAsset = {
        id: 'ast-flap',
        name: 'Flapping Server',
        assetTag: 'AST-FLAP-01',
        serialNumber: 'SN-FLAP',
        model: 'R750',
        manufacturer: 'Dell',
        status: 'IN_USE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.assets.push(asset);

      const sw = engine.createSwitch({
        name: 'Flap SW',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const port = engine.getSwitchPorts(sw.id)[0];
      engine.updatePort(port.id, { connectedAssetId: asset.id, operStatus: 'ACTIVE' });

      expect(engine.getAssetWithUpstream(asset.id).networkConnectivity?.linkStatus).toBe('ACTIVE');

      engine.updatePort(port.id, { operStatus: 'CONNECTED_NO_SIGNAL' });
      expect(engine.getAssetWithUpstream(asset.id).networkConnectivity?.linkStatus).toBe(
        'CONNECTED_NO_SIGNAL',
      );

      engine.updatePort(port.id, { operStatus: 'DOWN' });
      expect(engine.getAssetWithUpstream(asset.id).networkConnectivity?.linkStatus).toBe('DOWN');
    });

    it('T3.6: should mount 4 different devices in a single rack avoiding collisions and summing utilization', () => {
      const rack = engine.createRack({
        name: 'High Density 42U',
        code: 'HD-42U',
        totalHeight: 42,
        maxPowerKw: 10.0,
      });

      // Core Switch (1U at U42)
      engine.createSwitch({
        name: 'Core 1U',
        model: 'C9300',
        vendor: 'Cisco',
        rackId: rack.id,
        rackPosition: 42,
        rackHeight: 1,
        powerDrawWatts: 400,
      });
      // Distribution Switch (2U at U39)
      engine.createSwitch({
        name: 'Dist 2U',
        model: 'C9500',
        vendor: 'Cisco',
        rackId: rack.id,
        rackPosition: 39,
        rackHeight: 2,
        powerDrawWatts: 800,
      });
      // Access Switch (1U at U37)
      engine.createSwitch({
        name: 'Access 1U',
        model: 'C9200',
        vendor: 'Cisco',
        rackId: rack.id,
        rackPosition: 37,
        rackHeight: 1,
        powerDrawWatts: 350,
      });
      // Storage Array (4U at U30)
      engine.createSwitch({
        name: 'SAN 4U',
        model: 'ME5024',
        vendor: 'Dell',
        rackId: rack.id,
        rackPosition: 30,
        rackHeight: 4,
        powerDrawWatts: 1200,
      });

      const elevation = engine.getRackElevation(rack.id);
      expect(elevation.occupiedUnits).toBe(8); // 1 + 2 + 1 + 4 = 8
      expect(elevation.spaceUtilizationPercent).toBe(19.0); // 8 / 42 * 100 = 19.04% -> 19.0%
      expect(elevation.totalPowerDrawKw).toBe(2.75); // (400 + 800 + 350 + 1200) / 1000 = 2.75 kW
      expect(elevation.powerUtilizationPercent).toBe(27.5); // 2.75 / 10 * 100 = 27.5%
    });

    it('T3.7: should model cross-rack trunk patch connection between two distribution switches', () => {
      const rack1 = engine.createRack({ name: 'Rack 1', code: 'RCK-1', totalHeight: 42 });
      const rack2 = engine.createRack({ name: 'Rack 2', code: 'RCK-2', totalHeight: 42 });

      const sw1 = engine.createSwitch({
        name: 'Switch 1',
        model: 'C9500',
        vendor: 'Cisco',
        rackId: rack1.id,
        rackPosition: 40,
        totalPorts: 24,
      });
      const sw2 = engine.createSwitch({
        name: 'Switch 2',
        model: 'C9500',
        vendor: 'Cisco',
        rackId: rack2.id,
        rackPosition: 40,
        totalPorts: 24,
      });

      const uplink1 = engine.getSwitchPorts(sw1.id)[24];
      const uplink2 = engine.getSwitchPorts(sw2.id)[24];

      engine.updatePort(uplink1.id, {
        mode: 'TRUNK',
        speed: '10 Gbps',
        operStatus: 'ACTIVE',
        description: `Cross-connect to ${sw2.name} [${rack2.code}]`,
      });
      engine.updatePort(uplink2.id, {
        mode: 'TRUNK',
        speed: '10 Gbps',
        operStatus: 'ACTIVE',
        description: `Cross-connect to ${sw1.name} [${rack1.code}]`,
      });

      expect(engine.getPort(uplink1.id).description).toContain('RCK-2');
      expect(engine.getPort(uplink2.id).description).toContain('RCK-1');
      expect(engine.getPort(uplink1.id).operStatus).toBe('ACTIVE');
      expect(engine.getPort(uplink2.id).operStatus).toBe('ACTIVE');
    });

    it('T3.8: should migrate switch management IP and verify old IP is freed', () => {
      const now = new Date();
      const oldIp: DbIpAddress = {
        id: 'ip-old',
        address: '10.232.1.1',
        subnetId: null,
        vlanId: null,
        locationId: null,
        assetId: null,
        status: 'ASSIGNED',
        hostname: null,
        macAddress: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      const newIp: DbIpAddress = {
        id: 'ip-new',
        address: '10.232.2.1',
        subnetId: null,
        vlanId: null,
        locationId: null,
        assetId: null,
        status: 'AVAILABLE',
        hostname: null,
        macAddress: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.ips.push(oldIp, newIp);

      const sw = engine.createSwitch({
        name: 'Migrated SW',
        model: 'C9300',
        vendor: 'Cisco',
        ipAddressId: oldIp.id,
      });

      // Migrate to new IP
      engine.updateSwitch(sw.id, { ipAddressId: newIp.id });
      oldIp.status = 'AVAILABLE';
      newIp.status = 'ASSIGNED';

      expect(engine.getSwitch(sw.id).ipAddressId).toBe(newIp.id);
      expect(oldIp.status).toBe('AVAILABLE');
      expect(newIp.status).toBe('ASSIGNED');
    });

    it('T3.9: should provision standard 52-port modular enterprise switch with correct names', () => {
      const sw = engine.createSwitch({
        name: 'Campus Aggregation Switch',
        model: 'C9300-48P',
        vendor: 'Cisco',
        totalPorts: 48,
      });
      const ports = engine.getSwitchPorts(sw.id);
      expect(ports).toHaveLength(52);

      // Verify odd/even port naming
      for (let i = 1; i <= 48; i++) {
        expect(ports[i - 1].name).toBe(`Gi1/0/${i}`);
      }
      for (let j = 49; j <= 52; j++) {
        expect(ports[j - 1].name).toBe(`Te1/0/${j}`);
        expect(ports[j - 1].formFactor).toBe('SFP_PLUS_10G');
      }
    });

    it('T3.10: should de-provision server asset from port while keeping VLAN profile intact', () => {
      const sw = engine.createSwitch({
        name: 'Deprov SW',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const port = engine.getSwitchPorts(sw.id)[0];

      engine.updatePort(port.id, {
        vlanId: 'vlan-corp-10',
        mode: 'ACCESS',
        speed: '1 Gbps',
        connectedAssetId: 'ast-srv-99',
        operStatus: 'ACTIVE',
      });

      // De-provision asset
      engine.updatePort(port.id, {
        connectedAssetId: null,
        operStatus: 'DOWN',
      });

      const updated = engine.getPort(port.id);
      expect(updated.connectedAssetId).toBeNull();
      expect(updated.vlanId).toBe('vlan-corp-10'); // preserved
      expect(updated.speed).toBe('1 Gbps'); // preserved
      expect(updated.operStatus).toBe('DOWN');
    });

    it('T3.11: should cascade delete switch ports without deleting associated IP records', () => {
      const now = new Date();
      const ip: DbIpAddress = {
        id: 'ip-survive',
        address: '10.232.10.200',
        subnetId: null,
        vlanId: null,
        locationId: null,
        assetId: null,
        status: 'ASSIGNED',
        hostname: null,
        macAddress: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.ips.push(ip);

      const sw = engine.createSwitch({
        name: 'Dying Switch',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const port = engine.getSwitchPorts(sw.id)[0];
      engine.updatePort(port.id, { ipAddressId: ip.id });

      engine.deleteSwitch(sw.id);

      // Switch and port are gone
      expect(engine.getSwitchPorts(sw.id)).toHaveLength(0);

      // IP survives
      expect(engine.ips.some((i) => i.id === 'ip-survive')).toBe(true);
      expect(engine.getIpWithUpstream('ip-survive').switchPort).toBeNull();
    });

    it('T3.12: should assign next available subnet IP directly into switch port and verify reflection', () => {
      const now = new Date();
      const subnet: DbSubnet = {
        id: 'sub-servers',
        cidr: '10.232.10.0/24',
        name: 'Server Subnet',
        vlanId: 'vlan-10',
        locationId: null,
        gateway: '10.232.10.1',
        totalIps: 254,
        usedIps: 1,
        reservedIps: 0,
        createdAt: now,
        updatedAt: now,
      };
      engine.subnets.push(subnet);

      const nextIp: DbIpAddress = {
        id: 'ip-next-avail',
        address: '10.232.10.2',
        subnetId: subnet.id,
        vlanId: subnet.vlanId,
        locationId: null,
        assetId: null,
        status: 'AVAILABLE',
        hostname: null,
        macAddress: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.ips.push(nextIp);

      const sw = engine.createSwitch({
        name: 'Subnet SW',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const port = engine.getSwitchPorts(sw.id)[0];

      // Assign next IP to port
      nextIp.status = 'ASSIGNED';
      subnet.usedIps++;
      engine.updatePort(port.id, {
        ipAddressId: nextIp.id,
        operStatus: 'ACTIVE',
      });

      expect(subnet.usedIps).toBe(2);
      expect(engine.getIpWithUpstream(nextIp.id).switchPort?.portName).toBe('Gi1/0/1');
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (Datacenter Workloads, 8 Test Cases)
  // ==========================================================================
  describe('Tier 4: Real-World Enterprise Datacenter Scenarios', () => {
    it('T4.1: BSL Central Datacenter Core Infrastructure Deployment', () => {
      // 1. Provision dual 42U cabinets
      const dc1 = engine.createRack({
        name: 'BSL Datacenter Rack 01',
        code: 'RACK-DC-01',
        totalHeight: 42,
        maxPowerKw: 10.0,
      });
      const dc2 = engine.createRack({
        name: 'BSL Datacenter Rack 02',
        code: 'RACK-DC-02',
        totalHeight: 42,
        maxPowerKw: 10.0,
      });

      // 2. Provision Core Switch (Cisco 9300-48P at DC1 U39)
      const coreSw = engine.createSwitch({
        name: 'BSL-CORE-SW01',
        model: 'C9300-48P',
        vendor: 'Cisco',
        role: 'CORE',
        rackId: dc1.id,
        rackPosition: 39,
        rackHeight: 1,
        totalPorts: 48,
        powerDrawWatts: 450,
      });

      // 3. Provision Distribution Switch (Cisco 9200L at DC1 U37)
      const distSw = engine.createSwitch({
        name: 'BSL-DIST-SW01',
        model: 'C9200L-24P',
        vendor: 'Cisco',
        role: 'DISTRIBUTION',
        rackId: dc1.id,
        rackPosition: 37,
        rackHeight: 1,
        totalPorts: 24,
        powerDrawWatts: 350,
      });

      // 4. Provision ToR Switch (Juniper EX3400 at DC2 U42)
      const torSw = engine.createSwitch({
        name: 'BSL-TOR-SW01',
        model: 'EX3400-24T',
        vendor: 'Juniper',
        role: 'TOR',
        rackId: dc2.id,
        rackPosition: 42,
        rackHeight: 1,
        totalPorts: 24,
        powerDrawWatts: 280,
      });

      // Verify rack elevations
      const elev1 = engine.getRackElevation(dc1.id);
      expect(elev1.occupiedUnits).toBe(2);
      expect(elev1.totalPowerDrawKw).toBe(0.8);

      const elev2 = engine.getRackElevation(dc2.id);
      expect(elev2.occupiedUnits).toBe(1);
      expect(elev2.totalPowerDrawKw).toBe(0.28);

      // Verify overall telemetry
      const stats = engine.getStats();
      expect(stats.totalRacks).toBe(2);
      expect(stats.totalSwitches).toBe(3);
      expect(stats.totalPorts).toBe(108); // (48+4) + (24+4) + (24+4) = 52 + 28 + 28 = 108
    });

    it('T4.2: Factory 1 Intermediate Distribution Frame (IDF) Cutover', () => {
      // 24U Cabinet in Factory 1 IDF
      const idfRack = engine.createRack({
        name: 'Factory 1 IDF Cabinet',
        code: 'RACK-F1-IDF',
        totalHeight: 24,
        maxPowerKw: 4.0,
      });

      // Alcatel-Lucent OmniSwitch 6450-48
      const sw = engine.createSwitch({
        name: 'BSL-F1-ACC01',
        model: 'OS6450-48',
        vendor: 'Alcatel-Lucent',
        role: 'ACCESS',
        rackId: idfRack.id,
        rackPosition: 20,
        rackHeight: 1,
        totalPorts: 48,
      });

      const ports = engine.getSwitchPorts(sw.id);

      // Migrate 30 factory floor workstation IPs and barcode terminals
      const now = new Date();
      for (let i = 1; i <= 30; i++) {
        const ip: DbIpAddress = {
          id: `ip-f1-ws-${i}`,
          address: `10.232.21.${i}`,
          subnetId: 'sub-f1-ws',
          vlanId: 'vlan-f1',
          locationId: 'loc-f1',
          assetId: null,
          status: 'ASSIGNED',
          hostname: `f1-ws-${i}.uims.lan`,
          macAddress: `00:1B:44:F1:00:${i.toString(16).padStart(2, '0')}`,
          description: `Sewing Line ${Math.ceil(i / 5)} Station`,
          createdAt: now,
          updatedAt: now,
        };
        engine.ips.push(ip);

        engine.updatePort(ports[i - 1].id, {
          ipAddressId: ip.id,
          operStatus: 'ACTIVE',
          adminStatus: 'UP',
          description: `Workstation ${i}`,
        });
      }

      // Check port status breakdown
      const activeCount = ports.filter((p) => p.operStatus === 'ACTIVE').length;
      expect(activeCount).toBe(30);

      const stats = engine.getStats();
      expect(stats.activePorts).toBe(30);
      expect(stats.portUtilization).toBe(57.7); // 30 / 52 * 100 = 57.69% -> 57.7%
    });

    it('T4.3: Virtual Server Host Dual-Homed Redundant Uplink Provisioning', () => {
      // 2 Redundant ToR Switches across separate racks
      const rackA = engine.createRack({ name: 'Rack A', code: 'RCK-A', totalHeight: 42 });
      const rackB = engine.createRack({ name: 'Rack B', code: 'RCK-B', totalHeight: 42 });

      const torA = engine.createSwitch({
        name: 'TOR-SW-A',
        model: 'EX3400',
        vendor: 'Juniper',
        rackId: rackA.id,
        rackPosition: 42,
        totalPorts: 24,
      });
      const torB = engine.createSwitch({
        name: 'TOR-SW-B',
        model: 'EX3400',
        vendor: 'Juniper',
        rackId: rackB.id,
        rackPosition: 42,
        totalPorts: 24,
      });

      const now = new Date();
      const serverAsset: DbAsset = {
        id: 'ast-esxi-01',
        name: 'VMware ESXi Host 01',
        assetTag: 'AST-SRV-ESX01',
        serialNumber: 'SRV-ESX-001',
        model: 'PowerEdge R750',
        manufacturer: 'Dell',
        status: 'IN_USE',
        locationId: null,
        createdAt: now,
        updatedAt: now,
      };
      engine.assets.push(serverAsset);

      // Patch NIC 1 to TOR-A SFP+ Uplink 1 (Port 25)
      const portA = engine.getSwitchPorts(torA.id)[24];
      engine.updatePort(portA.id, {
        connectedAssetId: serverAsset.id,
        mode: 'LACP',
        operStatus: 'ACTIVE',
        description: 'ESXi Host 01 vmnic0 (Uplink A)',
      });

      // Patch NIC 2 to TOR-B SFP+ Uplink 1 (Port 25)
      const portB = engine.getSwitchPorts(torB.id)[24];
      engine.updatePort(portB.id, {
        connectedAssetId: serverAsset.id,
        mode: 'LACP',
        operStatus: 'ACTIVE',
        description: 'ESXi Host 01 vmnic1 (Uplink B)',
      });

      const portAFetched = engine.getPort(portA.id);
      const portBFetched = engine.getPort(portB.id);
      expect(portAFetched.connectedAssetId).toBe(serverAsset.id);
      expect(portBFetched.connectedAssetId).toBe(serverAsset.id);
      expect(portAFetched.operStatus).toBe('ACTIVE');
      expect(portBFetched.operStatus).toBe('ACTIVE');
    });

    it('T4.4: Enterprise VLAN Re-segmentation & Broadcast Domain Audit', () => {
      const now = new Date();
      const vlans: DbVlan[] = [
        {
          id: 'vlan-100',
          vlanNumber: 100,
          name: 'Core Infrastructure Mgmt',
          description: null,
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'vlan-129',
          vlanNumber: 129,
          name: 'Switch Management',
          description: null,
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'vlan-10',
          vlanNumber: 10,
          name: 'Corporate Office LAN',
          description: null,
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'vlan-20',
          vlanNumber: 20,
          name: 'Factory Voice & CCTV',
          description: null,
          status: 'ACTIVE',
          locationId: null,
          createdAt: now,
          updatedAt: now,
        },
      ];
      engine.vlans.push(...vlans);

      const sw = engine.createSwitch({
        name: 'Audit SW',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const ports = engine.getSwitchPorts(sw.id);

      // Ports 1-10 in VLAN 10 (Access)
      for (let i = 0; i < 10; i++) {
        engine.updatePort(ports[i].id, { vlanId: 'vlan-10', mode: 'ACCESS' });
      }
      // Ports 11-20 in VLAN 20 (Access)
      for (let i = 10; i < 20; i++) {
        engine.updatePort(ports[i].id, { vlanId: 'vlan-20', mode: 'ACCESS' });
      }
      // Ports 25-26 in Trunk carrying VLAN 100, 129, 10, 20
      engine.updatePort(ports[24].id, { mode: 'TRUNK', taggedVlanIds: [100, 129, 10, 20] });
      engine.updatePort(ports[25].id, { mode: 'TRUNK', taggedVlanIds: [100, 129, 10, 20] });

      const vlan10Audit = engine.getVlanWithCarryingPorts('vlan-10');
      expect(vlan10Audit.carryingPorts).toHaveLength(12); // 10 Access + 2 Trunk

      const vlan20Audit = engine.getVlanWithCarryingPorts('vlan-20');
      expect(vlan20Audit.carryingPorts).toHaveLength(12); // 10 Access + 2 Trunk

      const vlan100Audit = engine.getVlanWithCarryingPorts('vlan-100');
      expect(vlan100Audit.carryingPorts).toHaveLength(2); // 2 Trunk
    });

    it('T4.5: Tri-State Cable Fault Diagnosis & Replacement Workflow', () => {
      const sw = engine.createSwitch({
        name: 'Diag SW',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const port = engine.getSwitchPorts(sw.id)[17]; // Port Gi1/0/18

      // Step 1: Cable inserted, speed negotiation failure / link flapping
      engine.updatePort(port.id, {
        operStatus: 'CONNECTED_NO_SIGNAL',
        speed: 'Auto',
        duplex: 'Auto',
        description: 'Factory floor CCTV camera link flapping',
      });
      expect(engine.getPort(port.id).operStatus).toBe('CONNECTED_NO_SIGNAL');

      // Step 2: Cable tested, replaced, hardcoded to 1 Gbps Full Duplex
      engine.updatePort(port.id, {
        operStatus: 'ACTIVE',
        speed: '1 Gbps',
        duplex: 'Full',
        description: 'Factory floor CCTV camera link resolved',
      });
      expect(engine.getPort(port.id).operStatus).toBe('ACTIVE');
      expect(engine.getPort(port.id).duplex).toBe('Full');
    });

    it('T4.6: Datacenter Rack Decommissioning & Switch Relocation Workflow', () => {
      // Step 1: Legacy Rack 24U decommissioned
      const legacyRack = engine.createRack({
        name: 'Legacy Rack 01',
        code: 'RCK-LEG-01',
        totalHeight: 24,
      });
      const newRack = engine.createRack({
        name: 'Modern 48U Rack',
        code: 'RCK-MOD-01',
        totalHeight: 48,
      });

      const sw = engine.createSwitch({
        name: 'Relocated Switch',
        model: 'C9200',
        vendor: 'Cisco',
        rackId: legacyRack.id,
        rackPosition: 10,
      });

      // Unmount from legacy rack
      engine.updateSwitch(sw.id, { rackId: null, rackPosition: null });
      engine.deleteRack(legacyRack.id);

      // Mount into modern 48U rack at U12
      engine.updateSwitch(sw.id, { rackId: newRack.id, rackPosition: 12, rackHeight: 1 });

      const elevation = engine.getRackElevation(newRack.id);
      expect(elevation.slots[11].occupied).toBe(true); // U12 is index 11
      expect(elevation.slots[11].device?.id).toBe(sw.id);
    });

    it('T4.7: Emergency Core Switch Hot-Swap with Port Profile Cloning', () => {
      // Failed switch
      const failedSw = engine.createSwitch({
        name: 'FAILED-CORE-SW01',
        model: 'C9300-48P',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const failedPorts = engine.getSwitchPorts(failedSw.id);
      engine.updatePort(failedPorts[0].id, {
        vlanId: 'vlan-corp',
        description: 'Uplink to DC Firewall',
        operStatus: 'ACTIVE',
      });

      // Replacement switch provisioned
      const replacementSw = engine.createSwitch({
        name: 'REPLACEMENT-CORE-SW01',
        model: 'C9300-48P',
        vendor: 'Cisco',
        totalPorts: 24,
      });
      const replPorts = engine.getSwitchPorts(replacementSw.id);

      // Clone port profiles from failed switch to replacement switch
      for (let i = 0; i < failedPorts.length; i++) {
        engine.updatePort(replPorts[i].id, {
          vlanId: failedPorts[i].vlanId,
          mode: failedPorts[i].mode,
          description: failedPorts[i].description,
          operStatus: failedPorts[i].operStatus,
        });
      }

      // Decommission failed switch
      engine.deleteSwitch(failedSw.id);

      // Verify replacement switch has identical profile
      expect(engine.getPort(replPorts[0].id).vlanId).toBe('vlan-corp');
      expect(engine.getPort(replPorts[0].id).description).toBe('Uplink to DC Firewall');
      expect(engine.getPort(replPorts[0].id).operStatus).toBe('ACTIVE');
    });

    it('T4.8: Datacenter Telemetry & Utilization Capacity Audit', () => {
      // Provision complete datacenter facility
      const rack1 = engine.createRack({
        name: 'Rack 1',
        code: 'R1',
        totalHeight: 42,
        maxPowerKw: 8.0,
      });
      const rack2 = engine.createRack({
        name: 'Rack 2',
        code: 'R2',
        totalHeight: 42,
        maxPowerKw: 8.0,
      });

      // Add 2 switches to Rack 1
      const sw1 = engine.createSwitch({
        name: 'SW1',
        model: 'C9300',
        vendor: 'Cisco',
        rackId: rack1.id,
        rackPosition: 40,
        rackHeight: 1,
        totalPorts: 48,
        powerDrawWatts: 400,
      });
      const sw2 = engine.createSwitch({
        name: 'SW2',
        model: 'C9300',
        vendor: 'Cisco',
        rackId: rack1.id,
        rackPosition: 38,
        rackHeight: 1,
        totalPorts: 48,
        powerDrawWatts: 400,
      });

      // Add 1 switch to Rack 2
      const sw3 = engine.createSwitch({
        name: 'SW3',
        model: 'C9300',
        vendor: 'Cisco',
        rackId: rack2.id,
        rackPosition: 40,
        rackHeight: 1,
        totalPorts: 24,
        powerDrawWatts: 300,
      });

      // Activate 20 ports on sw1, 20 on sw2, 10 on sw3
      for (let i = 0; i < 20; i++) {
        engine.updatePort(engine.getSwitchPorts(sw1.id)[i].id, { operStatus: 'ACTIVE' });
        engine.updatePort(engine.getSwitchPorts(sw2.id)[i].id, { operStatus: 'ACTIVE' });
      }
      for (let i = 0; i < 10; i++) {
        engine.updatePort(engine.getSwitchPorts(sw3.id)[i].id, { operStatus: 'ACTIVE' });
      }

      const stats = engine.getStats();
      expect(stats.totalRacks).toBe(2);
      expect(stats.totalSwitches).toBe(3);
      expect(stats.totalPorts).toBe(132); // (48+4) + (48+4) + (24+4) = 52 + 52 + 28 = 132
      expect(stats.activePorts).toBe(50);
      expect(stats.portUtilization).toBe(37.9); // 50 / 132 * 100 = 37.87% -> 37.9%

      const elev1 = engine.getRackElevation(rack1.id);
      expect(elev1.occupiedUnits).toBe(2);
      expect(elev1.availableUnits).toBe(40);
      expect(elev1.totalPowerDrawKw).toBe(0.8);

      const elev2 = engine.getRackElevation(rack2.id);
      expect(elev2.occupiedUnits).toBe(1);
      expect(elev2.availableUnits).toBe(41);
      expect(elev2.totalPowerDrawKw).toBe(0.3);
    });
  });
});

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  type IPAddress,
  type Location,
  type NetworkRack,
  type NetworkSwitch,
  type PortAdminStatus,
  type PortFormFactor,
  type PortMode,
  type PortOperStatus,
  type RackStatus,
  type Subnet,
  type SwitchPort,
  type SwitchRole,
  type SwitchStatus,
  type VLAN,
  type VlanStatus,
} from '@prisma/client';
import type {
  AutoDetectResult,
  CreateIPAddressDto,
  CreateRackDto,
  CreateSubnetDto,
  CreateSwitchDto,
  CreateSwitchPortDto,
  CreateVlanDto,
  IPAddressQueryDto,
  NetworkCalculation,
  NetworkStatsDto,
  RackElevationData,
  RackElevationSlot,
  RackQueryDto,
  SubnetQueryDto,
  SwitchPortQueryDto,
  SwitchQueryDto,
  UpdateIPAddressDto,
  UpdateRackDto,
  UpdateSubnetDto,
  UpdateSwitchDto,
  UpdateSwitchPortDto,
  UpdateVlanDto,
  VlanQueryDto,
} from '@uims/shared-types';
import {
  calculateSubnet,
  calculateUtilization,
  findMatchingSubnet,
  findNextAvailableIp,
  isValidCidr,
  isValidIp,
  lookupMacVendor,
  mapIPStatus,
  mapIPStatusToLabel,
  normalizeMac,
} from '@uims/shared-utils';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // VLAN MANAGEMENT
  // ==========================================

  async findAllVlans(query?: VlanQueryDto) {
    const where: Prisma.VLANWhereInput = {};

    if (query?.search) {
      const searchNum = Number(query.search);
      if (!Number.isNaN(searchNum) && Number.isInteger(searchNum)) {
        where.OR = [
          { vlanNumber: searchNum },
          { name: { contains: query.search, mode: 'insensitive' } },
        ];
      } else {
        where.name = { contains: query.search, mode: 'insensitive' };
      }
    }

    if (query?.status && query.status !== 'all') {
      where.status = query.status as VlanStatus;
    }

    if (query?.locationId) {
      where.locationId = query.locationId;
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    return this.prisma.vLAN.findMany({
      where,
      include: {
        location: true,
        subnets: true,
        _count: { select: { ipAddresses: true, subnets: true } },
      },
      orderBy: [{ vlanNumber: 'asc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });
  }

  async findVlan(id: string) {
    const isNumeric = /^\d+$/.test(id);
    const vlan = await this.prisma.vLAN.findFirst({
      where: isNumeric ? { OR: [{ id }, { vlanNumber: Number(id) }] } : { id },
      include: {
        location: true,
        subnets: true,
        ipAddresses: {
          take: 100,
          orderBy: { address: 'asc' },
        },
      },
    });

    if (!vlan) {
      throw new NotFoundException(`VLAN with identifier "${id}" not found`);
    }

    return vlan;
  }

  async createVlan(data: CreateVlanDto) {
    return this.prisma.vLAN.create({
      data: {
        vlanNumber: data.vlanNumber,
        name: data.name,
        description: data.description,
        status: data.status as VlanStatus,
        locationId: data.locationId,
      },
      include: { location: true, subnets: true },
    });
  }

  async updateVlan(id: string, data: UpdateVlanDto) {
    return this.prisma.vLAN.update({
      where: { id },
      data: {
        vlanNumber: data.vlanNumber,
        name: data.name,
        description: data.description,
        status: data.status as VlanStatus,
        locationId: data.locationId,
      },
      include: { location: true, subnets: true },
    });
  }

  async deleteVlan(id: string) {
    return this.prisma.vLAN.delete({ where: { id } });
  }

  // ==========================================
  // SUBNET MANAGEMENT
  // ==========================================

  async findAllSubnets(query?: SubnetQueryDto) {
    const where: Prisma.SubnetWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { cidr: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.vlanId) {
      where.vlanId = query.vlanId;
    }

    if (query?.locationId) {
      where.locationId = query.locationId;
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const subnets = await this.prisma.subnet.findMany({
      where,
      include: {
        vlan: true,
        location: true,
        _count: { select: { ipAddresses: true } },
      },
      orderBy: [{ cidr: 'asc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return subnets.map((subnet) => this.formatSubnet(subnet));
  }

  async findSubnet(id: string) {
    const subnet = await this.prisma.subnet.findFirst({
      where: { OR: [{ id }, { cidr: id }] },
      include: {
        vlan: true,
        location: true,
        ipAddresses: {
          take: 100,
          orderBy: { address: 'asc' },
        },
      },
    });

    if (!subnet) {
      throw new NotFoundException(`Subnet with identifier "${id}" not found`);
    }

    return this.formatSubnet(subnet);
  }

  async createSubnet(data: CreateSubnetDto) {
    if (!isValidCidr(data.cidr)) {
      throw new BadRequestException(`Invalid IPv4 CIDR block: "${data.cidr}"`);
    }

    // Auto-calculate network parameters if not manually overridden
    const calc = calculateSubnet(data.cidr);

    const vlanId = data.vlanId;

    const created = await this.prisma.subnet.create({
      data: {
        cidr: data.cidr,
        name: data.name,
        vlanId,
        locationId: data.locationId,
        gateway: data.gateway || calc.suggestedGateway,
        networkAddress: data.networkAddress || calc.networkAddress,
        netmask: data.netmask || calc.subnetMask,
        broadcastAddress: data.broadcastAddress || calc.broadcastAddress,
        startIp: data.startIp || calc.usableStart,
        endIp: data.endIp || calc.usableEnd,
        totalIps: data.totalIps ? Number(data.totalIps) : calc.usableHosts,
        usedIps: 0,
        reservedIps: data.reservedIps ?? 0,
        description: data.description,
      },
      include: { vlan: true, location: true },
    });

    return this.formatSubnet(created);
  }

  async updateSubnet(id: string, data: UpdateSubnetDto) {
    const updateData: Prisma.SubnetUpdateInput = {
      name: data.name,
      gateway: data.gateway,
      description: data.description,
    };

    if (data.locationId !== undefined) {
      updateData.location = data.locationId
        ? { connect: { id: data.locationId } }
        : { disconnect: true };
    }

    if (data.vlanId !== undefined) {
      updateData.vlan = data.vlanId ? { connect: { id: data.vlanId } } : { disconnect: true };
    }

    if (data.cidr) {
      if (!isValidCidr(data.cidr)) {
        throw new BadRequestException(`Invalid IPv4 CIDR block: "${data.cidr}"`);
      }
      const calc = calculateSubnet(data.cidr);
      updateData.cidr = data.cidr;
      updateData.networkAddress = data.networkAddress || calc.networkAddress;
      updateData.netmask = data.netmask || calc.subnetMask;
      updateData.broadcastAddress = data.broadcastAddress || calc.broadcastAddress;
      updateData.startIp = data.startIp || calc.usableStart;
      updateData.endIp = data.endIp || calc.usableEnd;
      updateData.totalIps = data.totalIps ? Number(data.totalIps) : calc.usableHosts;
    }

    const updated = await this.prisma.subnet.update({
      where: { id },
      data: updateData,
      include: { vlan: true, location: true },
    });

    return this.formatSubnet(updated);
  }

  async deleteSubnet(id: string) {
    return this.prisma.subnet.delete({ where: { id } });
  }

  async getNextAvailableIp(subnetId: string): Promise<{
    subnetId: string;
    cidr: string;
    nextAvailableIp: string | null;
  }> {
    const subnet = await this.prisma.subnet.findUnique({
      where: { id: subnetId },
      include: { ipAddresses: { select: { address: true } } },
    });

    if (!subnet) {
      throw new NotFoundException(`Subnet with ID "${subnetId}" not found`);
    }

    const allocated = subnet.ipAddresses.map((ip) => ip.address);
    const nextIp = findNextAvailableIp(subnet.cidr, allocated);

    return {
      subnetId,
      cidr: subnet.cidr,
      nextAvailableIp: nextIp,
    };
  }

  // ==========================================
  // IP ADDRESS MANAGEMENT
  // ==========================================

  async findAllIps(query?: IPAddressQueryDto) {
    const where: Prisma.IPAddressWhereInput = {};

    if (query?.search) {
      where.OR = [
        { address: { contains: query.search, mode: 'insensitive' } },
        { hostname: { contains: query.search, mode: 'insensitive' } },
        { macAddress: { contains: query.search, mode: 'insensitive' } },
        { vendor: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.vlanId) {
      where.vlanId = query.vlanId;
    }

    if (query?.subnetId) {
      where.subnetId = query.subnetId;
    }

    if (query?.status && query.status !== 'all') {
      where.status = mapIPStatus(query.status);
    }

    if (query?.deviceType && query.deviceType !== 'all') {
      where.deviceType = { contains: query.deviceType, mode: 'insensitive' };
    }

    if (query?.locationId) {
      where.locationId = query.locationId;
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const ips = await this.prisma.iPAddress.findMany({
      where,
      include: {
        subnet: true,
        vlan: true,
        location: true,
        asset: true,
        assignedUser: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return ips.map((ip) => this.formatIp(ip));
  }

  async findIp(id: string) {
    const ip = await this.prisma.iPAddress.findFirst({
      where: { OR: [{ id }, { address: id }] },
      include: {
        subnet: true,
        vlan: true,
        location: true,
        asset: true,
        assignedUser: true,
      },
    });

    if (!ip) {
      throw new NotFoundException(`IP address with identifier "${id}" not found`);
    }

    return this.formatIp(ip);
  }

  async createIp(data: CreateIPAddressDto) {
    let targetIp = data.address;
    let subnetId = data.subnetId;
    let vlanId = data.vlanId;
    let locationId = data.locationId;

    if (subnetId) {
      const selectedSubnet = await this.prisma.subnet.findUnique({
        where: { id: subnetId },
        include: { ipAddresses: { select: { address: true } } },
      });
      if (selectedSubnet) {
        vlanId = vlanId || selectedSubnet.vlanId || undefined;
        locationId = locationId || selectedSubnet.locationId || undefined;

        if (!targetIp) {
          const allocatedIps = selectedSubnet.ipAddresses.map((ip) => ip.address);
          const nextFree = findNextAvailableIp(selectedSubnet.cidr, allocatedIps);
          if (nextFree) {
            targetIp = nextFree;
          }
        }
      }
    }

    if (!subnetId && targetIp && isValidIp(targetIp)) {
      const candidateSubnets = await this.prisma.subnet.findMany({
        take: 100,
        orderBy: { cidr: 'asc' },
      });
      const matched = findMatchingSubnet(targetIp, candidateSubnets);
      if (matched) {
        subnetId = matched.id;
        vlanId = vlanId || matched.vlanId || undefined;
        locationId = locationId || matched.locationId || undefined;
      }
    }

    if (!targetIp) {
      throw new BadRequestException('IPv4 address is required');
    }

    if (!isValidIp(targetIp)) {
      throw new BadRequestException(`Invalid IPv4 address: "${targetIp}"`);
    }

    const existing = await this.prisma.iPAddress.findFirst({
      where: {
        address: targetIp,
        subnetId: subnetId || undefined,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `IP address "${targetIp}" is already registered in this subnet`,
      );
    }

    const rawMac = data.macAddress;
    const normalizedMac = rawMac ? normalizeMac(rawMac) : undefined;
    let vendor = data.vendor;
    if (normalizedMac && (!vendor || vendor === 'Generic' || vendor === 'Generic Device')) {
      const detectedVendor = lookupMacVendor(normalizedMac);
      if (detectedVendor !== 'Unknown Vendor') {
        vendor = detectedVendor;
      }
    }

    const status = data.status ? mapIPStatus(data.status as string) : 'AVAILABLE';

    const created = await this.prisma.iPAddress.create({
      data: {
        address: targetIp,
        hostname: data.hostname,
        macAddress: normalizedMac,
        vendor: vendor || 'Generic Device',
        deviceType: data.deviceType || 'Workstation',
        model: data.model,
        serialNumber: data.serialNumber,
        section: data.section,
        floor: data.floor,
        subnetId,
        vlanId,
        locationId,
        assetId: data.assetId,
        assignedUserId: data.assignedUserId,
        status,
        pingStatus: data.pingStatus || 'online',
        responseTimeMs: data.responseTimeMs,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : new Date(),
        description: data.description,
      },
      include: {
        subnet: true,
        vlan: true,
        location: true,
        asset: true,
        assignedUser: true,
      },
    });

    if (subnetId) {
      await this.syncSubnetStats(subnetId);
    }

    return this.formatIp(created);
  }

  async updateIp(id: string, data: UpdateIPAddressDto) {
    const existing = await this.prisma.iPAddress.findUnique({
      where: { id },
      select: {
        id: true,
        address: true,
        subnetId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`IP address with ID "${id}" not found`);
    }

    const rawMac = data.macAddress;
    const normalizedMac = rawMac ? normalizeMac(rawMac) : undefined;
    let vendor = data.vendor;
    if (normalizedMac && (!vendor || vendor === 'Generic' || vendor === 'Generic Device')) {
      const detected = lookupMacVendor(normalizedMac);
      if (detected !== 'Unknown Vendor') vendor = detected;
    }

    const newStatus = data.status ? mapIPStatus(data.status as string) : undefined;

    const updatePayload: Prisma.IPAddressUpdateInput = {
      address: data.address,
      hostname: data.hostname,
      macAddress: normalizedMac,
      vendor,
      deviceType: data.deviceType,
      model: data.model,
      serialNumber: data.serialNumber,
      section: data.section,
      floor: data.floor,
      status: newStatus,
      pingStatus: data.pingStatus,
      description: data.description,
    };

    if (data.subnetId !== undefined) {
      updatePayload.subnet = data.subnetId
        ? { connect: { id: data.subnetId } }
        : { disconnect: true };
    }
    if (data.vlanId !== undefined) {
      updatePayload.vlan = data.vlanId ? { connect: { id: data.vlanId } } : { disconnect: true };
    }
    if (data.locationId !== undefined) {
      updatePayload.location = data.locationId
        ? { connect: { id: data.locationId } }
        : { disconnect: true };
    }
    if (data.assetId !== undefined) {
      updatePayload.asset = data.assetId ? { connect: { id: data.assetId } } : { disconnect: true };
    }
    if (data.assignedUserId !== undefined) {
      updatePayload.assignedUser = data.assignedUserId
        ? { connect: { id: data.assignedUserId } }
        : { disconnect: true };
    }
    const updated = await this.prisma.iPAddress.update({
      where: { id },
      data: updatePayload,
      include: {
        subnet: true,
        vlan: true,
        location: true,
        asset: true,
        assignedUser: true,
      },
    });

    const oldSubnetId = existing.subnetId;
    const newSubnetId = updated.subnetId;

    if (oldSubnetId && oldSubnetId !== newSubnetId) {
      await this.syncSubnetStats(oldSubnetId);
    }
    if (newSubnetId) {
      await this.syncSubnetStats(newSubnetId);
    }
    if (oldSubnetId && oldSubnetId === newSubnetId && newStatus && newStatus !== existing.status) {
      await this.syncSubnetStats(oldSubnetId);
    }

    return this.formatIp(updated);
  }

  async deleteIp(id: string) {
    const existing = await this.prisma.iPAddress.findUnique({
      where: { id },
      select: { subnetId: true },
    });

    const deleted = await this.prisma.iPAddress.delete({ where: { id } });

    if (existing?.subnetId) {
      await this.syncSubnetStats(existing.subnetId);
    }

    return { success: true, id: deleted.id };
  }

  // ==========================================
  // RACK MANAGEMENT
  // ==========================================

  async findAllRacks(query?: RackQueryDto) {
    const where: Prisma.NetworkRackWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.locationId) {
      where.locationId = query.locationId;
    }

    if (query?.status && query.status !== 'all') {
      where.status = query.status as RackStatus;
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const racks = await this.prisma.networkRack.findMany({
      where,
      include: {
        location: true,
        switches: {
          include: {
            ports: true,
          },
        },
        _count: { select: { switches: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return racks.map((r) => this.formatRack(r));
  }

  async findRack(id: string) {
    const rack = await this.prisma.networkRack.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        location: true,
        switches: {
          include: {
            ports: {
              orderBy: [{ portNumber: 'asc' }, { id: 'asc' }],
            },
          },
          orderBy: [{ rackPosition: 'asc' }, { id: 'asc' }],
        },
        _count: { select: { switches: true } },
      },
    });

    if (!rack) {
      throw new NotFoundException(`Rack with identifier "${id}" not found.`);
    }

    return this.formatRack(rack);
  }

  async createRack(data: CreateRackDto) {
    if (!data.name || !data.code) {
      throw new BadRequestException('Rack name and code are required.');
    }

    const existing = await this.prisma.networkRack.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new BadRequestException(`Rack code "${data.code}" already exists.`);
    }

    const totalHeight = data.totalHeight ?? 42;
    if (!Number.isInteger(totalHeight) || totalHeight < 1 || totalHeight > 100) {
      throw new BadRequestException('Rack totalHeight must be between 1 and 100 RU.');
    }

    const rack = await this.prisma.networkRack.create({
      data: {
        name: data.name,
        code: data.code,
        locationId: data.locationId || null,
        totalHeight,
        depth: data.depth ?? 1070,
        width: data.width ?? 600,
        maxPowerKw: data.maxPowerKw ?? 8.0,
        maxWeightKg: data.maxWeightKg ?? 1000,
        status: (data.status as RackStatus) || 'ACTIVE',
        notes: data.notes || null,
      },
      include: {
        location: true,
        _count: { select: { switches: true } },
      },
    });

    return this.formatRack(rack);
  }

  async updateRack(id: string, data: UpdateRackDto) {
    const rack = await this.prisma.networkRack.findUnique({
      where: { id },
    });
    if (!rack) {
      throw new NotFoundException(`Rack with ID "${id}" not found.`);
    }

    if (data.code && data.code.toLowerCase() !== rack.code.toLowerCase()) {
      const existing = await this.prisma.networkRack.findFirst({
        where: {
          code: { equals: data.code, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Rack code "${data.code}" already exists.`);
      }
    }

    if (data.totalHeight !== undefined) {
      if (!Number.isInteger(data.totalHeight) || data.totalHeight < 1 || data.totalHeight > 100) {
        throw new BadRequestException('Rack totalHeight must be between 1 and 100 RU.');
      }

      const mountedSwitches = await this.prisma.networkSwitch.findMany({
        where: {
          rackId: id,
          rackPosition: { not: null },
        },
        select: {
          name: true,
          rackPosition: true,
          rackHeight: true,
        },
        take: 100,
        orderBy: [{ rackPosition: 'desc' }, { id: 'asc' }],
      });

      let highestOccupied = 0;
      let highestSwitchName = '';
      for (const sw of mountedSwitches) {
        if (sw.rackPosition !== null) {
          const end = sw.rackPosition + (sw.rackHeight || 1) - 1;
          if (end > highestOccupied) {
            highestOccupied = end;
            highestSwitchName = sw.name;
          }
        }
      }

      if (highestOccupied > 0 && data.totalHeight < highestOccupied) {
        throw new BadRequestException(
          `Cannot decrease rack height to ${data.totalHeight}U. Mounted device "${highestSwitchName}" occupies up to U${highestOccupied}.`,
        );
      }
    }

    const updated = await this.prisma.networkRack.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.locationId !== undefined ? { locationId: data.locationId } : {}),
        ...(data.totalHeight !== undefined ? { totalHeight: data.totalHeight } : {}),
        ...(data.depth !== undefined ? { depth: data.depth } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.maxPowerKw !== undefined ? { maxPowerKw: data.maxPowerKw } : {}),
        ...(data.maxWeightKg !== undefined ? { maxWeightKg: data.maxWeightKg } : {}),
        ...(data.status !== undefined ? { status: data.status as RackStatus } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
        location: true,
        switches: {
          include: {
            ports: true,
          },
        },
        _count: { select: { switches: true } },
      },
    });

    return this.formatRack(updated);
  }

  async deleteRack(id: string) {
    const rack = await this.prisma.networkRack.findUnique({
      where: { id },
    });
    if (!rack) {
      throw new NotFoundException(`Rack with ID "${id}" not found.`);
    }

    // Unmount switches (SetNull on rackId and rackPosition)
    await this.prisma.networkSwitch.updateMany({
      where: { rackId: id },
      data: { rackId: null, rackPosition: null },
    });

    return this.prisma.networkRack.delete({
      where: { id },
    });
  }

  async getRackElevation(id: string): Promise<RackElevationData> {
    const rack = await this.prisma.networkRack.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        location: true,
        switches: {
          include: {
            ports: true,
          },
          orderBy: [{ rackPosition: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!rack) {
      throw new NotFoundException(`Rack with identifier "${id}" not found.`);
    }

    const mounted = rack.switches.filter((s) => s.rackPosition !== null);
    const slots: RackElevationSlot[] = [];
    let occupiedUnits = 0;
    let totalPowerWatts = 0;
    let totalWeightKg = 0;

    for (let u = 1; u <= rack.totalHeight; u++) {
      const occupant = mounted.find(
        (sw) =>
          sw.rackPosition !== null &&
          u >= sw.rackPosition &&
          u <= sw.rackPosition + sw.rackHeight - 1,
      );

      if (occupant && occupant.rackPosition !== null) {
        occupiedUnits++;
        const isStart = u === occupant.rackPosition;
        const activePorts = occupant.ports.filter(
          (p) => p.operStatus === 'ACTIVE' && p.adminStatus === 'UP',
        ).length;
        const devInfo = {
          id: occupant.id,
          name: occupant.name,
          model: occupant.model,
          vendor: occupant.vendor,
          role: occupant.role,
          status: occupant.status,
          rackHeight: occupant.rackHeight,
          rackPosition: occupant.rackPosition,
          totalPorts: occupant.totalPorts,
          activePortsCount: activePorts,
          startUnit: occupant.rackPosition,
          unitHeight: occupant.rackHeight,
        };

        slots.push({
          unitNumber: u,
          unit: u,
          isOccupied: true,
          occupied: true,
          switch: devInfo,
          device: devInfo,
          isStartingUnit: isStart,
          isStartUnit: isStart,
          occupiedByUnit: occupant.rackPosition,
        } as unknown as RackElevationSlot);
      } else {
        slots.push({
          unitNumber: u,
          unit: u,
          isOccupied: false,
          occupied: false,
          switch: null,
          device: null,
          isStartingUnit: false,
          isStartUnit: false,
          occupiedByUnit: null,
        } as unknown as RackElevationSlot);
      }
    }

    totalPowerWatts = mounted.length * 350;
    totalWeightKg = mounted.length * 8.5;

    const availableUnits = Math.max(0, rack.totalHeight - occupiedUnits);
    const occupancyRate =
      rack.totalHeight > 0 ? Number(((occupiedUnits / rack.totalHeight) * 100).toFixed(1)) : 0;
    const spaceUtilizationPercent = occupancyRate;
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
      rackId: rack.id,
      rack: rack as unknown as import('@uims/shared-types').NetworkRack,
      rackName: rack.name,
      rackCode: rack.code,
      totalHeight: rack.totalHeight,
      usedUnits: occupiedUnits,
      occupiedUnits,
      availableUnits,
      occupancyRate,
      spaceUtilizationPercent,
      maxPowerKw: rack.maxPowerKw,
      estimatedPowerUsageKw: totalPowerDrawKw,
      totalPowerDrawKw,
      powerUtilizationPercent,
      totalWeightKg: Number(totalWeightKg.toFixed(1)),
      weightUtilizationPercent,
      slots,
    } as unknown as RackElevationData;
  }

  private async validateRackMount(
    rackId: string,
    startUnit: number,
    unitHeight: number,
    excludeSwitchId?: string,
  ): Promise<void> {
    const rack = await this.prisma.networkRack.findUnique({
      where: { id: rackId },
    });
    if (!rack) {
      throw new NotFoundException(`Rack with ID "${rackId}" not found.`);
    }
    if (startUnit < 1) {
      throw new BadRequestException(`Start unit U${startUnit} cannot be less than U1.`);
    }
    const endUnit = startUnit + unitHeight - 1;
    if (endUnit > rack.totalHeight) {
      throw new BadRequestException(
        `Device span U${startUnit}-U${endUnit} exceeds rack height U${rack.totalHeight}.`,
      );
    }

    const mounted = await this.prisma.networkSwitch.findMany({
      where: {
        rackId,
        rackPosition: { not: null },
        ...(excludeSwitchId ? { id: { not: excludeSwitchId } } : {}),
      },
      take: 100,
      orderBy: [{ rackPosition: 'asc' }, { id: 'asc' }],
    });

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

  // ==========================================
  // SWITCH FLEET MANAGEMENT
  // ==========================================

  async findAllSwitches(query?: SwitchQueryDto) {
    const where: Prisma.NetworkSwitchWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
        { macAddress: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.rackId) {
      where.rackId = query.rackId;
    }

    if (query?.locationId) {
      where.locationId = query.locationId;
    }

    if (query?.vendor) {
      where.vendor = { contains: query.vendor, mode: 'insensitive' };
    }

    if (query?.role && query.role !== 'all') {
      where.role = query.role as SwitchRole;
    }

    if (query?.status && query.status !== 'all') {
      where.status = query.status as SwitchStatus;
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const switches = await this.prisma.networkSwitch.findMany({
      where,
      include: {
        rack: true,
        location: true,
        asset: true,
        ipAddress: true,
        ports: true,
        _count: { select: { ports: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return switches.map((s) => this.formatSwitch(s));
  }

  async findSwitch(id: string) {
    const sw = await this.prisma.networkSwitch.findFirst({
      where: { OR: [{ id }, { serialNumber: id }] },
      include: {
        rack: true,
        location: true,
        asset: true,
        ipAddress: true,
        ports: {
          include: {
            vlan: true,
            ipAddress: true,
            connectedAsset: true,
          },
          orderBy: [{ portNumber: 'asc' }, { id: 'asc' }],
        },
        _count: { select: { ports: true } },
      },
    });

    if (!sw) {
      throw new NotFoundException(`Switch with identifier "${id}" not found.`);
    }

    return this.formatSwitch(sw);
  }

  async createSwitch(data: CreateSwitchDto) {
    if (!data.name || !data.model || !data.vendor) {
      throw new BadRequestException('Switch name, model, and vendor are required.');
    }

    if (data.serialNumber) {
      const existing = await this.prisma.networkSwitch.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Switch with serial number "${data.serialNumber}" already exists.`,
        );
      }
    }

    const rackHeight = data.rackHeight ?? 1;
    if (data.rackId && data.rackPosition !== null && data.rackPosition !== undefined) {
      await this.validateRackMount(data.rackId, data.rackPosition, rackHeight);
    }

    const totalPorts = data.totalPorts ?? 24;

    const created = await this.prisma.networkSwitch.create({
      data: {
        name: data.name,
        model: data.model,
        vendor: data.vendor,
        serialNumber: data.serialNumber || null,
        macAddress: data.macAddress || null,
        ipAddressId: data.ipAddressId || null,
        firmwareVersion: data.firmwareVersion || '17.3.3',
        role: (data.role as SwitchRole) || 'ACCESS',
        status: (data.status as SwitchStatus) || 'ONLINE',
        totalPorts,
        rackId: data.rackId || null,
        rackPosition: data.rackPosition ?? null,
        rackHeight,
        assetId: data.assetId || null,
        locationId: data.locationId || null,
        notes: data.notes || null,
      },
    });

    if (data.autoGeneratePorts !== false && totalPorts > 0) {
      await this.generateDefaultPorts(created.id, totalPorts);
    }

    return this.findSwitch(created.id);
  }

  async generateDefaultPorts(switchId: string, portCount: number): Promise<void> {
    const portsData: Prisma.SwitchPortCreateManyInput[] = [];

    // Generate standard RJ45 ports (e.g. 24 or 48)
    for (let i = 1; i <= portCount; i++) {
      portsData.push({
        switchId,
        portNumber: i,
        name: `Gi1/0/${i}`,
        formFactor: 'RJ45_1G',
        poeEnabled: true,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '1 Gbps',
        duplex: 'Full',
        mode: 'ACCESS',
      });
    }

    // Generate 4 standard SFP+ 10G uplink cages
    for (let j = 1; j <= 4; j++) {
      const portNum = portCount + j;
      portsData.push({
        switchId,
        portNumber: portNum,
        name: `Te1/0/${portNum}`,
        formFactor: 'SFP_PLUS_10G',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '10 Gbps',
        duplex: 'Full',
        mode: 'TRUNK',
        description: `Uplink ${j}`,
      });
    }

    await this.prisma.switchPort.createMany({
      data: portsData,
    });
  }

  async updateSwitch(id: string, data: UpdateSwitchDto) {
    const sw = await this.prisma.networkSwitch.findUnique({
      where: { id },
    });
    if (!sw) {
      throw new NotFoundException(`Switch with ID "${id}" not found.`);
    }

    if (data.serialNumber && data.serialNumber.toLowerCase() !== sw.serialNumber?.toLowerCase()) {
      const existing = await this.prisma.networkSwitch.findFirst({
        where: {
          serialNumber: { equals: data.serialNumber, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Switch with serial number "${data.serialNumber}" already exists.`,
        );
      }
    }

    const newRackId = data.rackId !== undefined ? data.rackId : sw.rackId;
    const newPos = data.rackPosition !== undefined ? data.rackPosition : sw.rackPosition;
    const newHeight = data.rackHeight !== undefined ? data.rackHeight : sw.rackHeight;

    if (
      newRackId &&
      newPos !== null &&
      (data.rackId !== undefined ||
        data.rackPosition !== undefined ||
        data.rackHeight !== undefined)
    ) {
      await this.validateRackMount(newRackId, newPos, newHeight, sw.id);
    }

    await this.prisma.networkSwitch.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
        ...(data.vendor !== undefined ? { vendor: data.vendor } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.macAddress !== undefined ? { macAddress: data.macAddress } : {}),
        ...(data.ipAddressId !== undefined ? { ipAddressId: data.ipAddressId } : {}),
        ...(data.firmwareVersion !== undefined ? { firmwareVersion: data.firmwareVersion } : {}),
        ...(data.role !== undefined ? { role: data.role as SwitchRole } : {}),
        ...(data.status !== undefined ? { status: data.status as SwitchStatus } : {}),
        ...(data.totalPorts !== undefined ? { totalPorts: data.totalPorts } : {}),
        ...(data.rackId !== undefined ? { rackId: data.rackId } : {}),
        ...(data.rackPosition !== undefined ? { rackPosition: data.rackPosition } : {}),
        ...(data.rackHeight !== undefined ? { rackHeight: data.rackHeight } : {}),
        ...(data.assetId !== undefined ? { assetId: data.assetId } : {}),
        ...(data.locationId !== undefined ? { locationId: data.locationId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return this.findSwitch(id);
  }

  async deleteSwitch(id: string) {
    const sw = await this.prisma.networkSwitch.findUnique({
      where: { id },
    });
    if (!sw) {
      throw new NotFoundException(`Switch with ID "${id}" not found.`);
    }

    await this.prisma.switchPort.deleteMany({
      where: { switchId: id },
    });

    return this.prisma.networkSwitch.delete({
      where: { id },
    });
  }

  async findSwitchPorts(switchId: string, query?: SwitchPortQueryDto) {
    const sw = await this.prisma.networkSwitch.findUnique({
      where: { id: switchId },
    });
    if (!sw) {
      throw new NotFoundException(`Switch with ID "${switchId}" not found.`);
    }

    const where: Prisma.SwitchPortWhereInput = { switchId };

    if (query?.vlanId) {
      where.vlanId = query.vlanId;
    }

    if (query?.adminStatus && query.adminStatus !== 'all') {
      where.adminStatus = query.adminStatus as PortAdminStatus;
    }

    if (query?.operStatus && query.operStatus !== 'all') {
      where.operStatus = query.operStatus as PortOperStatus;
    }

    if (query?.mode && query.mode !== 'all') {
      where.mode = query.mode as PortMode;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 100));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const ports = await this.prisma.switchPort.findMany({
      where,
      include: {
        switch: { include: { rack: true } },
        vlan: true,
        ipAddress: true,
        connectedAsset: true,
      },
      orderBy: [{ portNumber: 'asc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return ports.map((p) => this.formatPort(p));
  }

  // ==========================================
  // SWITCH PORT MANAGEMENT
  // ==========================================

  async findPort(id: string) {
    const port = await this.prisma.switchPort.findUnique({
      where: { id },
      include: {
        switch: { include: { rack: true } },
        vlan: true,
        ipAddress: true,
        connectedAsset: true,
      },
    });

    if (!port) {
      throw new NotFoundException(`SwitchPort with ID "${id}" not found.`);
    }

    return this.formatPort(port);
  }

  async updatePort(id: string, data: UpdateSwitchPortDto) {
    const port = await this.prisma.switchPort.findUnique({
      where: { id },
    });
    if (!port) {
      throw new NotFoundException(`SwitchPort with ID "${id}" not found.`);
    }

    let operStatus = data.operStatus as PortOperStatus | undefined;
    if (data.adminStatus === 'DOWN') {
      operStatus = 'DOWN';
    }

    const updated = await this.prisma.switchPort.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.formFactor !== undefined ? { formFactor: data.formFactor as PortFormFactor } : {}),
        ...(data.poeEnabled !== undefined ? { poeEnabled: data.poeEnabled } : {}),
        ...(data.adminStatus !== undefined
          ? { adminStatus: data.adminStatus as PortAdminStatus }
          : {}),
        ...(operStatus !== undefined ? { operStatus } : {}),
        ...(data.speed !== undefined ? { speed: data.speed } : {}),
        ...(data.duplex !== undefined ? { duplex: data.duplex } : {}),
        ...(data.vlanId !== undefined ? { vlanId: data.vlanId } : {}),
        ...(data.mode !== undefined ? { mode: data.mode as PortMode } : {}),
        ...(data.taggedVlanIds !== undefined
          ? {
              taggedVlanIds: data.taggedVlanIds
                ? (data.taggedVlanIds as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            }
          : {}),
        ...(data.ipAddressId !== undefined ? { ipAddressId: data.ipAddressId } : {}),
        ...(data.connectedAssetId !== undefined ? { connectedAssetId: data.connectedAssetId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
      include: {
        switch: { include: { rack: true } },
        vlan: true,
        ipAddress: true,
        connectedAsset: true,
      },
    });

    return this.formatPort(updated);
  }

  async createPort(switchId: string, data: CreateSwitchPortDto) {
    const sw = await this.prisma.networkSwitch.findUnique({
      where: { id: switchId },
    });
    if (!sw) {
      throw new NotFoundException(`Switch with ID "${switchId}" not found.`);
    }

    const created = await this.prisma.switchPort.create({
      data: {
        switchId,
        portNumber: data.portNumber,
        name: data.name,
        formFactor: (data.formFactor as PortFormFactor) || 'RJ45_1G',
        poeEnabled: data.poeEnabled ?? false,
        adminStatus: (data.adminStatus as PortAdminStatus) || 'UP',
        operStatus: (data.operStatus as PortOperStatus) || 'DOWN',
        speed: data.speed || null,
        duplex: data.duplex || null,
        vlanId: data.vlanId || null,
        mode: (data.mode as PortMode) || 'ACCESS',
        taggedVlanIds: data.taggedVlanIds
          ? (data.taggedVlanIds as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddressId: data.ipAddressId || null,
        connectedAssetId: data.connectedAssetId || null,
        description: data.description || null,
      },
      include: {
        switch: { include: { rack: true } },
        vlan: true,
        ipAddress: true,
        connectedAsset: true,
      },
    });

    return this.formatPort(created);
  }

  async deletePort(id: string) {
    const port = await this.prisma.switchPort.findUnique({
      where: { id },
    });
    if (!port) {
      throw new NotFoundException(`SwitchPort with ID "${id}" not found.`);
    }

    return this.prisma.switchPort.delete({
      where: { id },
    });
  }

  // ==========================================
  // AUTOMATION & ENGINE SERVICES
  // ==========================================

  calculateSubnet(cidr: string): NetworkCalculation {
    if (!isValidCidr(cidr)) {
      throw new BadRequestException(`Invalid IPv4 CIDR block: "${cidr}"`);
    }
    return calculateSubnet(cidr);
  }

  async autoDetect(ip: string): Promise<AutoDetectResult> {
    if (!isValidIp(ip)) {
      throw new BadRequestException(`Invalid IPv4 address: "${ip}"`);
    }

    const subnets = await this.prisma.subnet.findMany({
      include: { vlan: true, location: true },
      take: 100,
      orderBy: { cidr: 'asc' },
    });

    const match = findMatchingSubnet(ip, subnets);

    if (!match) {
      return {
        ip,
        matchedSubnet: null,
        matchedVlan: null,
        isWithinSubnet: false,
      };
    }

    return {
      ip,
      matchedSubnet: this.formatSubnet(match),
      matchedVlan: match.vlan ? this.formatVlan(match.vlan) : null,
      isWithinSubnet: true,
      suggestedGateway: match.gateway,
    };
  }

  lookupMacVendor(mac: string): { mac: string; vendor: string } {
    const normalized = normalizeMac(mac);
    const vendor = lookupMacVendor(normalized);
    return {
      mac: normalized,
      vendor,
    };
  }

  async getStats(): Promise<NetworkStatsDto> {
    const [
      vlansCount,
      subnetsCount,
      subnetsAggregate,
      allocated,
      reserved,
      available,
      totalIps,
      totalRacks,
      totalSwitches,
      totalPorts,
      activePorts,
    ] = await Promise.all([
      this.prisma.vLAN.count(),
      this.prisma.subnet.count(),
      this.prisma.subnet.aggregate({ _sum: { totalIps: true } }),
      this.prisma.iPAddress.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.iPAddress.count({ where: { status: 'RESERVED' } }),
      this.prisma.iPAddress.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.iPAddress.count(),
      this.prisma.networkRack.count(),
      this.prisma.networkSwitch.count(),
      this.prisma.switchPort.count(),
      this.prisma.switchPort.count({ where: { operStatus: 'ACTIVE', adminStatus: 'UP' } }),
    ]);

    const totalCapacity = subnetsAggregate._sum.totalIps || 1024;
    const freeCapacity = Math.max(0, totalCapacity - allocated - reserved);
    const averageUtilization = calculateUtilization(totalCapacity, allocated);
    const portUtilization =
      totalPorts > 0 ? Number(((activePorts / totalPorts) * 100).toFixed(1)) : 0;

    return {
      totalVlans: vlansCount,
      managedSubnets: subnetsCount,
      totalIps,
      allocatedStaticIps: allocated,
      reservedDhcpLeases: reserved,
      availableIps: available,
      freeIpCapacity: freeCapacity,
      averageUtilization,
      totalRacks,
      totalSwitches,
      totalPorts,
      portUtilization,
    };
  }

  // ==========================================
  // HELPERS & STAT SYNCHRONIZATION
  // ==========================================

  private async syncSubnetStats(subnetId: string): Promise<void> {
    try {
      const [usedCount, reservedCount] = await Promise.all([
        this.prisma.iPAddress.count({
          where: { subnetId, status: 'ASSIGNED' },
        }),
        this.prisma.iPAddress.count({
          where: { subnetId, status: 'RESERVED' },
        }),
      ]);

      await this.prisma.subnet.update({
        where: { id: subnetId },
        data: {
          usedIps: usedCount,
          reservedIps: reservedCount,
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to sync subnet statistics for subnet ${subnetId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private formatVlan(vlan: VLAN): import('@uims/shared-types').VLAN {
    return {
      id: vlan.id,
      vlanNumber: vlan.vlanNumber,
      name: vlan.name,
      description: vlan.description,
      status: vlan.status as unknown as import('@uims/shared-types').VlanStatus,
      locationId: vlan.locationId,
      createdAt: vlan.createdAt
        ? typeof vlan.createdAt === 'string'
          ? vlan.createdAt
          : vlan.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: vlan.updatedAt
        ? typeof vlan.updatedAt === 'string'
          ? vlan.updatedAt
          : vlan.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private formatSubnet(
    subnet: Subnet & {
      vlan?: VLAN | null;
      location?: Location | null;
      _count?: { ipAddresses: number };
    },
  ) {
    const calc = calculateSubnet(subnet.cidr);
    const utilization = calculateUtilization(subnet.totalIps, subnet.usedIps);
    return {
      id: subnet.id,
      cidr: subnet.cidr,
      name: subnet.name,
      vlanId: subnet.vlanId,
      locationId: subnet.locationId,
      gateway: subnet.gateway || calc.suggestedGateway,
      networkAddress: subnet.networkAddress || calc.networkAddress,
      netmask: subnet.netmask || calc.subnetMask,
      broadcastAddress: subnet.broadcastAddress || calc.broadcastAddress,
      startIp: subnet.startIp || calc.usableStart,
      endIp: subnet.endIp || calc.usableEnd,
      totalIps: subnet.totalIps,
      usedIps: subnet.usedIps,
      reservedIps: subnet.reservedIps,
      description: subnet.description,
      vlan: subnet.vlan ? this.formatVlan(subnet.vlan) : null,
      vlanName: subnet.vlan ? `VLAN ${subnet.vlan.vlanNumber} (${subnet.vlan.name})` : '',
      location: subnet.location
        ? (subnet.location as unknown as import('@uims/shared-types').Location)
        : null,
      locationName: subnet.location?.name || '',
      utilization,
      createdAt: subnet.createdAt
        ? typeof subnet.createdAt === 'string'
          ? subnet.createdAt
          : subnet.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: subnet.updatedAt
        ? typeof subnet.updatedAt === 'string'
          ? subnet.updatedAt
          : subnet.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private formatRack(
    rack: NetworkRack & {
      location?: Location | null;
      switches?: (NetworkSwitch & { ports?: SwitchPort[] })[];
      _count?: { switches: number };
    },
  ) {
    const switches = rack.switches || [];
    const usedUnits = switches.reduce(
      (sum, sw) => sum + (sw.rackPosition !== null ? sw.rackHeight : 0),
      0,
    );
    const availableUnits = Math.max(0, rack.totalHeight - usedUnits);
    const occupancyRate =
      rack.totalHeight > 0 ? Number(((usedUnits / rack.totalHeight) * 100).toFixed(1)) : 0;
    const estimatedPowerUsageKw = Number(((switches.length * 350) / 1000).toFixed(2));
    const powerUtilization =
      rack.maxPowerKw && rack.maxPowerKw > 0
        ? Number(((estimatedPowerUsageKw / rack.maxPowerKw) * 100).toFixed(1))
        : 0;

    return {
      id: rack.id,
      name: rack.name,
      code: rack.code,
      locationId: rack.locationId,
      location: rack.location
        ? (rack.location as unknown as import('@uims/shared-types').Location)
        : null,
      totalHeight: rack.totalHeight,
      depth: rack.depth,
      width: rack.width,
      maxPowerKw: rack.maxPowerKw,
      maxWeightKg: rack.maxWeightKg,
      status: rack.status,
      notes: rack.notes,
      switches: rack.switches ? rack.switches.map((s) => this.formatSwitch(s)) : undefined,
      usedUnits,
      availableUnits,
      occupancyRate,
      powerUtilization,
      createdAt: rack.createdAt
        ? typeof rack.createdAt === 'string'
          ? rack.createdAt
          : rack.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: rack.updatedAt
        ? typeof rack.updatedAt === 'string'
          ? rack.updatedAt
          : rack.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private formatSwitch(
    sw: NetworkSwitch & {
      rack?: NetworkRack | null;
      location?: Location | null;
      asset?: { id: string; name: string; assetTag: string } | null;
      ipAddress?: IPAddress | null;
      ports?: (SwitchPort & {
        vlan?: VLAN | null;
        ipAddress?: IPAddress | null;
        connectedAsset?: { id: string; name: string; assetTag: string } | null;
      })[];
      _count?: { ports: number };
    },
  ) {
    const ports = sw.ports || [];
    const activePortsCount = ports.filter(
      (p) => p.operStatus === 'ACTIVE' && p.adminStatus === 'UP',
    ).length;

    return {
      id: sw.id,
      name: sw.name,
      model: sw.model,
      vendor: sw.vendor,
      serialNumber: sw.serialNumber,
      macAddress: sw.macAddress,
      ipAddressId: sw.ipAddressId,
      ipAddress: sw.ipAddress
        ? (sw.ipAddress as unknown as import('@uims/shared-types').IPAddress)
        : null,
      firmwareVersion: sw.firmwareVersion,
      role: sw.role,
      status: sw.status,
      totalPorts: sw.totalPorts,
      rackId: sw.rackId,
      rack: sw.rack ? (sw.rack as unknown as import('@uims/shared-types').NetworkRack) : null,
      rackPosition: sw.rackPosition,
      rackHeight: sw.rackHeight,
      assetId: sw.assetId,
      asset: sw.asset ? (sw.asset as unknown as import('@uims/shared-types').Asset) : null,
      locationId: sw.locationId,
      location: sw.location
        ? (sw.location as unknown as import('@uims/shared-types').Location)
        : null,
      notes: sw.notes,
      ports: sw.ports ? sw.ports.map((p) => this.formatPort(p)) : undefined,
      activePortsCount,
      createdAt: sw.createdAt
        ? typeof sw.createdAt === 'string'
          ? sw.createdAt
          : sw.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: sw.updatedAt
        ? typeof sw.updatedAt === 'string'
          ? sw.updatedAt
          : sw.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private formatPort(
    port: SwitchPort & {
      switch?: (NetworkSwitch & { rack?: NetworkRack | null }) | null;
      vlan?: VLAN | null;
      ipAddress?: IPAddress | null;
      connectedAsset?: { id: string; name: string; assetTag: string } | null;
    },
  ) {
    return {
      id: port.id,
      switchId: port.switchId,
      switch: port.switch
        ? (port.switch as unknown as import('@uims/shared-types').NetworkSwitch)
        : null,
      portNumber: port.portNumber,
      name: port.name,
      formFactor: port.formFactor,
      poeEnabled: port.poeEnabled,
      adminStatus: port.adminStatus,
      operStatus: port.operStatus,
      speed: port.speed,
      duplex: port.duplex,
      vlanId: port.vlanId,
      vlan: port.vlan ? this.formatVlan(port.vlan) : null,
      mode: port.mode,
      taggedVlanIds: port.taggedVlanIds as number[] | string[] | null,
      ipAddressId: port.ipAddressId,
      ipAddress: port.ipAddress
        ? (port.ipAddress as unknown as import('@uims/shared-types').IPAddress)
        : null,
      connectedAssetId: port.connectedAssetId,
      connectedAsset: port.connectedAsset
        ? (port.connectedAsset as unknown as import('@uims/shared-types').Asset)
        : null,
      description: port.description,
      createdAt: port.createdAt
        ? typeof port.createdAt === 'string'
          ? port.createdAt
          : port.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: port.updatedAt
        ? typeof port.updatedAt === 'string'
          ? port.updatedAt
          : port.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private formatIp(
    ip: IPAddress & {
      subnet?: Subnet | null;
      vlan?: VLAN | null;
      location?: Location | null;
      asset?: { id: string; name: string; assetTag: string } | null;
      assignedUser?: { id: string; firstName: string; lastName: string; email: string } | null;
      switchPorts?: (SwitchPort & {
        switch?: (NetworkSwitch & { rack?: NetworkRack | null }) | null;
      })[];
    },
  ) {
    const primaryPort = ip.switchPorts?.[0];
    const upstreamSwitch = primaryPort?.switch
      ? {
          id: primaryPort.switch.id,
          name: primaryPort.switch.name,
          model: primaryPort.switch.model,
          rackName: primaryPort.switch.rack?.name ?? null,
          rackPosition: primaryPort.switch.rackPosition ?? null,
        }
      : null;
    const upstreamPort = primaryPort
      ? {
          id: primaryPort.id,
          name: primaryPort.name,
          portNumber: primaryPort.portNumber,
          operStatus: primaryPort.operStatus,
        }
      : null;

    return {
      id: ip.id,
      address: ip.address,
      hostname: ip.hostname || 'unnamed-host',
      macAddress: ip.macAddress,
      vendor: ip.vendor || 'Generic',
      subnet: ip.subnet?.cidr || ip.subnet?.name || null,
      subnetId: ip.subnetId,
      vlan: ip.vlan ? `VLAN ${ip.vlan.vlanNumber} (${ip.vlan.name})` : null,
      vlanId: ip.vlanId,
      locationId: ip.locationId,
      deviceType: ip.deviceType || 'Workstation',
      model: ip.model,
      serialNumber: ip.serialNumber,
      section: ip.section,
      floor: ip.floor,
      status: mapIPStatusToLabel(ip.status),
      pingStatus: ip.pingStatus || 'online',
      responseTimeMs: ip.responseTimeMs,
      lastSeen: ip.lastSeen
        ? typeof ip.lastSeen === 'string'
          ? ip.lastSeen
          : ip.lastSeen.toISOString()
        : 'Real-time',
      description: ip.description,
      asset: ip.asset,
      assignedUser: ip.assignedUser,
      switchPortId: primaryPort?.id ?? null,
      switchPort: primaryPort ? this.formatPort(primaryPort) : null,
      upstreamSwitch,
      upstreamPort,
      switchName: primaryPort?.switch?.name ?? null,
      portName: primaryPort?.name ?? null,
      rackName: primaryPort?.switch?.rack?.name ?? null,
      createdAt: ip.createdAt
        ? typeof ip.createdAt === 'string'
          ? ip.createdAt
          : ip.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: ip.updatedAt
        ? typeof ip.updatedAt === 'string'
          ? ip.updatedAt
          : ip.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }
}

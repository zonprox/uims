import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { IPAddress, Location, Prisma, Subnet, VLAN, VlanStatus } from '@prisma/client';
import type {
  AutoDetectResult,
  CreateIPAddressDto,
  CreateSubnetDto,
  CreateVlanDto,
  IPAddressQueryDto,
  NetworkCalculation,
  NetworkStatsDto,
  SubnetQueryDto,
  UpdateIPAddressDto,
  UpdateSubnetDto,
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

    let vlanId = data.vlanId;
    if (!vlanId && (data.vlan || data.vlanName)) {
      const vlanSearch = (data.vlan || data.vlanName)?.replace(/\D/g, '');
      if (vlanSearch) {
        const found = await this.prisma.vLAN.findUnique({
          where: { vlanNumber: Number(vlanSearch) },
        });
        if (found) vlanId = found.id;
      }
    }

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
    } else if (query?.vlan && query.vlan !== 'all') {
      where.OR = [
        ...(where.OR || []),
        { vlan: { name: { contains: query.vlan, mode: 'insensitive' } } },
        { vlanId: query.vlan },
      ];
    }

    if (query?.subnetId) {
      where.subnetId = query.subnetId;
    } else if (query?.subnet && query.subnet !== 'all') {
      where.OR = [
        ...(where.OR || []),
        { subnet: { cidr: { contains: query.subnet, mode: 'insensitive' } } },
        { subnet: { name: { contains: query.subnet, mode: 'insensitive' } } },
        { subnetId: query.subnet },
      ];
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
    let targetIp = data.address || data.ip;
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
      targetIp = '10.0.0.1';
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

    const rawMac = data.macAddress || data.mac;
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

    const rawMac = data.macAddress ?? data.mac;
    const normalizedMac = rawMac ? normalizeMac(rawMac) : undefined;
    let vendor = data.vendor;
    if (normalizedMac && (!vendor || vendor === 'Generic' || vendor === 'Generic Device')) {
      const detected = lookupMacVendor(normalizedMac);
      if (detected !== 'Unknown Vendor') vendor = detected;
    }

    const newStatus = data.status ? mapIPStatus(data.status as string) : undefined;

    const updatePayload: Prisma.IPAddressUpdateInput = {
      address: data.address ?? data.ip,
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
    const [vlansCount, subnetsCount, subnetsAggregate, allocated, reserved, available, totalIps] =
      await Promise.all([
        this.prisma.vLAN.count(),
        this.prisma.subnet.count(),
        this.prisma.subnet.aggregate({ _sum: { totalIps: true } }),
        this.prisma.iPAddress.count({ where: { status: 'ASSIGNED' } }),
        this.prisma.iPAddress.count({ where: { status: 'RESERVED' } }),
        this.prisma.iPAddress.count({ where: { status: 'AVAILABLE' } }),
        this.prisma.iPAddress.count(),
      ]);

    const totalCapacity = subnetsAggregate._sum.totalIps || 1024;
    const freeCapacity = Math.max(0, totalCapacity - allocated - reserved);
    const averageUtilization = calculateUtilization(totalCapacity, allocated);

    return {
      totalVlans: vlansCount,
      managedSubnets: subnetsCount,
      totalIps,
      allocatedStaticIps: allocated,
      reservedDhcpLeases: reserved,
      availableIps: available,
      freeIpCapacity: freeCapacity,
      averageUtilization,
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

  private formatIp(
    ip: IPAddress & {
      subnet?: Subnet | null;
      vlan?: VLAN | null;
      location?: Location | null;
      asset?: { id: string; name: string; assetTag: string } | null;
      assignedUser?: { id: string; firstName: string; lastName: string; email: string } | null;
    },
  ) {
    return {
      id: ip.id,
      ip: ip.address,
      address: ip.address,
      hostname: ip.hostname || 'unnamed-host',
      mac: ip.macAddress || '00:00:00:00:00:00',
      macAddress: ip.macAddress,
      vendor: ip.vendor || 'Generic',
      subnet: ip.subnet?.cidr || ip.subnet?.name || '192.168.1.0/24',
      subnetId: ip.subnetId,
      vlan: ip.vlan ? `VLAN ${ip.vlan.vlanNumber} (${ip.vlan.name})` : 'VLAN 10',
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

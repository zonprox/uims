import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  Prisma,
  type IPAddress,
  type NetworkDomain,
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
  type TopologyNodeType,
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
  NetworkTopologyData,
  RackElevationData,
  RackElevationSlot,
  RackQueryDto,
  SubnetQueryDto,
  SwitchPortQueryDto,
  SwitchQueryDto,
  TopologyEdge,
  TopologyNode,
  TopologySummaryMetrics,
  UpdateIPAddressDto,
  UpdateRackDto,
  UpdateSubnetDto,
  UpdateSwitchDto,
  UpdateSwitchPortDto,
  UpdateVlanDto,
  VlanQueryDto,
} from '@uims/shared-types';
import type { CreateTopologyLinkDto, TopologyQueryDto, UpdateTopologyLayoutDto } from './dto';
import {
  calculateSubnet,
  calculateUtilization,
  computeFieldDiff,
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
import { AuditService } from '../audit/audit.service';

export const STANDARD_RACK_HEIGHT = 42;

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

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

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    return this.prisma.vLAN.findMany({
      where,
      include: {
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
      },
      include: { subnets: true },
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
      },
      include: { subnets: true },
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

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const subnets = await this.prisma.subnet.findMany({
      where,
      include: {
        vlan: true,
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
      include: { vlan: true },
    });

    const formatted = this.formatSubnet(created);

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'SUBNET_CREATED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: formatted.id,
          severity: 'Info',
          status: 'Success',
          details: `Subnet "${formatted.name}" (${formatted.cidr}) created`,
          newValue: formatted as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for created subnet "${formatted.name}" (${formatted.id})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return formatted;
  }

  async updateSubnet(id: string, data: UpdateSubnetDto) {
    const existing = await this.prisma.subnet.findUnique({
      where: { id },
      include: { vlan: true },
    });

    const updateData: Prisma.SubnetUpdateInput = {
      name: data.name,
      gateway: data.gateway,
      description: data.description,
    };

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
      include: { vlan: true },
    });

    const formatted = this.formatSubnet(updated);

    if (this.auditService) {
      try {
        const diff = computeFieldDiff(
          existing as unknown as Record<string, unknown>,
          updated as unknown as Record<string, unknown>,
        );
        if (diff.hasChanges) {
          await this.auditService.logEvent({
            action: 'SUBNET_UPDATED',
            entity: 'NetworkSubnet',
            entityType: 'Network',
            entityId: id,
            severity: 'Info',
            status: 'Success',
            details: `Subnet "${formatted.name}" (${formatted.cidr}) updated (${diff.changedKeys.join(', ')})`,
            diffPayload: diff as unknown as Record<string, unknown>,
            oldValue: diff.oldValue ?? undefined,
            newValue: diff.newValue ?? undefined,
          });
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for updated subnet "${id}"`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return formatted;
  }

  async deleteSubnet(id: string) {
    const existing = await this.prisma.subnet.findUnique({ where: { id } });
    const deleted = await this.prisma.subnet.delete({ where: { id } });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'SUBNET_DELETED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: id,
          severity: 'Warning',
          status: 'Success',
          details: `Subnet "${existing?.name || deleted.name}" (${existing?.cidr || deleted.cidr}) deleted`,
          oldValue: (existing || deleted) as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for deleted subnet "${id}"`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return deleted;
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

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const ips = await this.prisma.iPAddress.findMany({
      where,
      include: {
        subnet: true,
        vlan: true,
        asset: { include: { deviceModel: true } },
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
        asset: { include: { deviceModel: true } },
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

    if (subnetId) {
      const selectedSubnet = await this.prisma.subnet.findUnique({
        where: { id: subnetId },
        include: { ipAddresses: { select: { address: true } } },
      });
      if (selectedSubnet) {
        vlanId = vlanId || selectedSubnet.vlanId || undefined;

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
        macAddress: normalizedMac,
        vendor: vendor || 'Generic Device',
        deviceType: data.deviceType || 'Workstation',
        model: data.model,
        serialNumber: data.serialNumber,
        section: data.section,
        floor: data.floor,
        subnetId,
        vlanId,
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
        asset: { include: { deviceModel: true } },
        assignedUser: true,
      },
    });

    if (subnetId) {
      await this.syncSubnetStats(subnetId);
    }

    const formatted = this.formatIp(created);

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'IP_ALLOCATED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: formatted.id,
          severity: 'Info',
          status: 'Success',
          details: `IP address "${formatted.address}" allocated (${formatted.deviceType || 'Device'})`,
          newValue: formatted as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for allocated IP "${formatted.address}" (${formatted.id})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return formatted;
  }

  async updateIp(id: string, data: UpdateIPAddressDto) {
    const existing = await this.prisma.iPAddress.findUnique({
      where: { id },
      include: {
        subnet: true,
        vlan: true,
        asset: { include: { deviceModel: true } },
        assignedUser: true,
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
        asset: { include: { deviceModel: true } },
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

    const formatted = this.formatIp(updated);

    if (this.auditService) {
      try {
        const diff = computeFieldDiff(
          existing as unknown as Record<string, unknown>,
          updated as unknown as Record<string, unknown>,
        );
        if (diff.hasChanges) {
          await this.auditService.logEvent({
            action: 'IP_UPDATED',
            entity: 'IPAddress',
            entityType: 'Network',
            entityId: id,
            severity: 'Info',
            status: 'Success',
            details: `IP address "${formatted.address}" updated (${diff.changedKeys.join(', ')})`,
            diffPayload: diff as unknown as Record<string, unknown>,
            oldValue: diff.oldValue ?? undefined,
            newValue: diff.newValue ?? undefined,
          });
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for updated IP "${id}"`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return formatted;
  }

  async deleteIp(id: string) {
    const existing = await this.prisma.iPAddress.findUnique({
      where: { id },
    });

    const deleted = await this.prisma.iPAddress.delete({ where: { id } });

    if (existing?.subnetId) {
      await this.syncSubnetStats(existing.subnetId);
    }

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'IP_RELEASED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: id,
          severity: 'Info',
          status: 'Success',
          details: `IP address "${existing?.address || id}" released`,
          oldValue: (existing || deleted) as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for released IP "${id}"`,
          error instanceof Error ? error.stack : undefined,
        );
      }
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

    if (query?.status && query.status !== 'all') {
      where.status = query.status as RackStatus;
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const racks = await this.prisma.networkRack.findMany({
      where,
      include: {
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

    const rack = await this.prisma.networkRack.create({
      data: {
        name: data.name,
        code: data.code,
        depth: data.depth ?? 1070,
        width: data.width ?? 600,
        maxPowerKw: data.maxPowerKw ?? 8.0,
        maxWeightKg: data.maxWeightKg ?? 1000,
        status: (data.status as RackStatus) || 'ACTIVE',
        notes: data.notes || null,
      },
      include: {
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

    const updated = await this.prisma.networkRack.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.depth !== undefined ? { depth: data.depth } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.maxPowerKw !== undefined ? { maxPowerKw: data.maxPowerKw } : {}),
        ...(data.maxWeightKg !== undefined ? { maxWeightKg: data.maxWeightKg } : {}),
        ...(data.status !== undefined ? { status: data.status as RackStatus } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
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

    for (let u = 1; u <= STANDARD_RACK_HEIGHT; u++) {
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

    const availableUnits = Math.max(0, STANDARD_RACK_HEIGHT - occupiedUnits);
    const occupancyRate = Number(((occupiedUnits / STANDARD_RACK_HEIGHT) * 100).toFixed(1));
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
      usedUnits: occupiedUnits,
      occupiedUnits,
      availableUnits,
      occupancyRate,
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
    if (endUnit > STANDARD_RACK_HEIGHT) {
      throw new BadRequestException(
        `Device span U${startUnit}-U${endUnit} exceeds rack height U${STANDARD_RACK_HEIGHT}.`,
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
        asset: { include: { deviceModel: true } },
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
        asset: { include: { deviceModel: true } },
        ipAddress: true,
        ports: {
          include: {
            vlan: true,
            ipAddress: true,
            connectedAsset: { include: { deviceModel: true } },
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

    const totalPorts = data.totalPorts ?? 24;
    if (totalPorts < 2 || totalPorts > 48 || totalPorts % 2 !== 0) {
      throw new BadRequestException(
        totalPorts % 2 !== 0
          ? 'Total ports must be an even number'
          : totalPorts < 2
            ? 'Total ports must be at least 2'
            : 'Total ports cannot exceed 48',
      );
    }

    const uplinkPorts =
      data.uplinkPorts !== undefined && data.uplinkPorts !== null ? data.uplinkPorts : 2;
    if (uplinkPorts < 0 || uplinkPorts > 8) {
      throw new BadRequestException(
        uplinkPorts < 0 ? 'Uplink ports cannot be negative' : 'Uplink ports cannot exceed 8',
      );
    }

    const fiberPorts =
      data.fiberPorts !== undefined && data.fiberPorts !== null ? data.fiberPorts : 2;
    if (fiberPorts < 0 || fiberPorts > 8) {
      throw new BadRequestException(
        fiberPorts < 0 ? 'Fiber ports cannot be negative' : 'Fiber ports cannot exceed 8',
      );
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
        uplinkPorts,
        fiberPorts,
        rackId: data.rackId || null,
        rackPosition: data.rackPosition ?? null,
        rackHeight,
        assetId: data.assetId || null,
        notes: data.notes || null,
      },
    });

    if (data.autoGeneratePorts !== false && (totalPorts > 0 || uplinkPorts > 0 || fiberPorts > 0)) {
      await this.generateDefaultPorts(
        created.id,
        totalPorts,
        uplinkPorts,
        fiberPorts,
        data.uplinkSpeed,
        data.fiberSpeed,
      );
    }

    return this.findSwitch(created.id);
  }

  async generateDefaultPorts(
    switchId: string,
    totalPorts: number,
    uplinkPorts: number = 2,
    fiberPorts: number = 2,
    uplinkSpeed?: string | null,
    fiberSpeed?: string | null,
  ): Promise<void> {
    const portsData: Prisma.SwitchPortCreateManyInput[] = [];

    // Bay 1: Standard RJ45 Access Ports (1..totalPorts)
    for (let i = 1; i <= totalPorts; i++) {
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
        description: `Access Port ${i}`,
      });
    }

    // Bay 2: Dedicated RJ45 Uplink Ports (totalPorts + 1 .. totalPorts + uplinkPorts)
    const resolvedUplinkSpeed = uplinkSpeed || '1 Gbps';
    for (let u = 1; u <= uplinkPorts; u++) {
      const portNum = totalPorts + u;
      portsData.push({
        switchId,
        portNumber: portNum,
        name: `Uplink ${u}`,
        formFactor: 'RJ45_1G',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: resolvedUplinkSpeed,
        duplex: 'Full',
        mode: 'TRUNK',
        description: `RJ45 Uplink ${u}`,
      });
    }

    // Bay 3: Dedicated Optical Fiber SFP/SFP+ Cages (totalPorts + uplinkPorts + 1 .. totalPorts + uplinkPorts + fiberPorts)
    const resolvedFiberSpeed = fiberSpeed || '10 Gbps';
    const fiberFormFactor = /10\s*G/i.test(resolvedFiberSpeed) ? 'SFP_PLUS_10G' : 'SFP_1G';

    for (let f = 1; f <= fiberPorts; f++) {
      const portNum = totalPorts + uplinkPorts + f;
      portsData.push({
        switchId,
        portNumber: portNum,
        name: `SFP ${f}`,
        formFactor: fiberFormFactor,
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: resolvedFiberSpeed,
        duplex: 'Full',
        mode: 'TRUNK',
        description: `Optical Fiber ${fiberFormFactor === 'SFP_PLUS_10G' ? 'SFP+' : 'SFP'} ${f}`,
      });
    }

    if (portsData.length > 0) {
      await this.prisma.switchPort.createMany({
        data: portsData,
      });
    }
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

    if (data.totalPorts !== undefined) {
      if (data.totalPorts < 2 || data.totalPorts > 48 || data.totalPorts % 2 !== 0) {
        throw new BadRequestException(
          data.totalPorts % 2 !== 0
            ? 'Total ports must be an even number'
            : data.totalPorts < 2
              ? 'Total ports must be at least 2'
              : 'Total ports cannot exceed 48',
        );
      }
    }

    if (data.uplinkPorts !== undefined && data.uplinkPorts !== null) {
      if (data.uplinkPorts < 0 || data.uplinkPorts > 8) {
        throw new BadRequestException(
          data.uplinkPorts < 0 ? 'Uplink ports cannot be negative' : 'Uplink ports cannot exceed 8',
        );
      }
    }

    if (data.fiberPorts !== undefined && data.fiberPorts !== null) {
      if (data.fiberPorts < 0 || data.fiberPorts > 8) {
        throw new BadRequestException(
          data.fiberPorts < 0 ? 'Fiber ports cannot be negative' : 'Fiber ports cannot exceed 8',
        );
      }
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
        ...(data.uplinkPorts !== undefined ? { uplinkPorts: data.uplinkPorts } : {}),
        ...(data.fiberPorts !== undefined ? { fiberPorts: data.fiberPorts } : {}),
        ...(data.rackId !== undefined ? { rackId: data.rackId } : {}),
        ...(data.rackPosition !== undefined ? { rackPosition: data.rackPosition } : {}),
        ...(data.rackHeight !== undefined ? { rackHeight: data.rackHeight } : {}),
        ...(data.assetId !== undefined ? { assetId: data.assetId } : {}),
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
        connectedAsset: { include: { deviceModel: true } },
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
        connectedAsset: { include: { deviceModel: true } },
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
        connectedAsset: { include: { deviceModel: true } },
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
        connectedAsset: { include: { deviceModel: true } },
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
      include: { vlan: true },
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
      domain: vlan.domain as unknown as import('@uims/shared-types').NetworkDomain,
      status: vlan.status as unknown as import('@uims/shared-types').VlanStatus,
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
      _count?: { ipAddresses: number };
    },
  ) {
    const calc = calculateSubnet(subnet.cidr);
    const utilization = calculateUtilization(subnet.totalIps, subnet.usedIps);
    return {
      id: subnet.id,
      cidr: subnet.cidr,
      name: subnet.name,
      domain: subnet.domain as unknown as import('@uims/shared-types').NetworkDomain,
      vlanId: subnet.vlanId,
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
      switches?: (NetworkSwitch & { ports?: SwitchPort[] })[];
      _count?: { switches: number };
    },
  ) {
    const switches = rack.switches || [];
    const usedUnits = switches.reduce(
      (sum, sw) => sum + (sw.rackPosition !== null ? sw.rackHeight : 0),
      0,
    );
    const availableUnits = Math.max(0, STANDARD_RACK_HEIGHT - usedUnits);
    const occupancyRate = Number(((usedUnits / STANDARD_RACK_HEIGHT) * 100).toFixed(1));
    const estimatedPowerUsageKw = Number(((switches.length * 350) / 1000).toFixed(2));
    const powerUtilization =
      rack.maxPowerKw && rack.maxPowerKw > 0
        ? Number(((estimatedPowerUsageKw / rack.maxPowerKw) * 100).toFixed(1))
        : 0;

    return {
      id: rack.id,
      name: rack.name,
      code: rack.code,
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
      asset?: {
        id: string;
        name?: string;
        assetTag?: string | null;
        subcode?: string | null;
        deviceModel?: { name?: string } | null;
      } | null;
      ipAddress?: IPAddress | null;
      ports?: (SwitchPort & {
        vlan?: VLAN | null;
        ipAddress?: IPAddress | null;
        connectedAsset?: {
          id: string;
          name?: string;
          assetTag?: string | null;
          subcode?: string | null;
          deviceModel?: { name?: string } | null;
        } | null;
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
      uplinkPorts: sw.uplinkPorts ?? null,
      fiberPorts: sw.fiberPorts ?? null,
      rackId: sw.rackId,
      rack: sw.rack ? (sw.rack as unknown as import('@uims/shared-types').NetworkRack) : null,
      rackPosition: sw.rackPosition,
      rackHeight: sw.rackHeight,
      assetId: sw.assetId,
      asset: sw.asset
        ? ({
            ...sw.asset,
            name:
              (sw.asset as { name?: string }).name ||
              (sw.asset as { deviceModel?: { name?: string } | null }).deviceModel?.name ||
              (sw.asset as { subcode?: string | null }).subcode ||
              'Asset',
            assetTag: sw.asset.assetTag || (sw.asset as { subcode?: string | null }).subcode || '',
          } as unknown as import('@uims/shared-types').Asset)
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
      connectedAsset?: {
        id: string;
        name?: string;
        assetTag?: string | null;
        subcode?: string | null;
        deviceModel?: { name?: string } | null;
      } | null;
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
        ? ({
            ...port.connectedAsset,
            name:
              port.connectedAsset.name ||
              port.connectedAsset.deviceModel?.name ||
              port.connectedAsset.subcode ||
              'Asset',
            assetTag: port.connectedAsset.assetTag || port.connectedAsset.subcode || '',
          } as unknown as import('@uims/shared-types').Asset)
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
      asset?: {
        id: string;
        name?: string;
        assetTag?: string | null;
        subcode?: string | null;
        deviceModel?: { name?: string } | null;
      } | null;
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
      macAddress: ip.macAddress,
      vendor: ip.vendor || 'Generic',
      subnet: ip.subnet?.cidr || ip.subnet?.name || null,
      subnetId: ip.subnetId,
      vlan: ip.vlan ? `VLAN ${ip.vlan.vlanNumber} (${ip.vlan.name})` : null,
      vlanId: ip.vlanId,
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
      asset: ip.asset
        ? {
            id: ip.asset.id,
            name: ip.asset.name || ip.asset.deviceModel?.name || 'Asset',
            assetTag: ip.asset.assetTag || ip.asset.subcode || '',
          }
        : null,
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

  // ==========================================
  // TOPOLOGY GRAPH ENGINE METHODS
  // ==========================================

  async getTopology(query: TopologyQueryDto): Promise<NetworkTopologyData> {
    const mode = query.mode || 'ALL';

    // 1. Determine switches query filter based on perspective
    const switchesWhere: Prisma.NetworkSwitchWhereInput = {};
    if (query.rackId) switchesWhere.rackId = query.rackId;
    if (query.status) switchesWhere.status = query.status as SwitchStatus;

    if (mode === 'NETWORK') {
      switchesWhere.domain = { in: ['NETWORK', 'SHARED'] };
    } else if (mode === 'CCTV') {
      switchesWhere.OR = [
        { domain: 'CCTV' },
        { role: 'POE_ACCESS' },
        { ports: { some: { vlan: { domain: 'CCTV' } } } },
      ];
    }

    // 2. Fetch all necessary data concurrently with bounded queries
    const [racks, switches, vlanRecords, subnetRecords, savedPositions] = await Promise.all([
      this.prisma.networkRack.findMany({
        orderBy: [{ code: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
      this.prisma.networkSwitch.findMany({
        where: switchesWhere,
        include: {
          rack: true,
          ipAddress: true,
          ports: {
            include: {
              vlan: true,
              connectedAsset: {
                include: {
                  deviceModel: { include: { category: true } },
                  assignedTo: true,
                  department: true,
                },
              },
              connectedPort: {
                include: { switch: true },
              },
              ipAddress: true,
            },
            orderBy: [{ portNumber: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        take: 200,
      }),
      this.prisma.vLAN.findMany({
        where: mode === 'ALL' ? {} : { domain: mode === 'CCTV' ? 'CCTV' : 'NETWORK' },
        include: { subnets: true, switchPorts: true },
        orderBy: [{ vlanNumber: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
      this.prisma.subnet.findMany({
        where: mode === 'ALL' ? {} : { domain: mode === 'CCTV' ? 'CCTV' : 'NETWORK' },
        orderBy: [{ cidr: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
      this.prisma.topologyNodePosition.findMany({
        where: { viewMode: mode },
        take: 1000,
      }),
    ]);

    // Fast coordinate lookup map: nodeId -> { x, y }
    const posMap = new Map<string, { x: number; y: number }>();
    for (const p of savedPositions) {
      posMap.set(p.nodeId, { x: p.positionX, y: p.positionY });
    }

    const nodes: TopologyNode[] = [];
    const edges: TopologyEdge[] = [];
    const processedEdgeIds = new Set<string>();
    const endpointNodeIds = new Set<string>();

    // 3. Assemble Switch Nodes
    switches.forEach((sw, idx) => {
      const activePorts = sw.ports.filter((p) => p.operStatus === 'ACTIVE').length;
      const poeActivePorts = sw.ports.filter(
        (p) => p.poeEnabled && p.operStatus === 'ACTIVE',
      ).length;
      const estimatedPoeWatts = poeActivePorts * 15.4;

      // Coordinate resolution: saved override -> direct coordinate -> auto-layout tier
      let x = sw.positionX ?? 300 + (idx % 4) * 260;
      let y = sw.positionY ?? (sw.role === 'CORE' ? 120 : sw.role === 'DISTRIBUTION' ? 280 : 460);
      if (posMap.has(sw.id)) {
        const saved = posMap.get(sw.id)!;
        x = saved.x;
        y = saved.y;
      }

      nodes.push({
        id: sw.id,
        label: sw.name,
        type: 'SWITCH',
        subType: sw.role,
        domain: sw.domain as 'NETWORK' | 'CCTV' | 'SHARED',
        status: (sw.status as 'ONLINE' | 'OFFLINE' | 'MAINTENANCE') || 'ONLINE',
        ipAddress: sw.ipAddress?.address,
        macAddress: sw.macAddress,
        model: sw.model,
        vendor: sw.vendor,
        serialNumber: sw.serialNumber,
        rackId: sw.rackId,
        rackName: sw.rack?.name,
        rackPosition: sw.rackPosition,
        totalPorts: sw.totalPorts,
        activePorts,
        poeActivePorts,
        poePowerWatts: estimatedPoeWatts,
        x,
        y,
        data: {
          role: sw.role,
          firmwareVersion: sw.firmwareVersion,
          uplinkPorts: sw.uplinkPorts,
          fiberPorts: sw.fiberPorts,
        },
      });

      // 4. Assemble Edges & Connected Endpoints
      for (const port of sw.ports) {
        // Inter-Switch Trunk Uplinks
        if (port.connectedPortId && port.connectedPort) {
          const peerSw = port.connectedPort.switch;
          if (peerSw) {
            const edgeKey = [port.id, port.connectedPortId].sort().join('--');
            if (!processedEdgeIds.has(edgeKey)) {
              processedEdgeIds.add(edgeKey);

              const edgeDomain: 'NETWORK' | 'CCTV' | 'SHARED' =
                sw.domain === 'CCTV' && peerSw.domain === 'CCTV'
                  ? 'CCTV'
                  : sw.domain === 'NETWORK' && peerSw.domain === 'NETWORK'
                    ? 'NETWORK'
                    : 'SHARED';

              edges.push({
                id: `edge-${edgeKey}`,
                source: sw.id,
                target: peerSw.id,
                sourcePortId: port.id,
                sourcePortName: port.name,
                targetPortId: port.connectedPort.id,
                targetPortName: port.connectedPort.name,
                linkType: 'UPLINK',
                mediaType: port.formFactor.includes('SFP') ? 'FIBER_SFP_PLUS' : 'COPPER',
                speed: port.speed || '10 Gbps',
                status: (port.operStatus as 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL') || 'DOWN',
                poeEnabled: port.poeEnabled,
                vlanId: port.vlanId,
                vlanNumber: port.vlan?.vlanNumber,
                taggedVlanIds: (port.taggedVlanIds as number[]) || [],
                domain: edgeDomain,
              });
            }
          }
        }

        // Endpoint Connections (Cameras, Servers, NVRs, APs)
        if (port.connectedAsset) {
          const asset = port.connectedAsset;
          const modelName = asset.deviceModel?.name || '';
          const categoryKey = asset.deviceModel?.category?.id || '';

          const isCamera =
            categoryKey.includes('cctv') ||
            categoryKey.includes('camera') ||
            modelName.toLowerCase().includes('cam') ||
            modelName.toLowerCase().includes('dome') ||
            modelName.toLowerCase().includes('bullet') ||
            modelName.toLowerCase().includes('terminal');

          const isNvr =
            modelName.toLowerCase().includes('nvr') ||
            modelName.toLowerCase().includes('video storage');

          const isServer =
            categoryKey.includes('server') || modelName.toLowerCase().includes('poweredge');

          const isAp =
            categoryKey.includes('ap') || modelName.toLowerCase().includes('access point');

          // Filter endpoints based on perspective
          if (mode === 'NETWORK' && isCamera) continue;
          if (mode === 'CCTV' && !isCamera && !isNvr) continue;

          let nodeType: TopologyNode['type'] = 'ASSET';
          if (isCamera) nodeType = 'CAMERA';
          else if (isNvr) nodeType = 'NVR';
          else if (isServer) nodeType = 'SERVER';
          else if (isAp) nodeType = 'ACCESS_POINT';

          const endpointDomain: 'NETWORK' | 'CCTV' = isCamera || isNvr ? 'CCTV' : 'NETWORK';

          if (!endpointNodeIds.has(asset.id)) {
            endpointNodeIds.add(asset.id);

            let epX = x + ((port.portNumber % 8) - 4) * 80;
            let epY = y + 160;
            if (posMap.has(asset.id)) {
              const saved = posMap.get(asset.id)!;
              epX = saved.x;
              epY = saved.y;
            }

            nodes.push({
              id: asset.id,
              label: asset.assetTag || modelName,
              type: nodeType,
              subType: asset.deviceModel?.modelCode || asset.deviceModel?.name,
              domain: endpointDomain,
              status:
                port.operStatus === 'ACTIVE'
                  ? 'ONLINE'
                  : port.operStatus === 'CONNECTED_NO_SIGNAL'
                    ? 'DEGRADED'
                    : 'OFFLINE',
              ipAddress: port.ipAddress?.address,
              model: modelName,
              vendor: asset.deviceModel?.manufacturer,
              serialNumber: asset.serialNumber,
              x: epX,
              y: epY,
              data: {
                assetTag: asset.assetTag,
                assignedUser:
                  asset.assignedTo?.displayName ||
                  (asset.assignedTo
                    ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`
                    : undefined),
                department: asset.department?.name,
                poeVoltage: port.poeEnabled ? '48V' : undefined,
              },
            });
          }

          edges.push({
            id: `edge-${port.id}-${asset.id}`,
            source: sw.id,
            target: asset.id,
            sourcePortId: port.id,
            sourcePortName: port.name,
            linkType: port.poeEnabled ? 'POE' : 'ENDPOINT',
            mediaType: 'COPPER',
            speed: port.speed || '1 Gbps',
            status: (port.operStatus as 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL') || 'DOWN',
            poeEnabled: port.poeEnabled,
            vlanId: port.vlanId,
            vlanNumber: port.vlan?.vlanNumber,
            domain: endpointDomain,
          });
        }
      }
    });

    // 5. Summary Metrics Aggregation
    const activeLinks = edges.filter((e) => e.status === 'ACTIVE').length;
    const degradedLinks = edges.filter((e) => e.status === 'CONNECTED_NO_SIGNAL').length;
    const downLinks = edges.filter((e) => e.status === 'DOWN').length;
    const poePowerWatts = edges
      .filter((e) => e.poeEnabled && e.status === 'ACTIVE')
      .reduce((sum) => sum + 15.4, 0);

    const summaryMetrics: TopologySummaryMetrics = {
      totalNodes: nodes.length,
      totalSwitches: nodes.filter((n) => n.type === 'SWITCH').length,
      totalRacks: racks.length,
      totalEndpoints: endpointNodeIds.size,
      totalCameras: nodes.filter((n) => n.type === 'CAMERA').length,
      totalNvrs: nodes.filter((n) => n.type === 'NVR').length,
      totalServers: nodes.filter((n) => n.type === 'SERVER').length,
      totalEdges: edges.length,
      activeLinks,
      degradedLinks,
      downLinks,
      poePowerUsageWatts: Math.round(poePowerWatts * 10) / 10,
      onlinePercentage: edges.length > 0 ? Math.round((activeLinks / edges.length) * 100) : 100,
    };

    return {
      nodes,
      edges,
      racks: racks.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        status: r.status,
        switchCount: switches.filter((s) => s.rackId === r.id).length,
        positionX: r.positionX,
        positionY: r.positionY,
      })),
      vlans: vlanRecords.map((v) => ({
        id: v.id,
        vlanNumber: v.vlanNumber,
        name: v.name,
        domain: v.domain as unknown as NetworkDomain,
        subnetCount: v.subnets.length,
        switchCount: new Set(v.switchPorts.map((sp) => sp.switchId)).size,
      })),
      subnets: subnetRecords.map((s) => ({
        id: s.id,
        cidr: s.cidr,
        name: s.name,
        domain: s.domain as unknown as NetworkDomain,
        vlanId: s.vlanId,
        utilization: s.totalIps > 0 ? Math.round((s.usedIps / s.totalIps) * 100) : 0,
      })),
      summaryMetrics,
    };
  }

  async updateTopologyLayout(dto: UpdateTopologyLayoutDto) {
    const viewMode = dto.viewMode || 'ALL';

    await this.prisma.$transaction(
      dto.positions.map((p) =>
        this.prisma.topologyNodePosition.upsert({
          where: {
            nodeId_viewMode: {
              nodeId: p.nodeId,
              viewMode,
            },
          },
          update: {
            positionX: p.x,
            positionY: p.y,
            nodeType: (p.nodeType as TopologyNodeType) || 'SWITCH',
          },
          create: {
            nodeId: p.nodeId,
            nodeType: (p.nodeType as TopologyNodeType) || 'SWITCH',
            viewMode,
            positionX: p.x,
            positionY: p.y,
          },
        }),
      ),
    );

    // Synchronize default coordinates on master entities when updating ALL view
    if (viewMode === 'ALL') {
      const switchPositions = dto.positions.filter((p) => p.nodeType === 'SWITCH');
      if (switchPositions.length > 0) {
        await Promise.all(
          switchPositions.map((p) =>
            this.prisma.networkSwitch.updateMany({
              where: { id: p.nodeId },
              data: { positionX: p.x, positionY: p.y },
            }),
          ),
        );
      }

      const rackPositions = dto.positions.filter((p) => p.nodeType === 'RACK');
      if (rackPositions.length > 0) {
        await Promise.all(
          rackPositions.map((p) =>
            this.prisma.networkRack.updateMany({
              where: { id: p.nodeId },
              data: { positionX: p.x, positionY: p.y },
            }),
          ),
        );
      }
    }

    return {
      success: true,
      updatedCount: dto.positions.length,
      viewMode,
    };
  }

  async createTopologyLink(dto: CreateTopologyLinkDto) {
    const sourcePort = await this.prisma.switchPort.findUnique({
      where: { id: dto.sourcePortId },
    });
    if (!sourcePort) {
      throw new NotFoundException(`Source SwitchPort with ID "${dto.sourcePortId}" not found.`);
    }

    // 1. Inter-Switch Port Link
    if (dto.targetPortId) {
      if (dto.sourcePortId === dto.targetPortId) {
        throw new BadRequestException('Cannot link a switch port to itself (self-loop detected).');
      }

      const targetPort = await this.prisma.switchPort.findUnique({
        where: { id: dto.targetPortId },
      });
      if (!targetPort) {
        throw new NotFoundException(`Target SwitchPort with ID "${dto.targetPortId}" not found.`);
      }

      return this.prisma.$transaction(async (tx) => {
        // Disconnect previous peers if any
        if (sourcePort.connectedPortId) {
          await tx.switchPort.update({
            where: { id: sourcePort.connectedPortId },
            data: { connectedPortId: null, operStatus: 'DOWN' },
          });
        }
        if (targetPort.connectedPortId) {
          await tx.switchPort.update({
            where: { id: targetPort.connectedPortId },
            data: { connectedPortId: null, operStatus: 'DOWN' },
          });
        }

        const linkSpeed = dto.speed || sourcePort.speed || targetPort.speed || '10 Gbps';
        const taggedVlans = dto.taggedVlanIds
          ? (dto.taggedVlanIds as Prisma.InputJsonValue)
          : sourcePort.taggedVlanIds || targetPort.taggedVlanIds || Prisma.JsonNull;

        const updatedSource = await tx.switchPort.update({
          where: { id: sourcePort.id },
          data: {
            connectedPortId: targetPort.id,
            connectedAssetId: null,
            mode: dto.mode || 'TRUNK',
            adminStatus: 'UP',
            operStatus: 'ACTIVE',
            speed: linkSpeed,
            taggedVlanIds: taggedVlans,
          },
        });

        const updatedTarget = await tx.switchPort.update({
          where: { id: targetPort.id },
          data: {
            connectedPortId: sourcePort.id,
            connectedAssetId: null,
            mode: dto.mode || 'TRUNK',
            adminStatus: 'UP',
            operStatus: 'ACTIVE',
            speed: linkSpeed,
            taggedVlanIds: taggedVlans,
          },
        });

        return {
          success: true,
          message: 'Inter-switch trunk uplink successfully connected.',
          link: {
            sourcePortId: updatedSource.id,
            targetPortId: updatedTarget.id,
            mode: updatedSource.mode,
            speed: linkSpeed,
            operStatus: 'ACTIVE',
          },
        };
      });
    }

    // 2. Endpoint Asset Link
    if (dto.targetAssetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: dto.targetAssetId },
      });
      if (!asset) {
        throw new NotFoundException(`Target Asset with ID "${dto.targetAssetId}" not found.`);
      }

      return this.prisma.$transaction(async (tx) => {
        if (sourcePort.connectedPortId) {
          await tx.switchPort.update({
            where: { id: sourcePort.connectedPortId },
            data: { connectedPortId: null, operStatus: 'DOWN' },
          });
        }

        const updated = await tx.switchPort.update({
          where: { id: sourcePort.id },
          data: {
            connectedAssetId: asset.id,
            connectedPortId: null,
            ipAddressId: dto.targetIpAddressId || sourcePort.ipAddressId,
            vlanId: dto.vlanId || sourcePort.vlanId,
            mode: dto.mode || 'ACCESS',
            adminStatus: 'UP',
            operStatus: 'ACTIVE',
          },
        });

        return {
          success: true,
          message: 'Switch port endpoint successfully connected.',
          link: {
            sourcePortId: updated.id,
            targetAssetId: asset.id,
            mode: updated.mode,
            operStatus: 'ACTIVE',
          },
        };
      });
    }

    throw new BadRequestException('At least targetPortId or targetAssetId must be supplied.');
  }

  async deleteTopologyLink(portId: string) {
    const port = await this.prisma.switchPort.findUnique({
      where: { id: portId },
    });
    if (!port) {
      throw new NotFoundException(`SwitchPort with ID "${portId}" not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Disconnect peer port if inter-switch uplink
      if (port.connectedPortId) {
        await tx.switchPort.update({
          where: { id: port.connectedPortId },
          data: {
            connectedPortId: null,
            operStatus: 'DOWN',
          },
        });
      }

      // Clear connection on this port
      await tx.switchPort.update({
        where: { id: portId },
        data: {
          connectedPortId: null,
          connectedAssetId: null,
          ipAddressId: null,
          operStatus: 'DOWN',
        },
      });

      return {
        success: true,
        message: 'Port connection successfully unpatched.',
      };
    });
  }
}

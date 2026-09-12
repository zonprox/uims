import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IPStatus, VlanStatus } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;
  let mockPrisma: {
    vLAN: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    subnet: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    iPAddress: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      vLAN: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      subnet: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      iPAddress: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new NetworkService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  // ==========================================
  // VLAN TESTS
  // ==========================================

  describe('VLAN CRUD', () => {
    it('findAllVlans returns list with bounded pagination', async () => {
      const mockVlans = [
        {
          id: 'vlan-1',
          vlanNumber: 130,
          name: 'Access Control',
          status: VlanStatus.ACTIVE,
          location: { name: 'BSL Factory' },
          subnets: [],
          _count: { ipAddresses: 15, subnets: 1 },
        },
      ];
      mockPrisma.vLAN.findMany.mockResolvedValue(mockVlans);

      const result = await service.findAllVlans({ page: 1, limit: 10, search: 'Access' });

      expect(mockPrisma.vLAN.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'Access', mode: 'insensitive' } },
        include: {
          location: true,
          subnets: true,
          _count: { select: { ipAddresses: true, subnets: true } },
        },
        orderBy: [{ vlanNumber: 'asc' }, { id: 'asc' }],
        take: 10,
        skip: 0,
      });
      expect(result).toBe(mockVlans);
    });

    it('findVlan finds by ID or number and throws NotFoundException when missing', async () => {
      mockPrisma.vLAN.findFirst.mockResolvedValueOnce(null);
      await expect(service.findVlan('999')).rejects.toThrow(NotFoundException);

      const vlan = { id: 'vlan-130', vlanNumber: 130, name: 'Access Control' };
      mockPrisma.vLAN.findFirst.mockResolvedValueOnce(vlan);
      const res = await service.findVlan('130');
      expect(res).toBe(vlan);
    });

    it('createVlan creates a new VLAN', async () => {
      const dto = { vlanNumber: 131, name: 'Fingerprint Readers', status: VlanStatus.ACTIVE };
      const created = { id: 'vlan-131', ...dto, location: null, subnets: [] };
      mockPrisma.vLAN.create.mockResolvedValue(created);

      const result = await service.createVlan(dto);
      expect(result).toBe(created);
    });

    it('updateVlan updates a VLAN', async () => {
      const updated = { id: 'vlan-130', vlanNumber: 130, name: 'Door Access' };
      mockPrisma.vLAN.update.mockResolvedValue(updated);

      const result = await service.updateVlan('vlan-130', { name: 'Door Access' });
      expect(result).toBe(updated);
    });

    it('deleteVlan deletes a VLAN', async () => {
      mockPrisma.vLAN.delete.mockResolvedValue({ id: 'vlan-130' });
      const result = await service.deleteVlan('vlan-130');
      expect(result).toEqual({ id: 'vlan-130' });
    });
  });

  // ==========================================
  // SUBNET TESTS
  // ==========================================

  describe('Subnet CRUD', () => {
    it('createSubnet auto-calculates network parameters from CIDR', async () => {
      mockPrisma.subnet.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'sub-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          vlan: { vlanNumber: 130, name: 'Access Control' },
          location: { name: 'BSL Factory' },
        }),
      );

      const result = await service.createSubnet({
        cidr: '10.232.130.0/24',
        name: 'Access Control Subnet',
        vlanId: 'vlan-130',
      });

      expect(result.networkAddress).toBe('10.232.130.0');
      expect(result.broadcastAddress).toBe('10.232.130.255');
      expect(result.netmask).toBe('255.255.255.0');
      expect(result.startIp).toBe('10.232.130.1');
      expect(result.endIp).toBe('10.232.130.254');
      expect(result.gateway).toBe('10.232.130.254');
      expect(result.totalIps).toBe(254);
    });

    it('createSubnet rejects invalid CIDR with BadRequestException', async () => {
      await expect(
        service.createSubnet({ cidr: 'invalid-cidr', name: 'Bad Subnet' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('findAllSubnets formats utilization correctly', async () => {
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          cidr: '10.232.130.0/24',
          name: 'Access Control Subnet',
          totalIps: 254,
          usedIps: 127,
          reservedIps: 10,
          gateway: '10.232.130.254',
          createdAt: new Date(),
          updatedAt: new Date(),
          vlan: { vlanNumber: 130, name: 'Access Control' },
          location: { name: 'BSL Factory' },
        },
      ]);

      const subnets = await service.findAllSubnets();
      expect(subnets[0].utilization).toBe(50);
      expect(subnets[0].vlanName).toBe('VLAN 130 (Access Control)');
    });

    it('getNextAvailableIp returns lowest unallocated host IP', async () => {
      mockPrisma.subnet.findUnique.mockResolvedValue({
        id: 'sub-1',
        cidr: '10.232.130.0/24',
        ipAddresses: [{ address: '10.232.130.1' }, { address: '10.232.130.2' }],
      });

      const next = await service.getNextAvailableIp('sub-1');
      expect(next.nextAvailableIp).toBe('10.232.130.3');
    });

    it('getNextAvailableIp throws NotFoundException if subnet does not exist', async () => {
      mockPrisma.subnet.findUnique.mockResolvedValue(null);
      await expect(service.getNextAvailableIp('sub-none')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // IP ADDRESS TESTS
  // ==========================================

  describe('IPAddress CRUD', () => {
    it('createIp auto-detects Subnet, VLAN, and MAC Vendor when not provided', async () => {
      // Setup candidate subnets for auto-detection
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub-130',
          cidr: '10.232.130.0/24',
          name: 'Access Control',
          vlanId: 'vlan-130',
          locationId: 'loc-bsl',
        },
      ]);

      mockPrisma.iPAddress.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'ip-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          subnet: { cidr: '10.232.130.0/24', name: 'Access Control' },
          vlan: { vlanNumber: 130, name: 'Access Control' },
          location: { name: 'BSL Factory' },
        }),
      );

      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(1) // usedCount
        .mockResolvedValueOnce(0); // reservedCount
      mockPrisma.subnet.update.mockResolvedValue({});

      const ip = await service.createIp({
        address: '10.232.130.15',
        hostname: 'BSL-AC-Reader-01',
        macAddress: '44:19:B6:11:22:33', // Hikvision OUI
        status: IPStatus.ASSIGNED,
      });

      expect(ip.address).toBe('10.232.130.15');
      expect(ip.vendor).toBe('Hikvision');
      expect(ip.status).toBe('Allocated');
      expect(mockPrisma.subnet.update).toHaveBeenCalledWith({
        where: { id: 'sub-130' },
        data: { usedIps: 1, reservedIps: 0 },
      });
    });

    it('updateIp updates IP allocation and synchronizes subnet stats', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-1',
        address: '10.232.130.15',
        hostname: 'BSL-AC-Reader-01',
        status: 'USED',
        subnetId: 'sub-130',
      });

      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-1',
        address: '10.232.130.15',
        hostname: 'BSL-AC-Reader-01',
        status: 'RESERVED',
        subnetId: 'sub-130',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.iPAddress.count.mockResolvedValue(1);
      mockPrisma.subnet.update.mockResolvedValue({});

      const updated = await service.updateIp('ip-1', { status: 'Reserved' });

      expect(updated.status).toBe('Reserved');
      expect(mockPrisma.subnet.update).toHaveBeenCalled();
    });

    it('should synchronize both old and new subnets when IP address is reassigned', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-transfer-1',
        address: '10.232.130.50',
        subnetId: 'sub-old-130',
        status: 'USED',
      });
      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-transfer-1',
        subnetId: 'sub-new-140',
        status: 'USED',
      });
      mockPrisma.iPAddress.count.mockResolvedValue(5);
      mockPrisma.subnet.update.mockResolvedValue({});

      await service.updateIp('ip-transfer-1', {
        subnetId: 'sub-new-140',
      });

      expect(mockPrisma.subnet.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sub-old-130' } }),
      );
      expect(mockPrisma.subnet.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sub-new-140' } }),
      );
    });

    it('deleteIp removes IP and updates subnet usage counter', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({ subnetId: 'sub-130' });
      mockPrisma.iPAddress.delete.mockResolvedValue({ id: 'ip-1' });
      mockPrisma.iPAddress.count.mockResolvedValue(0);
      mockPrisma.subnet.update.mockResolvedValue({});

      const res = await service.deleteIp('ip-1');

      expect(res.success).toBe(true);
      expect(mockPrisma.iPAddress.delete).toHaveBeenCalledWith({ where: { id: 'ip-1' } });
      expect(mockPrisma.subnet.update).toHaveBeenCalled();
    });
  });

  // ==========================================
  // AUTOMATION & ENGINE ENDPOINTS
  // ==========================================

  describe('Automation & Calculations', () => {
    it('calculateSubnet returns calculation object for valid CIDR', () => {
      const calc = service.calculateSubnet('10.232.130.0/24');
      expect(calc.usableHosts).toBe(254);
      expect(calc.usableStart).toBe('10.232.130.1');
      expect(calc.usableEnd).toBe('10.232.130.254');
    });

    it('calculateSubnet throws BadRequestException on invalid CIDR', () => {
      expect(() => service.calculateSubnet('bad-cidr')).toThrow(BadRequestException);
    });

    it('autoDetect returns matching subnet and VLAN for an IP', async () => {
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub-ac',
          cidr: '10.232.130.0/24',
          name: 'Access Control',
          gateway: '10.232.130.254',
          totalIps: 254,
          usedIps: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          vlan: {
            id: 'vlan-130',
            vlanNumber: 130,
            name: 'Access Control',
            description: null,
            status: VlanStatus.ACTIVE,
            locationId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ]);

      const result = await service.autoDetect('10.232.130.45');
      expect(result.isWithinSubnet).toBe(true);
      expect(result.matchedSubnet?.cidr).toBe('10.232.130.0/24');
      expect(result.matchedVlan?.vlanNumber).toBe(130);
      expect(result.suggestedGateway).toBe('10.232.130.254');
    });

    it('lookupMacVendor detects vendor from MAC string', () => {
      const res = service.lookupMacVendor('00:00:0C:44:55:66');
      expect(res.vendor).toBe('Cisco');
      expect(res.mac).toBe('00:00:0C:44:55:66');
    });

    it('getStats calculates overall IPAM statistics and utilization', async () => {
      mockPrisma.vLAN.count.mockResolvedValue(5);
      mockPrisma.subnet.count.mockResolvedValue(3);
      mockPrisma.subnet.aggregate.mockResolvedValue({
        _sum: { totalIps: 762 },
      });
      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(200) // assigned
        .mockResolvedValueOnce(50) // reserved
        .mockResolvedValueOnce(10) // available
        .mockResolvedValueOnce(260); // total

      const stats = await service.getStats();

      expect(stats.totalVlans).toBe(5);
      expect(stats.managedSubnets).toBe(3);
      expect(stats.allocatedStaticIps).toBe(200);
      expect(stats.reservedDhcpLeases).toBe(50);
      expect(stats.freeIpCapacity).toBe(762 - 250);
      expect(stats.averageUtilization).toBe(26.2);
    });
  });
});

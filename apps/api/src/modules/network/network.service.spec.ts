import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IPStatus, VlanStatus } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkService, parseSpeedMbps } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;
  let mockAuditService: {
    logEvent: ReturnType<typeof vi.fn>;
  };
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
    networkRack: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    networkSwitch: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    switchPort: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };

    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
    canvasNodePosition: {
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    asset: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
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
      networkRack: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      networkSwitch: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      switchPort: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      canvasNodePosition: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
      },
      asset: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((cbOrPromises) => {
        if (typeof cbOrPromises === 'function') {
          return cbOrPromises(mockPrisma);
        }
        return Promise.all(cbOrPromises);
      }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    service = new NetworkService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      mockAuditService as unknown as import('../audit/audit.service').AuditService,
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
          subnets: [],
          _count: { ipAddresses: 15, subnets: 1 },
        },
      ];
      mockPrisma.vLAN.findMany.mockResolvedValue(mockVlans);

      const result = await service.findAllVlans({ page: 1, limit: 10, search: 'Access' });

      expect(mockPrisma.vLAN.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'Access', mode: 'insensitive' } },
        include: {
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
      const created = { id: 'vlan-131', ...dto, subnets: [] };
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
        }),
      );

      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(1) // usedCount
        .mockResolvedValueOnce(0); // reservedCount
      mockPrisma.subnet.update.mockResolvedValue({});

      const ip = await service.createIp({
        address: '10.232.130.15',
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

    it('createIp throws BadRequestException when address is omitted and cannot be allocated', async () => {
      await expect(
        service.createIp({
          macAddress: '44:19:B6:11:22:33',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateIp updates IP allocation and synchronizes subnet stats', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-1',
        address: '10.232.130.15',
        status: 'USED',
        subnetId: 'sub-130',
      });

      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-1',
        address: '10.232.130.15',
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
      mockPrisma.networkRack.count.mockResolvedValue(4);
      mockPrisma.networkSwitch.count.mockResolvedValue(6);
      mockPrisma.switchPort.count
        .mockResolvedValueOnce(192) // totalPorts
        .mockResolvedValueOnce(96); // activePorts

      const stats = await service.getStats();

      expect(stats.totalVlans).toBe(5);
      expect(stats.managedSubnets).toBe(3);
      expect(stats.allocatedStaticIps).toBe(200);
      expect(stats.reservedDhcpLeases).toBe(50);
      expect(stats.freeIpCapacity).toBe(762 - 250);
      expect(stats.averageUtilization).toBe(26.2);
      expect(stats.totalRacks).toBe(4);
      expect(stats.totalSwitches).toBe(6);
      expect(stats.totalPorts).toBe(192);
      expect(stats.portUtilization).toBe(50);
    });
  });

  // ==========================================
  // RACK CRUD & 2D ELEVATION TESTS
  // ==========================================

  describe('Rack CRUD & 2D Elevation', () => {
    it('findAllRacks returns list of racks with pagination and formatted stats', async () => {
      const mockRacks = [
        {
          id: 'rack-1',
          name: 'Server Rack 01',
          code: 'RACK-01',
          maxPowerKw: 10,
          maxWeightKg: 800,
          switches: [
            {
              id: 'sw-1',
              rackHeight: 2,
              ports: [
                { operStatus: 'ACTIVE', adminStatus: 'UP' },
                { operStatus: 'DOWN', adminStatus: 'UP' },
              ],
            },
          ],
          _count: { switches: 1 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.networkRack.findMany.mockResolvedValue(mockRacks);

      const result = await service.findAllRacks({ page: 1, limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('RACK-01');
      expect(result[0].usedUnits).toBe(2);
      expect(result[0].occupancyRate).toBeGreaterThan(0);
    });

    it('findRack returns rack by ID or throws NotFoundException when missing', async () => {
      mockPrisma.networkRack.findFirst.mockResolvedValue(null);
      await expect(service.findRack('missing-id')).rejects.toThrow(NotFoundException);

      mockPrisma.networkRack.findFirst.mockResolvedValue({
        id: 'rack-1',
        name: 'Server Rack 01',
        code: 'RACK-01',
        maxPowerKw: 10,
        maxWeightKg: 800,
        switches: [],
        _count: { switches: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rack = await service.findRack('rack-1');
      expect(rack.id).toBe('rack-1');
      expect(rack.name).toBe('Server Rack 01');
    });

    it('createRack creates a new rack and validates unique code', async () => {
      mockPrisma.networkRack.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createRack({
          name: 'Duplicate Rack',
          code: 'DUP-01',
        }),
      ).rejects.toThrow(BadRequestException);

      mockPrisma.networkRack.findUnique.mockResolvedValue(null);
      mockPrisma.networkRack.create.mockResolvedValue({
        id: 'rack-created-1',
        name: 'New Rack',
        code: 'RACK-NEW',
        maxPowerKw: 10,
        maxWeightKg: 800,
        switches: [],
        _count: { switches: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await service.createRack({
        name: 'New Rack',
        code: 'RACK-NEW',
      });

      expect(created.code).toBe('RACK-NEW');
      expect(mockPrisma.networkRack.create).toHaveBeenCalled();
    });

    it('updateRack updates rack attributes', async () => {
      mockPrisma.networkRack.findUnique.mockResolvedValue({
        id: 'rack-1',
        code: 'RACK-01',
      });

      mockPrisma.networkRack.update.mockResolvedValue({
        id: 'rack-1',
        name: 'Updated Rack Name',
        code: 'RACK-01',
        maxPowerKw: 15,
        maxWeightKg: 900,
        switches: [],
        _count: { switches: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.updateRack('rack-1', {
        name: 'Updated Rack Name',
        maxPowerKw: 15,
      });

      expect(updated.name).toBe('Updated Rack Name');
      expect(mockPrisma.networkRack.update).toHaveBeenCalled();
    });

    it('deleteRack sets mounted switches rackId to null and deletes rack', async () => {
      mockPrisma.networkRack.findUnique.mockResolvedValue({
        id: 'rack-del',
        code: 'RACK-DEL',
      });
      mockPrisma.networkSwitch.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.networkRack.delete.mockResolvedValue({ id: 'rack-del' });

      const res = await service.deleteRack('rack-del');
      expect(res.id).toBe('rack-del');
      expect(mockPrisma.networkSwitch.updateMany).toHaveBeenCalledWith({
        where: { rackId: 'rack-del' },
        data: { rackId: null, rackPosition: null },
      });
      expect(mockPrisma.networkRack.delete).toHaveBeenCalledWith({
        where: { id: 'rack-del' },
      });
    });

    it('getRackElevation generates 2D slot array and telemetry calculations for standard 42U cabinet', async () => {
      mockPrisma.networkRack.findFirst.mockResolvedValue({
        id: 'rack-elev',
        name: 'Elevation Rack',
        code: 'RACK-EL-01',
        maxPowerKw: 5,
        maxWeightKg: 500,
        switches: [
          {
            id: 'sw-1',
            name: 'Switch-1',
            model: 'Catalyst 9300',
            vendor: 'Cisco',
            role: 'ACCESS',
            status: 'ONLINE',
            rackPosition: 2,
            rackHeight: 2,
            totalPorts: 24,
            ports: [
              { operStatus: 'ACTIVE', adminStatus: 'UP' },
              { operStatus: 'DOWN', adminStatus: 'UP' },
            ],
          },
        ],
      });

      const elevation = await service.getRackElevation('rack-elev');
      expect(elevation.rackCode).toBe('RACK-EL-01');
      expect(elevation.usedUnits).toBe(2);
      expect(elevation.availableUnits).toBe(40);
      expect(elevation.slots).toHaveLength(42);

      // Slot 1: unoccupied
      expect(elevation.slots[0].unitNumber).toBe(1);
      expect(elevation.slots[0].isOccupied).toBe(false);

      // Slot 2: start unit
      expect(elevation.slots[1].unitNumber).toBe(2);
      expect(elevation.slots[1].isOccupied).toBe(true);
      expect(elevation.slots[1].isStartingUnit).toBe(true);
      expect(elevation.slots[1].switch?.name).toBe('Switch-1');

      // Slot 3: continuation unit
      expect(elevation.slots[2].unitNumber).toBe(3);
      expect(elevation.slots[2].isOccupied).toBe(true);
      expect(elevation.slots[2].isStartingUnit).toBe(false);

      // Slot 4: unoccupied
      expect(elevation.slots[3].unitNumber).toBe(4);
      expect(elevation.slots[3].isOccupied).toBe(false);
    });
  });

  // ==========================================
  // SWITCH FLEET & PORT CRUD TESTS
  // ==========================================

  describe('Network Switch CRUD & Ports', () => {
    it('findAllSwitches returns paginated switches with relations', async () => {
      const mockSwitches = [
        {
          id: 'sw-1',
          name: 'SW-CORE-01',
          model: 'Catalyst 9500',
          vendor: 'Cisco',
          role: 'CORE',
          status: 'ONLINE',
          totalPorts: 48,
          rackPosition: 40,
          rackHeight: 2,
          rackId: 'rack-1',
          rack: { id: 'rack-1', name: 'RACK-DC-01', code: 'RACK-DC-01' },
          ipAddress: { id: 'ip-1', address: '10.232.1.1' },
          asset: { id: 'ast-1', assetTag: 'AST-1010', name: 'Core Switch' },
          ports: [
            { operStatus: 'ACTIVE', adminStatus: 'UP' },
            { operStatus: 'DOWN', adminStatus: 'UP' },
          ],
          _count: { ports: 48 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.networkSwitch.findMany.mockResolvedValue(mockSwitches);

      const result = await service.findAllSwitches({ page: 1, limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('SW-CORE-01');
      expect(result[0].activePortsCount).toBe(1);
      expect(result[0].rack?.code).toBe('RACK-DC-01');
    });

    it('findSwitch returns switch by ID or throws NotFoundException when missing', async () => {
      mockPrisma.networkSwitch.findFirst.mockResolvedValue(null);
      await expect(service.findSwitch('missing-sw')).rejects.toThrow(NotFoundException);

      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-1',
        name: 'SW-CORE-01',
        model: 'Catalyst 9500',
        vendor: 'Cisco',
        role: 'CORE',
        status: 'ONLINE',
        totalPorts: 48,
        rackPosition: 40,
        rackHeight: 2,
        rackId: 'rack-1',
        rack: { id: 'rack-1', name: 'RACK-DC-01', code: 'RACK-DC-01' },
        ipAddress: null,
        asset: null,
        ports: [],
        _count: { ports: 48 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sw = await service.findSwitch('sw-1');
      expect(sw.id).toBe('sw-1');
      expect(sw.name).toBe('SW-CORE-01');
    });

    it('createSwitch auto-generates RJ45 and SFP+ ports', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null); // serial check
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-new-1' });
      mockPrisma.switchPort.createMany.mockResolvedValue({ count: 52 });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-new-1',
        name: 'SW-ACC-01',
        model: 'C9300-48P',
        vendor: 'Cisco',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 48,
        rackPosition: null,
        rackHeight: 1,
        rackId: null,
        rack: null,
        ipAddress: null,
        asset: null,
        ports: [],
        _count: { ports: 52 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await service.createSwitch({
        name: 'SW-ACC-01',
        model: 'C9300-48P',
        vendor: 'Cisco',
        totalPorts: 48,
        autoGeneratePorts: true,
      });

      expect(created.name).toBe('SW-ACC-01');
      expect(mockPrisma.switchPort.createMany).toHaveBeenCalled();
      const callArgs = mockPrisma.switchPort.createMany.mock.calls[0][0];
      // 48 RJ45 access + 2 RJ45 uplink + 2 SFP fiber = 52 ports generated
      expect(callArgs.data).toHaveLength(52);
      expect(callArgs.data[0].name).toBe('Gi1/0/1');
      expect(callArgs.data[0].mode).toBe('ACCESS');
      expect(callArgs.data[48].name).toBe('Uplink 1');
      expect(callArgs.data[48].mode).toBe('TRUNK');
      expect(callArgs.data[50].name).toBe('SFP 1');
      expect(callArgs.data[50].mode).toBe('TRUNK');
    });

    it('createSwitch auto-generates 8 RJ45 access, 2 RJ45 uplinks, and 2 SFP optical ports for 8-port switch', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-8p' });
      mockPrisma.switchPort.createMany.mockResolvedValue({ count: 12 });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-8p',
        name: 'SW-EDGE-08',
        model: 'C1000-8P',
        vendor: 'Cisco',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 8,
        rackPosition: null,
        rackHeight: 1,
        rackId: null,
        rack: null,
        ipAddress: null,
        asset: null,
        ports: [],
        _count: { ports: 12 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await service.createSwitch({
        name: 'SW-EDGE-08',
        model: 'C1000-8P',
        vendor: 'Cisco',
        totalPorts: 8,
        autoGeneratePorts: true,
      });

      expect(created.name).toBe('SW-EDGE-08');
      expect(mockPrisma.switchPort.createMany).toHaveBeenCalled();
      const callArgs = mockPrisma.switchPort.createMany.mock.calls[0][0];
      // 8 RJ45 access + 2 RJ45 uplinks + 2 SFP fiber = 12 ports generated
      expect(callArgs.data).toHaveLength(12);
      expect(callArgs.data[0].name).toBe('Gi1/0/1');
      expect(callArgs.data[0].formFactor).toBe('RJ45_1G');
      expect(callArgs.data[8].name).toBe('Uplink 1');
      expect(callArgs.data[8].formFactor).toBe('RJ45_1G');
      expect(callArgs.data[8].mode).toBe('TRUNK');
      expect(callArgs.data[10].name).toBe('SFP 1');
      expect(callArgs.data[10].formFactor).toBe('SFP_PLUS_10G');
      expect(callArgs.data[10].speed).toBe('10 Gbps');
      expect(callArgs.data[10].mode).toBe('TRUNK');
    });

    it('createSwitch auto-generates 16 RJ45 access, 2 RJ45 uplinks, and 2 SFP optical ports for 16-port switch', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-16p' });
      mockPrisma.switchPort.createMany.mockResolvedValue({ count: 20 });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-16p',
        name: 'SW-BRANCH-16',
        model: 'C1000-16P',
        vendor: 'Cisco',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 16,
        rackPosition: null,
        rackHeight: 1,
        rackId: null,
        rack: null,
        ipAddress: null,
        asset: null,
        ports: [],
        _count: { ports: 20 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await service.createSwitch({
        name: 'SW-BRANCH-16',
        model: 'C1000-16P',
        vendor: 'Cisco',
        totalPorts: 16,
        autoGeneratePorts: true,
      });

      expect(created.name).toBe('SW-BRANCH-16');
      expect(mockPrisma.switchPort.createMany).toHaveBeenCalled();
      const callArgs = mockPrisma.switchPort.createMany.mock.calls[0][0];
      // 16 RJ45 access + 2 RJ45 uplinks + 2 SFP fiber = 20 ports generated
      expect(callArgs.data).toHaveLength(20);
      expect(callArgs.data[0].name).toBe('Gi1/0/1');
      expect(callArgs.data[0].formFactor).toBe('RJ45_1G');
      expect(callArgs.data[16].name).toBe('Uplink 1');
      expect(callArgs.data[16].formFactor).toBe('RJ45_1G');
      expect(callArgs.data[16].mode).toBe('TRUNK');
      expect(callArgs.data[18].name).toBe('SFP 1');
      expect(callArgs.data[18].formFactor).toBe('SFP_PLUS_10G');
      expect(callArgs.data[18].speed).toBe('10 Gbps');
    });

    it('createSwitch supports custom port configuration with custom speeds', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-custom' });
      mockPrisma.switchPort.createMany.mockResolvedValue({ count: 6 });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-custom',
        name: 'SW-CUSTOM',
        model: 'Custom-6P',
        vendor: 'Aruba',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 4,
        uplinkPorts: 1,
        fiberPorts: 1,
        rackPosition: null,
        rackHeight: 1,
        rackId: null,
        rack: null,
        ipAddress: null,
        asset: null,
        ports: [],
        _count: { ports: 6 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await service.createSwitch({
        name: 'SW-CUSTOM',
        model: 'Custom-6P',
        vendor: 'Aruba',
        totalPorts: 4,
        uplinkPorts: 1,
        fiberPorts: 1,
        uplinkSpeed: '2.5 Gbps',
        fiberSpeed: '1 Gbps',
        autoGeneratePorts: true,
      });

      expect(created.name).toBe('SW-CUSTOM');
      expect(mockPrisma.switchPort.createMany).toHaveBeenCalled();
      const callArgs = mockPrisma.switchPort.createMany.mock.calls[0][0];
      // 4 access + 1 uplink + 1 fiber = 6 ports
      expect(callArgs.data).toHaveLength(6);
      expect(callArgs.data[4].name).toBe('Uplink 1');
      expect(callArgs.data[4].speed).toBe('2.5 Gbps');
      expect(callArgs.data[5].name).toBe('SFP 1');
      expect(callArgs.data[5].formFactor).toBe('SFP_1G');
      expect(callArgs.data[5].speed).toBe('1 Gbps');
    });

    it('createSwitch rejects duplicate serial number', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue({ id: 'existing-sw' });

      await expect(
        service.createSwitch({
          name: 'SW-DUP',
          model: 'Catalyst',
          vendor: 'Cisco',
          serialNumber: 'SN-DUPLICATE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createSwitch validates rack mount with bounded query take: 100 and deterministic orderBy', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
      mockPrisma.networkRack.findUnique.mockResolvedValue({
        id: 'rack-1',
      });
      mockPrisma.networkSwitch.findMany.mockResolvedValue([]);
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-mounted-1' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-mounted-1',
        name: 'SW-MOUNTED',
        model: 'Catalyst',
        vendor: 'Cisco',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 24,
        rackPosition: 10,
        rackHeight: 2,
        rackId: 'rack-1',
        rack: { id: 'rack-1', name: 'Rack 01', code: 'RCK-01' },
        ipAddress: null,
        asset: null,
        ports: [],
        _count: { ports: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createSwitch({
        name: 'SW-MOUNTED',
        model: 'Catalyst',
        vendor: 'Cisco',
        rackId: 'rack-1',
        rackPosition: 10,
        rackHeight: 2,
        autoGeneratePorts: false,
      });

      expect(mockPrisma.networkSwitch.findMany).toHaveBeenCalledWith({
        where: {
          rackId: 'rack-1',
          rackPosition: { not: null },
        },
        take: 100,
        orderBy: [{ rackPosition: 'asc' }, { id: 'asc' }],
      });
    });

    it('createSwitch rejects mount when RU slot collides with existing switch', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
      mockPrisma.networkRack.findUnique.mockResolvedValue({
        id: 'rack-1',
      });
      mockPrisma.networkSwitch.findMany.mockResolvedValue([
        {
          id: 'sw-existing',
          name: 'SW-CORE-01',
          rackPosition: 10,
          rackHeight: 2,
        },
      ]);

      await expect(
        service.createSwitch({
          name: 'SW-NEW',
          model: 'Catalyst',
          vendor: 'Cisco',
          rackId: 'rack-1',
          rackPosition: 11,
          rackHeight: 1,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createSwitch rejects mounting switch beyond standard 42U rack capacity', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
      mockPrisma.networkRack.findUnique.mockResolvedValue({
        id: 'rack-1',
      });

      await expect(
        service.createSwitch({
          name: 'SW-OVERFLOW',
          model: 'Catalyst',
          vendor: 'Cisco',
          rackId: 'rack-1',
          rackPosition: 42,
          rackHeight: 2,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow('Device span U42-U43 exceeds rack height U42.');
    });

    it('deleteSwitch cascades and deletes associated switch ports', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue({ id: 'sw-del' });
      mockPrisma.switchPort.deleteMany.mockResolvedValue({ count: 24 });
      mockPrisma.networkSwitch.delete.mockResolvedValue({ id: 'sw-del' });

      const result = await service.deleteSwitch('sw-del');
      expect(result.id).toBe('sw-del');
      expect(mockPrisma.switchPort.deleteMany).toHaveBeenCalledWith({
        where: { switchId: 'sw-del' },
      });
      expect(mockPrisma.networkSwitch.delete).toHaveBeenCalledWith({
        where: { id: 'sw-del' },
      });
    });

    it('findSwitchPorts returns switch ports ordered by portNumber', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue({ id: 'sw-1' });
      mockPrisma.switchPort.findMany.mockResolvedValue([
        {
          id: 'port-1',
          switchId: 'sw-1',
          portNumber: 1,
          name: 'Gi1/0/1',
          formFactor: 'RJ45_1G',
          adminStatus: 'UP',
          operStatus: 'ACTIVE',
          speed: '1 Gbps',
          duplex: 'FULL',
          vlanId: 'vlan-1',
          vlan: {
            id: 'vlan-1',
            vlanNumber: 10,
            name: 'Data',
            status: 'ACTIVE',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          ipAddressId: null,
          ipAddress: null,
          connectedAssetId: null,
          connectedAsset: null,
          taggedVlanIds: [20, 30],
          description: 'Uplink',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.findSwitchPorts('sw-1');
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Gi1/0/1');
      expect(res[0].vlan?.vlanNumber).toBe(10);
      expect(res[0].taggedVlanIds).toEqual([20, 30]);
    });
  });

  describe('Switch Port CRUD', () => {
    it('findPort returns port details or throws NotFoundException', async () => {
      mockPrisma.switchPort.findUnique.mockResolvedValue(null);
      await expect(service.findPort('missing-port')).rejects.toThrow(NotFoundException);

      mockPrisma.switchPort.findUnique.mockResolvedValue({
        id: 'port-1',
        switchId: 'sw-1',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        speed: '1 Gbps',
        duplex: 'FULL',
        vlanId: 'vlan-1',
        vlan: { vlanNumber: 10, name: 'Data' },
        ipAddressId: null,
        ipAddress: null,
        connectedAssetId: null,
        connectedAsset: null,
        switch: { id: 'sw-1', name: 'SW-01' },
        taggedVlanIds: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const port = await service.findPort('port-1');
      expect(port.id).toBe('port-1');
      expect(port.name).toBe('Gi1/0/1');
    });

    it('updatePort updates configuration and forces operStatus DOWN when adminStatus is DOWN', async () => {
      mockPrisma.switchPort.findUnique
        .mockResolvedValueOnce({
          id: 'port-1',
          adminStatus: 'UP',
          operStatus: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'port-1',
          switchId: 'sw-1',
          portNumber: 1,
          name: 'Gi1/0/1',
          formFactor: 'RJ45_1G',
          adminStatus: 'DOWN',
          operStatus: 'DOWN',
          speed: '1 Gbps',
          duplex: 'FULL',
          vlanId: null,
          vlan: null,
          ipAddressId: null,
          ipAddress: null,
          connectedAssetId: null,
          connectedAsset: null,
          switch: { id: 'sw-1', name: 'SW-01' },
          taggedVlanIds: null,
          description: 'Disabled port',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockPrisma.switchPort.update.mockResolvedValue({
        id: 'port-1',
        adminStatus: 'DOWN',
        operStatus: 'DOWN',
      });

      const updated = await service.updatePort('port-1', {
        adminStatus: 'DOWN',
        description: 'Disabled port',
      });

      expect(updated.adminStatus).toBe('DOWN');
      expect(updated.operStatus).toBe('DOWN');
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminStatus: 'DOWN',
            operStatus: 'DOWN',
          }),
        }),
      );
    });
  });

  describe('Audit Logging Integration', () => {
    let mockAuditService: { logEvent: ReturnType<typeof vi.fn> };
    let serviceWithAudit: NetworkService;

    beforeEach(() => {
      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-net-1' }),
      };
      serviceWithAudit = new NetworkService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockAuditService as unknown as import('../audit/audit.service').AuditService,
      );
    });

    it('should log SUBNET_CREATED on createSubnet', async () => {
      mockPrisma.subnet.create.mockResolvedValue({
        id: 'sub-aud-1',
        cidr: '192.168.10.0/24',
        name: 'Office LAN',
        gateway: '192.168.10.1',
        vlanId: null,
      });

      await serviceWithAudit.createSubnet({
        cidr: '192.168.10.0/24',
        name: 'Office LAN',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBNET_CREATED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: 'sub-aud-1',
          newValue: expect.objectContaining({ id: 'sub-aud-1', cidr: '192.168.10.0/24' }),
        }),
      );
    });

    it('should log SUBNET_UPDATED on updateSubnet with diff', async () => {
      mockPrisma.subnet.findUnique.mockResolvedValue({
        id: 'sub-aud-1',
        cidr: '192.168.10.0/24',
        name: 'Office LAN Old',
        gateway: '192.168.10.1',
      });
      mockPrisma.subnet.update.mockResolvedValue({
        id: 'sub-aud-1',
        cidr: '192.168.10.0/24',
        name: 'Office LAN New',
        gateway: '192.168.10.254',
      });

      await serviceWithAudit.updateSubnet('sub-aud-1', {
        name: 'Office LAN New',
        gateway: '192.168.10.254',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBNET_UPDATED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: 'sub-aud-1',
          oldValue: expect.objectContaining({ name: 'Office LAN Old', gateway: '192.168.10.1' }),
          newValue: expect.objectContaining({ name: 'Office LAN New', gateway: '192.168.10.254' }),
        }),
      );
    });

    it('should log SUBNET_DELETED on deleteSubnet', async () => {
      mockPrisma.subnet.findUnique.mockResolvedValue({
        id: 'sub-aud-1',
        name: 'Office LAN',
        cidr: '192.168.10.0/24',
      });
      mockPrisma.subnet.delete.mockResolvedValue({
        id: 'sub-aud-1',
        name: 'Office LAN',
        cidr: '192.168.10.0/24',
      });

      await serviceWithAudit.deleteSubnet('sub-aud-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBNET_DELETED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: 'sub-aud-1',
        }),
      );
    });

    it('should log IP_ALLOCATED on createIp', async () => {
      mockPrisma.iPAddress.findFirst.mockResolvedValue(null);
      mockPrisma.iPAddress.create.mockResolvedValue({
        id: 'ip-aud-1',
        address: '192.168.10.50',
        deviceType: 'Workstation',
        status: 'IN_USE',
        pingStatus: 'online',
      });

      await serviceWithAudit.createIp({
        address: '192.168.10.50',
        deviceType: 'Workstation',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IP_ALLOCATED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: 'ip-aud-1',
          newValue: expect.objectContaining({ id: 'ip-aud-1', address: '192.168.10.50' }),
        }),
      );
    });

    it('should log IP_UPDATED on updateIp with field diff', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-aud-1',
        address: '192.168.10.50',
        deviceType: 'Workstation',
        status: 'AVAILABLE',
      });
      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-aud-1',
        address: '192.168.10.50',
        deviceType: 'Server',
        status: 'IN_USE',
      });

      await serviceWithAudit.updateIp('ip-aud-1', {
        deviceType: 'Server',
        status: 'IN_USE',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IP_UPDATED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: 'ip-aud-1',
          oldValue: expect.objectContaining({ deviceType: 'Workstation', status: 'AVAILABLE' }),
          newValue: expect.objectContaining({ deviceType: 'Server', status: 'IN_USE' }),
        }),
      );
    });

    it('should log IP_RELEASED on deleteIp', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-aud-1',
        address: '192.168.10.50',
        subnetId: 'sub-1',
      });
      mockPrisma.iPAddress.delete.mockResolvedValue({
        id: 'ip-aud-1',
        address: '192.168.10.50',
      });
      mockPrisma.subnet.findUnique.mockResolvedValue({ id: 'sub-1', totalIps: 254 });
      mockPrisma.iPAddress.count.mockResolvedValue(10);

      await serviceWithAudit.deleteIp('ip-aud-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IP_RELEASED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: 'ip-aud-1',
        }),
      );
    });
  });

  // ==========================================
  // TOPOLOGY GRAPH ENGINE TESTS
  // ==========================================

  describe('Topology Graph Engine', () => {
    const mockRack = {
      id: 'rack-1',
      name: 'Core Datacenter Rack 01',
      code: 'RACK-DC01',
      status: 'ACTIVE',
      positionX: 200,
      positionY: 150,
      maxPowerKw: 15,
      maxWeightKg: 1000,
      depth: 1000,
      width: 600,
    };

    const mockPeerPort = {
      id: 'port-peer-1',
      name: 'Te1/0/25',
      operStatus: 'ACTIVE',
      switch: { id: 'sw-2', name: 'BSL-DIST-SW01' },
    };

    const mockSwitch = {
      id: 'sw-1',
      name: 'BSL-CORE-SW01',
      model: 'C9300-48P',
      vendor: 'Cisco Systems',
      role: 'CORE',
      domain: 'NETWORK',
      status: 'ONLINE',
      totalPorts: 48,
      positionX: 200,
      positionY: 250,
      rackId: 'rack-1',
      rack: mockRack,
      ipAddress: { address: '10.232.129.10' },
      ports: [
        {
          id: 'port-1',
          portNumber: 1,
          name: 'Gi1/0/1',
          operStatus: 'ACTIVE',
          speed: '1 Gbps',
          vlanId: 'vlan-1',
          vlan: { vlanNumber: 100 },
          connectedAsset: {
            id: 'ast-srv-1',
            assetTag: 'AST-1009',
            deviceModel: {
              name: 'Dell PowerEdge R750 Enterprise Server',
              manufacturer: 'Dell',
              category: { id: 'cat-server' },
            },
            assignedTo: { displayName: 'Minh Nguyen' },
            department: { name: 'IT Infrastructure' },
          },
        },
        {
          id: 'port-2',
          portNumber: 2,
          name: 'Gi1/0/2',
          operStatus: 'ACTIVE',
          speed: '1 Gbps',
          vlanId: 'vlan-1',
          vlan: { vlanNumber: 100 },
          connectedAsset: {
            id: 'ast-ap-1',
            assetTag: 'AST-AP-01',
            deviceModel: {
              name: 'Cisco Catalyst 9120 Access Point',
              manufacturer: 'Cisco',
              category: { id: 'cat-ap' },
            },
            assignedTo: null,
            department: { name: 'IT Infrastructure' },
          },
        },
        {
          id: 'port-49',
          portNumber: 49,
          name: 'Te1/0/49',
          operStatus: 'ACTIVE',
          speed: '10 Gbps',
          formFactor: 'SFP_PLUS_10G',
          connectedPortId: 'port-peer-1',
          connectedPort: mockPeerPort,
        },
      ],
    };

    const mockPeerSwitch = {
      id: 'sw-2',
      name: 'BSL-DIST-SW01',
      model: 'C9200-24T',
      vendor: 'Cisco Systems',
      role: 'DISTRIBUTION',
      domain: 'NETWORK',
      status: 'ONLINE',
      totalPorts: 24,
      positionX: 450,
      positionY: 250,
      rackId: 'rack-1',
      rack: mockRack,
      ipAddress: { address: '10.232.129.11' },
      ports: [
        {
          id: 'port-peer-1',
          portNumber: 25,
          name: 'Te1/0/25',
          operStatus: 'ACTIVE',
          speed: '10 Gbps',
          formFactor: 'SFP_PLUS_10G',
          connectedPortId: 'port-49',
          connectedPort: {
            id: 'port-49',
            name: 'Te1/0/49',
            switch: { id: 'sw-1', name: 'BSL-CORE-SW01' },
          },
        },
      ],
    };

    it('getTopologyGraph computes metrics accurately (including totalAccessPoints, dangling edge elimination, rack nodes)', async () => {
      mockPrisma.networkRack.findMany.mockResolvedValue([mockRack]);
      mockPrisma.networkSwitch.findMany.mockResolvedValue([mockSwitch, mockPeerSwitch]);
      mockPrisma.vLAN.findMany.mockResolvedValue([
        {
          id: 'vlan-1',
          vlanNumber: 100,
          name: 'Servers',
          domain: 'NETWORK',
          subnets: [],
          switchPorts: [],
        },
      ]);
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          cidr: '10.232.100.0/24',
          name: 'BSL Servers',
          domain: 'NETWORK',
          totalIps: 254,
          usedIps: 24,
        },
      ]);
      mockPrisma.canvasNodePosition.findMany.mockResolvedValue([]);

      const result = await service.getTopologyGraph({ mode: 'ALL' });

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('racks');
      expect(result).toHaveProperty('vlans');
      expect(result).toHaveProperty('subnets');
      expect(result).toHaveProperty('summaryMetrics');
      expect(result).toHaveProperty('metrics');

      // Verify node generation: 1 rack + 2 switches + 1 server + 1 AP = 5 nodes
      expect(result.nodes.length).toBe(5);
      const rackNode = result.nodes.find((n) => n.id === 'rack-1');
      expect(rackNode?.type).toBe('RACK');
      expect(rackNode?.subType).toBe('CABINET_42U');
      expect(rackNode?.position).toBeDefined();

      const switchNode = result.nodes.find((n) => n.id === 'sw-1');
      expect(switchNode?.type).toBe('SWITCH');

      const serverNode = result.nodes.find((n) => n.id === 'ast-srv-1');
      expect(serverNode?.type).toBe('SERVER');

      const apNode = result.nodes.find((n) => n.id === 'ast-ap-1');
      expect(apNode?.type).toBe('ACCESS_POINT');

      // Verify edge contracts and metrics
      expect(result.edges.length).toBe(3); // 1 trunk uplink + 1 server link + 1 AP link
      expect(result.summaryMetrics?.totalAccessPoints).toBe(1);
      expect(result.summaryMetrics?.totalRacks).toBe(1);
      expect(result.summaryMetrics?.totalSwitches).toBe(2);
      expect(result.summaryMetrics?.totalServers).toBe(1);
      expect(result.summaryMetrics?.activeLinks).toBe(3);

      // Verify explicit port-to-port link details on all edges
      const trunkEdge = result.edges.find((e) => e.linkType === 'UPLINK');
      expect(trunkEdge).toBeDefined();
      expect(trunkEdge?.sourcePortName).toBe('Te1/0/49');
      expect(trunkEdge?.targetPortName).toBe('Te1/0/25');
      expect(trunkEdge?.targetPortId).toBe('port-peer-1');

      const serverEdge = result.edges.find((e) => e.target === 'ast-srv-1');
      expect(serverEdge).toBeDefined();
      expect(serverEdge?.linkType).toBe('ENDPOINT');
      expect(serverEdge?.sourcePortName).toBe('Gi1/0/1');
      expect(serverEdge?.targetPortName).toBe('AST-1009');
      expect(serverEdge?.targetPortId).toBe('ast-srv-1');

      for (const edge of result.edges) {
        expect(edge.sourcePortName).toBeTruthy();
        expect(edge.targetPortName).toBeTruthy();
      }

      // Verify aliases
      const alias1 = await service.getTopology({ mode: 'ALL' });
      expect(alias1.nodes.length).toBe(5);
      const alias2 = await service.getTopologyData({ mode: 'ALL' });
      expect(alias2.nodes.length).toBe(5);
    });

    it('getTopologyGraph eliminates dangling edges when peer switch is excluded', async () => {
      mockPrisma.networkRack.findMany.mockResolvedValue([mockRack]);
      // sw-2 is NOT returned (e.g. filtered by rack or domain)
      mockPrisma.networkSwitch.findMany.mockResolvedValue([mockSwitch]);
      mockPrisma.vLAN.findMany.mockResolvedValue([]);
      mockPrisma.subnet.findMany.mockResolvedValue([]);
      mockPrisma.canvasNodePosition.findMany.mockResolvedValue([]);

      const result = await service.getTopologyGraph({ mode: 'ALL' });

      // The inter-switch trunk edge to sw-2 must be excluded because sw-2 is not in switchIdSet
      expect(result.edges.some((e) => e.target === 'sw-2')).toBe(false);
      expect(result.edges.length).toBe(2); // Only server + AP endpoint edges
    });

    it('getTopologyGraph filters switches by switchRole properly', async () => {
      mockPrisma.networkRack.findMany.mockResolvedValue([]);
      mockPrisma.networkSwitch.findMany.mockResolvedValue([]);
      mockPrisma.vLAN.findMany.mockResolvedValue([]);
      mockPrisma.subnet.findMany.mockResolvedValue([]);
      mockPrisma.canvasNodePosition.findMany.mockResolvedValue([]);

      await service.getTopologyGraph({ mode: 'NETWORK', switchRole: 'CORE' });

      expect(mockPrisma.networkSwitch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            domain: { in: ['NETWORK', 'SHARED'] },
            role: 'CORE',
          }),
        }),
      );
    });

    it('updateTopologyLayout executes upsert and master coordinate sync in transaction for ALL view', async () => {
      mockPrisma.canvasNodePosition.upsert.mockResolvedValue({});
      mockPrisma.networkSwitch.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.networkRack.updateMany.mockResolvedValue({ count: 1 });

      const dto = {
        viewMode: 'ALL' as const,
        positions: [
          { nodeId: 'sw-1', nodeType: 'SWITCH' as const, x: 350, y: 220 },
          { nodeId: 'rack-1', nodeType: 'RACK' as const, x: 210, y: 160 },
        ],
      };

      const result = await service.updateTopologyLayout(dto);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockPrisma.canvasNodePosition.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.networkSwitch.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sw-1' },
          data: { positionX: 350, positionY: 220 },
        }),
      );
      expect(mockPrisma.networkRack.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rack-1' },
          data: { positionX: 210, positionY: 160 },
        }),
      );
    });

    it('updateTopologyLayout does not update master entity coordinates for non-ALL view', async () => {
      mockPrisma.canvasNodePosition.upsert.mockResolvedValue({});
      mockPrisma.networkSwitch.updateMany.mockClear();
      mockPrisma.networkRack.updateMany.mockClear();

      const dto = {
        viewMode: 'NETWORK' as const,
        positions: [{ nodeId: 'sw-1', nodeType: 'SWITCH' as const, x: 400, y: 300 }],
      };

      const result = await service.updateTopologyLayout(dto);
      expect(result.success).toBe(true);
      expect(mockPrisma.networkSwitch.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.networkRack.updateMany).not.toHaveBeenCalled();
    });

    it('createTopologyLink connects two switch ports across switches and sets operStatus: ACTIVE', async () => {
      const sourcePort = {
        id: 'port-src',
        switchId: 'sw-1',
        portNumber: 49,
        speed: '10 Gbps',
        switch: { id: 'sw-1', name: 'SW-1' },
      };
      const targetPort = {
        id: 'port-dst',
        switchId: 'sw-2',
        portNumber: 25,
        speed: '10 Gbps',
        switch: { id: 'sw-2', name: 'SW-2' },
      };

      mockPrisma.switchPort.findUnique
        .mockResolvedValueOnce(sourcePort)
        .mockResolvedValueOnce(targetPort);

      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update
        .mockResolvedValueOnce({ ...sourcePort, connectedPortId: 'port-dst', mode: 'TRUNK' })
        .mockResolvedValueOnce({ ...targetPort, connectedPortId: 'port-src', mode: 'TRUNK' });

      const result = await service.createTopologyLink({
        sourcePortId: 'port-src',
        targetPortId: 'port-dst',
        speed: '10 Gbps',
      });

      expect(result.success).toBe(true);
      expect(result.link.sourcePortId).toBe('port-src');
      expect(result.link.targetPortId).toBe('port-dst');
      expect(result.link.operStatus).toBe('ACTIVE');
    });

    it('createTopologyLink rejects self-loops (sourcePortId === targetPortId)', async () => {
      mockPrisma.switchPort.findUnique.mockResolvedValue({ id: 'port-src', switchId: 'sw-1' });

      await expect(
        service.createTopologyLink({
          sourcePortId: 'port-src',
          targetPortId: 'port-src',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createTopologyLink rejects switch disjointness violations (sourcePort.switchId === targetPort.switchId)', async () => {
      const sourcePort = { id: 'port-1', switchId: 'sw-1', switch: { name: 'SW-1' } };
      const targetPort = { id: 'port-2', switchId: 'sw-1', switch: { name: 'SW-1' } };

      mockPrisma.switchPort.findUnique
        .mockResolvedValueOnce(sourcePort)
        .mockResolvedValueOnce(targetPort);

      await expect(
        service.createTopologyLink({
          sourcePortId: 'port-1',
          targetPortId: 'port-2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createTopologyLink evicts stale reverse and forward links preventing unique constraint violations', async () => {
      const sourcePort = {
        id: 'port-src',
        switchId: 'sw-1',
        connectedPortId: 'port-old-peer-1',
        switch: { id: 'sw-1', name: 'SW-1' },
      };
      const targetPort = {
        id: 'port-dst',
        switchId: 'sw-2',
        connectedPortId: 'port-old-peer-2',
        switch: { id: 'sw-2', name: 'SW-2' },
      };

      mockPrisma.switchPort.findUnique
        .mockResolvedValueOnce(sourcePort)
        .mockResolvedValueOnce(targetPort);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.switchPort.update
        .mockResolvedValueOnce({ ...sourcePort, connectedPortId: 'port-dst', mode: 'TRUNK' })
        .mockResolvedValueOnce({ ...targetPort, connectedPortId: 'port-src', mode: 'TRUNK' });

      await service.createTopologyLink({
        sourcePortId: 'port-src',
        targetPortId: 'port-dst',
      });

      // Verify reverse link eviction
      expect(mockPrisma.switchPort.updateMany).toHaveBeenCalledWith({
        where: {
          connectedPortId: { in: ['port-src', 'port-dst'] },
          id: { notIn: ['port-src', 'port-dst'] },
        },
        data: { connectedPortId: null, connectedSwitchId: null, operStatus: 'DOWN' },
      });

      // Verify forward old peer eviction
      expect(mockPrisma.switchPort.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['port-old-peer-1', 'port-old-peer-2'] } },
        data: { connectedPortId: null, connectedSwitchId: null, operStatus: 'DOWN' },
      });
    });

    it('createTopologyLink connects endpoint asset with auto IP binding', async () => {
      const sourcePort = { id: 'port-src', switchId: 'sw-1', switch: { id: 'sw-1', name: 'SW-1' } };
      const targetAsset = { id: 'ast-1', assetTag: 'AST-1001' };
      const matchedIp = { id: 'ip-1', address: '10.232.129.50', vlanId: 'vlan-1' };

      mockPrisma.switchPort.findUnique.mockResolvedValue(sourcePort);
      mockPrisma.asset.findUnique.mockResolvedValue(targetAsset);
      mockPrisma.iPAddress.findFirst.mockResolvedValue(matchedIp);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update.mockResolvedValue({
        id: 'port-src',
        connectedAssetId: 'ast-1',
        ipAddressId: 'ip-1',
        mode: 'ACCESS',
        operStatus: 'ACTIVE',
        vlanId: 'vlan-1',
      });

      const result = await service.createTopologyLink({
        sourcePortId: 'port-src',
        targetAssetId: 'ast-1',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.iPAddress.findFirst).toHaveBeenCalledWith({
        where: { assetId: 'ast-1' },
      });
      expect(result.link.targetAssetId).toBe('ast-1');
      expect(result.link.targetIpAddressId).toBe('ip-1');
    });

    it('createTopologyLink connects endpoint IP with auto asset binding', async () => {
      const sourcePort = { id: 'port-src', switchId: 'sw-1', switch: { id: 'sw-1', name: 'SW-1' } };
      const matchedIp = {
        id: 'ip-1',
        address: '10.232.129.50',
        assetId: 'ast-from-ip',
        vlanId: 'vlan-1',
      };
      const matchedAsset = { id: 'ast-from-ip', assetTag: 'AST-AUTO' };

      mockPrisma.switchPort.findUnique.mockResolvedValue(sourcePort);
      mockPrisma.iPAddress.findUnique.mockResolvedValue(matchedIp);
      mockPrisma.asset.findUnique.mockResolvedValue(matchedAsset);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update.mockResolvedValue({
        id: 'port-src',
        connectedAssetId: 'ast-from-ip',
        ipAddressId: 'ip-1',
        mode: 'ACCESS',
        operStatus: 'ACTIVE',
      });

      const result = await service.createTopologyLink({
        sourcePortId: 'port-src',
        targetIpAddressId: 'ip-1',
      });

      expect(result.success).toBe(true);
      expect(result.link.targetAssetId).toBe('ast-from-ip');
      expect(result.link.targetIpAddressId).toBe('ip-1');
    });

    it('createTopologyLink evicts other ports previously attached to the same asset', async () => {
      const sourcePort = { id: 'port-src', switchId: 'sw-1', switch: { id: 'sw-1', name: 'SW-1' } };
      const targetAsset = { id: 'ast-1', assetTag: 'AST-1001' };

      mockPrisma.switchPort.findUnique.mockResolvedValue(sourcePort);
      mockPrisma.asset.findUnique.mockResolvedValue(targetAsset);
      mockPrisma.iPAddress.findFirst.mockResolvedValue(null);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.switchPort.update.mockResolvedValue({
        id: 'port-src',
        connectedAssetId: 'ast-1',
        mode: 'ACCESS',
        operStatus: 'ACTIVE',
      });

      await service.createTopologyLink({
        sourcePortId: 'port-src',
        targetAssetId: 'ast-1',
      });

      expect(mockPrisma.switchPort.updateMany).toHaveBeenCalledWith({
        where: {
          connectedAssetId: 'ast-1',
          id: { not: 'port-src' },
        },
        data: { connectedAssetId: null, operStatus: 'DOWN' },
      });
    });

    it('createTopologyLink records structured audit log CABLE_PATCH_CONNECTED', async () => {
      const sourcePort = { id: 'port-src', switchId: 'sw-1', switch: { id: 'sw-1', name: 'SW-1' } };
      const targetPort = { id: 'port-dst', switchId: 'sw-2', switch: { id: 'sw-2', name: 'SW-2' } };

      mockPrisma.switchPort.findUnique
        .mockResolvedValueOnce(sourcePort)
        .mockResolvedValueOnce(targetPort);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update
        .mockResolvedValueOnce({ ...sourcePort, connectedPortId: 'port-dst', mode: 'TRUNK' })
        .mockResolvedValueOnce({ ...targetPort, connectedPortId: 'port-src', mode: 'TRUNK' });

      await service.createTopologyLink({
        sourcePortId: 'port-src',
        targetPortId: 'port-dst',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CABLE_PATCH_CONNECTED',
          entity: 'SwitchPort',
          entityId: 'port-src',
        }),
      );
    });

    it('deleteTopologyLink unpatches port and clears peer port symmetrically', async () => {
      const port = {
        id: 'port-src',
        connectedPortId: 'port-dst',
        switch: { id: 'sw-1', name: 'SW-1' },
      };
      mockPrisma.switchPort.findUnique.mockResolvedValue(port);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update.mockResolvedValue({});

      const result = await service.deleteTopologyLink('port-src');
      expect(result.success).toBe(true);

      // Clears reverse link
      expect(mockPrisma.switchPort.updateMany).toHaveBeenCalledWith({
        where: { connectedPortId: 'port-src' },
        data: { connectedPortId: null, connectedSwitchId: null, operStatus: 'DOWN' },
      });

      // Clears forward peer port
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-dst' },
          data: { connectedPortId: null, connectedSwitchId: null, operStatus: 'DOWN' },
        }),
      );

      // Clears target port
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-src' },
          data: expect.objectContaining({
            connectedPortId: null,
            connectedSwitchId: null,
            connectedAssetId: null,
            ipAddressId: null,
            operStatus: 'DOWN',
          }),
        }),
      );
    });

    it('deleteTopologyLink records structured audit log CABLE_PATCH_DISCONNECTED', async () => {
      const port = {
        id: 'port-src',
        connectedPortId: 'port-dst',
        switch: { id: 'sw-1', name: 'SW-1' },
      };
      mockPrisma.switchPort.findUnique.mockResolvedValue(port);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update.mockResolvedValue({});

      await service.deleteTopologyLink('port-src');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CABLE_PATCH_DISCONNECTED',
          entity: 'SwitchPort',
          entityId: 'port-src',
        }),
      );
    });

    it('deleteTopologyLink resets port config when resetPortConfig: true', async () => {
      const port = {
        id: 'port-src',
        connectedPortId: 'port-dst',
        switch: { id: 'sw-1', name: 'SW-1' },
      };
      mockPrisma.switchPort.findUnique.mockResolvedValue(port);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update.mockResolvedValue({});

      const result = await service.deleteTopologyLink('port-src', {
        resetPortConfig: true,
        reason: 'Decommissioning link',
      });
      expect(result.success).toBe(true);

      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-src' },
          data: expect.objectContaining({
            connectedPortId: null,
            connectedSwitchId: null,
            connectedAssetId: null,
            ipAddressId: null,
            operStatus: 'DOWN',
            mode: 'ACCESS',
            vlanId: null,
            taggedVlanIds: Prisma.JsonNull,
          }),
        }),
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CABLE_PATCH_DISCONNECTED',
          entity: 'SwitchPort',
          entityId: 'port-src',
          details: expect.stringContaining('Decommissioning link'),
        }),
      );
    });

    it('deleteTopologyLink preserves port configuration when resetPortConfig is false or undefined', async () => {
      const port = {
        id: 'port-src',
        mode: 'TRUNK',
        vlanId: 'vlan-100',
        connectedPortId: 'port-dst',
        switch: { id: 'sw-1', name: 'SW-1' },
      };
      mockPrisma.switchPort.findUnique.mockResolvedValue(port);
      mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.switchPort.update.mockResolvedValue({});

      // Case A: resetPortConfig is false
      await service.deleteTopologyLink('port-src', { resetPortConfig: false });
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-src' },
          data: {
            connectedPortId: null,
            connectedSwitchId: null,
            connectedAssetId: null,
            ipAddressId: null,
            operStatus: 'DOWN',
          },
        }),
      );

      // Reset call history
      mockPrisma.switchPort.update.mockClear();

      // Case B: query is undefined
      await service.deleteTopologyLink('port-src');
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-src' },
          data: {
            connectedPortId: null,
            connectedSwitchId: null,
            connectedAssetId: null,
            ipAddressId: null,
            operStatus: 'DOWN',
          },
        }),
      );
    });

    describe('parseSpeedMbps', () => {
      it('parses various speed formats accurately with safe fallbacks', () => {
        expect(parseSpeedMbps('10 Gbps')).toBe(10000);
        expect(parseSpeedMbps('1 Gbps')).toBe(1000);
        expect(parseSpeedMbps('40 Gbps')).toBe(40000);
        expect(parseSpeedMbps('100 Mbps')).toBe(100);
        expect(parseSpeedMbps('10G')).toBe(10000);
        expect(parseSpeedMbps('1G')).toBe(1000);
        expect(parseSpeedMbps('100M')).toBe(100);
        expect(parseSpeedMbps('1000')).toBe(1000);
        expect(parseSpeedMbps('Auto')).toBe(1000);
        expect(parseSpeedMbps('')).toBe(1000);
        expect(parseSpeedMbps(null)).toBe(1000);
        expect(parseSpeedMbps(undefined)).toBe(1000);
      });
    });
  });
});

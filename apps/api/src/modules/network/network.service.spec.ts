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
          poeEnabled: true,
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
        poeEnabled: true,
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
          poeEnabled: true,
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
    it('getTopology returns complete normalized graph with summary metrics', async () => {
      const mockRack = {
        id: 'rack-1',
        name: 'Core Datacenter Rack 01',
        code: 'RACK-DC01',
        status: 'ACTIVE',
        positionX: 200,
        positionY: 150,
      };

      const mockPeerPort = {
        id: 'port-peer-1',
        name: 'Te1/0/25',
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
            poeEnabled: false,
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
            id: 'port-49',
            portNumber: 49,
            name: 'Te1/0/49',
            operStatus: 'ACTIVE',
            poeEnabled: false,
            speed: '10 Gbps',
            formFactor: 'SFP_PLUS_10G',
            connectedPortId: 'port-peer-1',
            connectedPort: mockPeerPort,
          },
        ],
      };

      mockPrisma.networkRack.findMany.mockResolvedValue([mockRack]);
      mockPrisma.networkSwitch.findMany.mockResolvedValue([mockSwitch]);
      mockPrisma.vLAN.findMany.mockResolvedValue([
        { id: 'vlan-1', vlanNumber: 100, name: 'Servers', domain: 'NETWORK', subnets: [], switchPorts: [] },
      ]);
      mockPrisma.subnet.findMany.mockResolvedValue([
        { id: 'sub-1', cidr: '10.232.100.0/24', name: 'BSL Servers', domain: 'NETWORK', totalIps: 254, usedIps: 24 },
      ]);
      mockPrisma.canvasNodePosition.findMany.mockResolvedValue([]);

      const result = await service.getTopology({ mode: 'ALL' });

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('racks');
      expect(result).toHaveProperty('vlans');
      expect(result).toHaveProperty('subnets');
      expect(result).toHaveProperty('summaryMetrics');

      // Verify node generation
      expect(result.nodes.length).toBe(2); // 1 switch + 1 connected server
      expect(result.nodes[0].type).toBe('SWITCH');
      expect(result.nodes[0].id).toBe('sw-1');
      expect(result.nodes[1].type).toBe('SERVER');
      expect(result.nodes[1].id).toBe('ast-srv-1');

      // Verify edge generation (1 trunk uplink edge + 1 endpoint edge)
      expect(result.edges.length).toBe(2);
      expect(result.summaryMetrics.activeLinks).toBe(2);
      expect(result.summaryMetrics.totalSwitches).toBe(1);
      expect(result.summaryMetrics.totalServers).toBe(1);
    });

    it('updateTopologyLayout persists canvas coordinates and syncs master entities for ALL view', async () => {
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
      expect(mockPrisma.networkSwitch.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sw-1' }, data: { positionX: 350, positionY: 220 } }),
      );
      expect(mockPrisma.networkRack.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rack-1' }, data: { positionX: 210, positionY: 160 } }),
      );
    });

    it('createTopologyLink connects two switch ports atomically', async () => {
      const sourcePort = { id: 'port-src', switchId: 'sw-1', portNumber: 49, speed: '10 Gbps' };
      const targetPort = { id: 'port-dst', switchId: 'sw-2', portNumber: 25, speed: '10 Gbps' };

      mockPrisma.switchPort.findUnique
        .mockResolvedValueOnce(sourcePort)
        .mockResolvedValueOnce(targetPort);

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

    it('createTopologyLink rejects self-loops', async () => {
      mockPrisma.switchPort.findUnique.mockResolvedValue({ id: 'port-src' });

      await expect(
        service.createTopologyLink({
          sourcePortId: 'port-src',
          targetPortId: 'port-src',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deleteTopologyLink unpatches port and resets operStatus', async () => {
      const port = {
        id: 'port-src',
        connectedPortId: 'port-dst',
      };
      mockPrisma.switchPort.findUnique.mockResolvedValue(port);
      mockPrisma.switchPort.update.mockResolvedValue({});

      const result = await service.deleteTopologyLink('port-src');
      expect(result.success).toBe(true);
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-dst' },
          data: { connectedPortId: null, connectedSwitchId: null, operStatus: 'DOWN' },
        }),
      );
      expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'port-src' },
          data: { connectedPortId: null, connectedSwitchId: null, connectedAssetId: null, ipAddressId: null, operStatus: 'DOWN' },
        }),
      );
    });
  });
});

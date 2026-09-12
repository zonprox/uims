import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IPStatus, VlanStatus } from '@uims/shared-types';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import type { PrismaService } from '../../database/prisma.service';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';

describe('NetworkModule - Adversarial & Stress Verification Suite', () => {
  let service: NetworkService;
  let controller: NetworkController;
  let interceptor: TransformInterceptor<unknown>;

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
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      subnet: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalIps: 0 } }),
      },
      iPAddress: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-uuid' }),
      },
    };

    service = new NetworkService(mockPrisma as unknown as PrismaService);

    controller = new NetworkController(service);
    interceptor = new TransformInterceptor();
  });

  // Helper to execute interceptor on data
  const interceptResponse = async <T>(data: T) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/v1/network' }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of(data),
    };

    return new Promise<{ success: boolean; data: T; timestamp: string }>((resolve) => {
      interceptor.intercept(mockContext, mockHandler).subscribe((res) => {
        resolve(res as { success: boolean; data: T; timestamp: string });
      });
    });
  };

  // =========================================================================
  // 1. VLAN, SUBNET, IP ADDRESS CRUD STRESS TESTS
  // =========================================================================

  describe('1. CRUD Operations & Boundary Resilience', () => {
    describe('VLAN CRUD', () => {
      it('creates VLAN with valid parameters', async () => {
        const createData = {
          vlanNumber: 130,
          name: 'Access Control',
          description: 'Door access controllers',
          status: VlanStatus.ACTIVE,
          locationId: 'loc-1',
        };

        const expectedVlan = {
          id: 'vlan-uuid-130',
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date(),
          location: { id: 'loc-1', name: 'BSL Factory' },
          subnets: [],
        };

        mockPrisma.vLAN.create.mockResolvedValue(expectedVlan);

        const result = await service.createVlan(createData);
        expect(mockPrisma.vLAN.create).toHaveBeenCalledWith({
          data: {
            vlanNumber: 130,
            name: 'Access Control',
            description: 'Door access controllers',
            status: VlanStatus.ACTIVE,
            locationId: 'loc-1',
          },
          include: { location: true, subnets: true },
        });
        expect(result).toBe(expectedVlan);
      });

      it('findVlan finds by numeric string and throws NotFoundException when missing', async () => {
        mockPrisma.vLAN.findFirst.mockResolvedValue(null);
        await expect(service.findVlan('9999')).rejects.toThrow(NotFoundException);

        const vlan = {
          id: 'vlan-1',
          vlanNumber: 130,
          name: 'Access Control',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockPrisma.vLAN.findFirst.mockResolvedValue(vlan);
        const found = await service.findVlan('130');
        expect(found).toBe(vlan);
        expect(mockPrisma.vLAN.findFirst).toHaveBeenCalledWith({
          where: { OR: [{ id: '130' }, { vlanNumber: 130 }] },
          include: {
            location: true,
            subnets: true,
            ipAddresses: { take: 100, orderBy: { address: 'asc' } },
          },
        });
      });

      it('updateVlan updates fields and returns updated entity', async () => {
        const updateData = { name: 'Updated Name', description: 'Updated Desc' };
        const updated = { id: 'vlan-1', vlanNumber: 130, ...updateData };
        mockPrisma.vLAN.update.mockResolvedValue(updated);

        const res = await service.updateVlan('vlan-1', updateData);
        expect(mockPrisma.vLAN.update).toHaveBeenCalledWith({
          where: { id: 'vlan-1' },
          data: expect.objectContaining(updateData),
          include: { location: true, subnets: true },
        });
        expect(res).toBe(updated);
      });

      it('deleteVlan deletes VLAN by ID', async () => {
        mockPrisma.vLAN.delete.mockResolvedValue({ id: 'vlan-1' });
        const res = await service.deleteVlan('vlan-1');
        expect(mockPrisma.vLAN.delete).toHaveBeenCalledWith({ where: { id: 'vlan-1' } });
        expect(res).toEqual({ id: 'vlan-1' });
      });
    });

    describe('Subnet CRUD', () => {
      it('createSubnet auto-calculates network parameters for /24', async () => {
        mockPrisma.subnet.create.mockImplementation((args) =>
          Promise.resolve({
            id: 'sub-24',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
            vlan: { id: 'vlan-1', vlanNumber: 130, name: 'VLAN 130', status: 'ACTIVE' },
            location: { id: 'loc-1', name: 'BSL Factory' },
          }),
        );

        const res = await service.createSubnet({
          cidr: '10.232.130.0/24',
          name: 'Access Control /24',
          vlanId: 'vlan-1',
        });

        expect(res.cidr).toBe('10.232.130.0/24');
        expect(res.networkAddress).toBe('10.232.130.0');
        expect(res.broadcastAddress).toBe('10.232.130.255');
        expect(res.netmask).toBe('255.255.255.0');
        expect(res.startIp).toBe('10.232.130.1');
        expect(res.endIp).toBe('10.232.130.254');
        expect(res.gateway).toBe('10.232.130.254');
        expect(res.totalIps).toBe(254);
      });

      it('createSubnet auto-calculates network parameters for small /30 subnet', async () => {
        mockPrisma.subnet.create.mockImplementation((args) =>
          Promise.resolve({
            id: 'sub-30',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
            vlan: null,
            location: null,
          }),
        );

        const res = await service.createSubnet({
          cidr: '192.168.10.0/30',
          name: 'P2P Link',
        });

        expect(res.totalIps).toBe(2);
        expect(res.startIp).toBe('192.168.10.1');
        expect(res.endIp).toBe('192.168.10.2');
        expect(res.gateway).toBe('192.168.10.2'); // Enterprise convention: highest usable host (usableEnd)
      });

      it('createSubnet rejects invalid CIDR strings', async () => {
        await expect(
          service.createSubnet({ cidr: '10.232.130.0/35', name: 'Bad' }),
        ).rejects.toThrow(BadRequestException);

        await expect(service.createSubnet({ cidr: 'not-a-cidr', name: 'Bad' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('updateSubnet recalculates network if CIDR changes', async () => {
        mockPrisma.subnet.update.mockImplementation((args) =>
          Promise.resolve({
            id: 'sub-1',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
            vlan: null,
            location: null,
          }),
        );

        const updated = await service.updateSubnet('sub-1', {
          cidr: '172.16.0.0/20',
          name: 'Expanded Subnet',
        });

        expect(updated.netmask).toBe('255.255.240.0');
        expect(updated.totalIps).toBe(4094);
      });

      it('deleteSubnet deletes subnet by ID', async () => {
        mockPrisma.subnet.delete.mockResolvedValue({ id: 'sub-1' });
        const res = await service.deleteSubnet('sub-1');
        expect(mockPrisma.subnet.delete).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
        expect(res).toEqual({ id: 'sub-1' });
      });
    });

    describe('IPAddress CRUD', () => {
      it('creates IP address and normalizes MAC and maps status', async () => {
        mockPrisma.iPAddress.create.mockImplementation((args) =>
          Promise.resolve({
            id: 'ip-uuid-1',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
            subnet: null,
            vlan: null,
            location: null,
            asset: null,
            assignedUser: null,
          }),
        );

        const created = await service.createIp({
          address: '10.232.130.50',
          macAddress: '44-19-b6-aa-bb-cc', // Hikvision MAC format
          status: 'Allocated',
          deviceType: 'CCTV',
        });

        expect(created.address).toBe('10.232.130.50');
        expect(created.mac).toBe('44:19:B6:AA:BB:CC');
        expect(created.vendor).toBe('Hikvision');
        expect(created.status).toBe('Allocated');
      });

      it('findIp returns IP with formatted metadata', async () => {
        mockPrisma.iPAddress.findFirst.mockResolvedValue({
          id: 'ip-1',
          address: '10.232.130.15',
          hostname: 'reader-01',
          status: 'ASSIGNED',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const found = await service.findIp('10.232.130.15');
        expect(found.address).toBe('10.232.130.15');
        expect(found.hostname).toBe('reader-01');
      });

      it('deleteIp removes IP and updates subnet usage counter', async () => {
        mockPrisma.iPAddress.findUnique.mockResolvedValue({ subnetId: 'sub-target' });
        mockPrisma.iPAddress.delete.mockResolvedValue({ id: 'ip-1' });
        mockPrisma.iPAddress.count.mockResolvedValue(0);
        mockPrisma.subnet.update.mockResolvedValue({});

        const res = await service.deleteIp('ip-1');
        expect(res).toEqual({ success: true, id: 'ip-1' });
        expect(mockPrisma.iPAddress.delete).toHaveBeenCalledWith({ where: { id: 'ip-1' } });
        expect(mockPrisma.subnet.update).toHaveBeenCalledWith({
          where: { id: 'sub-target' },
          data: { usedIps: 0, reservedIps: 0 },
        });
      });
    });
  });

  // =========================================================================
  // 2. BOUNDED QUERY ENFORCEMENT STRESS TESTS
  // =========================================================================

  describe('2. Bounded Query Enforcement (take <= 100, page normalization)', () => {
    describe('VLAN List Endpoint Bounded Query', () => {
      it('clamps limit=500 to take=100', async () => {
        await service.findAllVlans({ limit: 500 });
        expect(mockPrisma.vLAN.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 100 }),
        );
      });

      it('clamps limit=0 to default bounded take (50 <= 100)', async () => {
        await service.findAllVlans({ limit: 0 });
        const callArgs = mockPrisma.vLAN.findMany.mock.lastCall?.[0];
        expect(callArgs.take).toBeLessThanOrEqual(100);
        expect(callArgs.take).toBe(50);
      });

      it('clamps negative limits (limit=-10, limit=-500) to take=1 (<= 100)', async () => {
        await service.findAllVlans({ limit: -10 });
        expect(mockPrisma.vLAN.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 1 }),
        );

        await service.findAllVlans({ limit: -500 });
        expect(mockPrisma.vLAN.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 1 }),
        );
      });

      it('clamps pageSize=500 to take=100', async () => {
        await service.findAllVlans({ pageSize: 500 });
        expect(mockPrisma.vLAN.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 100 }),
        );
      });

      it('normalizes page=0 and negative pages to skip=0', async () => {
        await service.findAllVlans({ page: 0, limit: 20 });
        expect(mockPrisma.vLAN.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ skip: 0, take: 20 }),
        );

        await service.findAllVlans({ page: -5, limit: 20 });
        expect(mockPrisma.vLAN.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ skip: 0, take: 20 }),
        );
      });

      it('handles NaN/invalid string query parameters safely', async () => {
        // Simulating unvalidated raw query input
        await service.findAllVlans({ limit: 'NaN' as unknown as number });
        const callArgs = mockPrisma.vLAN.findMany.mock.lastCall?.[0];
        expect(callArgs.take).toBeLessThanOrEqual(100);
        expect(callArgs.take).toBe(50);
      });
    });

    describe('Subnet List Endpoint Bounded Query', () => {
      it('clamps limit=500 to take=100', async () => {
        await service.findAllSubnets({ limit: 500 });
        expect(mockPrisma.subnet.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 100 }),
        );
      });

      it('clamps limit=0 to default bounded take=50', async () => {
        await service.findAllSubnets({ limit: 0 });
        const callArgs = mockPrisma.subnet.findMany.mock.lastCall?.[0];
        expect(callArgs.take).toBeLessThanOrEqual(100);
        expect(callArgs.take).toBe(50);
      });

      it('clamps negative limit=-99 to take=1', async () => {
        await service.findAllSubnets({ limit: -99 });
        expect(mockPrisma.subnet.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 1 }),
        );
      });

      it('calculates pagination skip accurately for page 3 with limit 25', async () => {
        await service.findAllSubnets({ page: 3, limit: 25 });
        expect(mockPrisma.subnet.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ skip: 50, take: 25 }),
        );
      });
    });

    describe('IPAddress List Endpoint Bounded Query', () => {
      it('clamps limit=500 to take=100', async () => {
        await service.findAllIps({ limit: 500 });
        expect(mockPrisma.iPAddress.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 100 }),
        );
      });

      it('clamps limit=0 to take=50', async () => {
        await service.findAllIps({ limit: 0 });
        const callArgs = mockPrisma.iPAddress.findMany.mock.lastCall?.[0];
        expect(callArgs.take).toBeLessThanOrEqual(100);
        expect(callArgs.take).toBe(50);
      });

      it('clamps negative limit to take=1', async () => {
        await service.findAllIps({ limit: -100 });
        expect(mockPrisma.iPAddress.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 1 }),
        );
      });

      it('normalizes negative page to skip=0', async () => {
        await service.findAllIps({ page: -99, limit: 10 });
        expect(mockPrisma.iPAddress.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ skip: 0, take: 10 }),
        );
      });
    });
  });

  // =========================================================================
  // 3. DETERMINISTIC ORDERBY VERIFICATION ON ALL LIST ENDPOINTS
  // =========================================================================

  describe('3. Deterministic OrderBy Enforcement', () => {
    it('findAllVlans enforces deterministic orderBy: [{ vlanNumber: "asc" }, { id: "asc" }]', async () => {
      await service.findAllVlans();
      expect(mockPrisma.vLAN.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ vlanNumber: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('findAllSubnets enforces deterministic orderBy: [{ cidr: "asc" }, { id: "asc" }]', async () => {
      await service.findAllSubnets();
      expect(mockPrisma.subnet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ cidr: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('findAllIps enforces deterministic orderBy: [{ createdAt: "desc" }, { id: "asc" }]', async () => {
      await service.findAllIps();
      expect(mockPrisma.iPAddress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        }),
      );
    });

    it('findVlan nested ipAddresses query enforces bounded take and deterministic orderBy', async () => {
      mockPrisma.vLAN.findFirst.mockResolvedValue({
        id: 'vlan-1',
        vlanNumber: 130,
        name: 'VLAN 130',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.findVlan('vlan-1');
      expect(mockPrisma.vLAN.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            ipAddresses: {
              take: 100,
              orderBy: { address: 'asc' },
            },
          }),
        }),
      );
    });

    it('findSubnet nested ipAddresses query enforces bounded take and deterministic orderBy', async () => {
      mockPrisma.subnet.findFirst.mockResolvedValue({
        id: 'sub-1',
        cidr: '10.232.130.0/24',
        name: 'Subnet 130',
        totalIps: 254,
        usedIps: 0,
        reservedIps: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.findSubnet('sub-1');
      expect(mockPrisma.subnet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            ipAddresses: {
              take: 100,
              orderBy: { address: 'asc' },
            },
          }),
        }),
      );
    });

    it('autoDetect candidate subnets query enforces bounded take and deterministic orderBy', async () => {
      await service.autoDetect('10.232.130.15');
      expect(mockPrisma.subnet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          orderBy: { cidr: 'asc' },
        }),
      );
    });
  });

  // =========================================================================
  // 4. AUTO-DETECT ON IP CREATION (CIDR MATCHING WITHOUT SUBNETID / VLANID)
  // =========================================================================

  describe('4. Auto-detect Subnet and VLAN via CIDR Matching on IP Creation', () => {
    it('automatically discovers and binds Subnet and VLAN from candidate subnets', async () => {
      const candidateSubnets = [
        {
          id: 'sub-office-1',
          cidr: '192.168.1.0/24',
          name: 'Office LAN',
          vlanId: 'vlan-10',
          locationId: 'loc-office',
        },
        {
          id: 'sub-ac-130',
          cidr: '10.232.130.0/24',
          name: 'Access Control',
          vlanId: 'vlan-130',
          locationId: 'loc-bsl',
        },
        {
          id: 'sub-cctv-99',
          cidr: '10.232.99.0/24',
          name: 'CCTV Network',
          vlanId: 'vlan-99',
          locationId: 'loc-bsl',
        },
      ];

      mockPrisma.subnet.findMany.mockResolvedValue(candidateSubnets);

      mockPrisma.iPAddress.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'ip-new-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          subnet: { id: 'sub-ac-130', cidr: '10.232.130.0/24' },
          vlan: { id: 'vlan-130', vlanNumber: 130, name: 'Access Control' },
          location: { id: 'loc-bsl', name: 'BSL Factory' },
          asset: null,
          assignedUser: null,
        }),
      );

      mockPrisma.iPAddress.count.mockResolvedValue(1);
      mockPrisma.subnet.update.mockResolvedValue({});

      // Create IP WITHOUT passing subnetId or vlanId
      const created = await service.createIp({
        address: '10.232.130.42',
        hostname: 'door-controller-42',
        status: IPStatus.ASSIGNED,
      });

      // Verify Prisma create received auto-discovered subnetId and vlanId
      expect(mockPrisma.iPAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: '10.232.130.42',
            subnetId: 'sub-ac-130',
            vlanId: 'vlan-130',
            locationId: 'loc-bsl',
          }),
        }),
      );

      expect(created.subnetId).toBe('sub-ac-130');
      expect(created.vlanId).toBe('vlan-130');
    });

    it('performs longest prefix matching (most specific CIDR) when subnets overlap', async () => {
      const overlappingSubnets = [
        {
          id: 'sub-supernet',
          cidr: '10.0.0.0/16',
          name: 'Corporate Supernet',
          vlanId: 'vlan-super',
          locationId: 'loc-main',
        },
        {
          id: 'sub-specific',
          cidr: '10.0.5.0/24',
          name: 'Server Room DMZ',
          vlanId: 'vlan-dmz',
          locationId: 'loc-datacenter',
        },
      ];

      mockPrisma.subnet.findMany.mockResolvedValue(overlappingSubnets);

      mockPrisma.iPAddress.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'ip-server-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          subnet: null,
          vlan: null,
          location: null,
          asset: null,
          assignedUser: null,
        }),
      );

      mockPrisma.iPAddress.count.mockResolvedValue(1);
      mockPrisma.subnet.update.mockResolvedValue({});

      await service.createIp({
        address: '10.0.5.77',
        hostname: 'dmz-web-01',
      });

      // Must bind to /24 (sub-specific), NOT /16 (sub-supernet)
      expect(mockPrisma.iPAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: '10.0.5.77',
            subnetId: 'sub-specific',
            vlanId: 'vlan-dmz',
            locationId: 'loc-datacenter',
          }),
        }),
      );
    });

    it('handles unassigned IP in unknown subnet gracefully without crashing', async () => {
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          cidr: '10.232.130.0/24',
          name: 'BSL Subnet',
          vlanId: 'vlan-130',
          locationId: 'loc-bsl',
        },
      ]);

      mockPrisma.iPAddress.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'ip-isolated',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          subnet: null,
          vlan: null,
          location: null,
          asset: null,
          assignedUser: null,
        }),
      );

      // Target IP not in any known subnet
      const res = await service.createIp({
        address: '172.31.50.10',
        hostname: 'external-box',
      });

      expect(mockPrisma.iPAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: '172.31.50.10',
            subnetId: undefined,
            vlanId: undefined,
          }),
        }),
      );
      expect(res.address).toBe('172.31.50.10');
    });

    it('auto-picks next available IP when address is empty but subnetId is provided', async () => {
      mockPrisma.subnet.findUnique.mockResolvedValue({
        id: 'sub-ac-130',
        cidr: '10.232.130.0/24',
        ipAddresses: [{ address: '10.232.130.1' }, { address: '10.232.130.2' }],
      });

      mockPrisma.iPAddress.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'ip-auto-next',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          subnet: null,
          vlan: null,
          location: null,
          asset: null,
          assignedUser: null,
        }),
      );

      mockPrisma.iPAddress.count.mockResolvedValue(1);
      mockPrisma.subnet.update.mockResolvedValue({});

      // Address is undefined/empty
      await service.createIp({
        subnetId: 'sub-ac-130',
        hostname: 'auto-allocated-host',
      });

      // Should automatically select 10.232.130.3
      expect(mockPrisma.iPAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: '10.232.130.3',
            subnetId: 'sub-ac-130',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // 6. STANDARD RESPONSE ENVELOPE FORMAT VERIFICATION
  // =========================================================================

  describe('6. Standard Response Envelope Verification ({ success: true, data: T, timestamp: string })', () => {
    it('wraps VLAN responses in { success: true, data: T, timestamp: ISO } format', async () => {
      const mockVlans = [
        {
          id: 'vlan-1',
          vlanNumber: 130,
          name: 'Access Control',
          status: 'ACTIVE',
        },
      ];

      mockPrisma.vLAN.findMany.mockResolvedValue(mockVlans);

      const controllerResult = await controller.findAllVlans({});
      const envelope = await interceptResponse(controllerResult);

      expect(envelope).toHaveProperty('success', true);
      expect(envelope).toHaveProperty('data', mockVlans);
      expect(envelope).toHaveProperty('timestamp');
      expect(typeof envelope.timestamp).toBe('string');
      // Verify valid ISO date format
      expect(new Date(envelope.timestamp).toISOString()).toBe(envelope.timestamp);
    });

    it('wraps Subnet responses in standard envelope', async () => {
      const mockSubnet = {
        id: 'sub-1',
        cidr: '10.232.130.0/24',
        name: 'Access Control Subnet',
        totalIps: 254,
        usedIps: 10,
        reservedIps: 0,
        utilization: 3.9,
      };

      const envelope = await interceptResponse(mockSubnet);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(mockSubnet);
      expect(Number.isNaN(Date.parse(envelope.timestamp))).toBe(false);
    });

    it('wraps IPAddress list responses in standard envelope', async () => {
      const mockIpList = [
        {
          id: 'ip-1',
          address: '10.232.130.15',
          hostname: 'reader-01',
        },
      ];

      const envelope = await interceptResponse(mockIpList);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(mockIpList);
      expect(new Date(envelope.timestamp).getFullYear()).toBeGreaterThanOrEqual(2026);
    });

    it('wraps automation calculation endpoints in standard envelope', async () => {
      const calc = controller.calculateSubnet({ cidr: '10.232.130.0/24' });
      const envelope = await interceptResponse(calc);

      expect(envelope.success).toBe(true);
      expect(envelope.data).toHaveProperty('usableHosts', 254);
      expect(envelope.data).toHaveProperty('suggestedGateway', '10.232.130.254');
    });
  });
});

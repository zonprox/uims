import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/database/prisma.service';
import type { CreateIPAddressDto } from '../src/modules/network/dto/create-ip.dto';
import type { UpdateIPAddressDto } from '../src/modules/network/dto/update-ip.dto';
import { NetworkService } from '../src/modules/network/network.service';

interface MockPrismaClient {
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
  networkSwitch: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  switchPort: {
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

describe('Adversarial M2 Network Challenger Suite', () => {
  let service: NetworkService;
  let mockPrisma: MockPrismaClient;

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
      networkSwitch: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      switchPort: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new NetworkService(mockPrisma as unknown as PrismaService);
  });

  // =========================================================================
  // SECTION 1: SWITCH PORT DYNAMIC GENERATION (generateDefaultPorts)
  // =========================================================================
  describe('1. Switch Port Dynamic Generation (generateDefaultPorts)', () => {
    it('8-Port Switch: exactly 8 RJ45 1G access + 2 RJ45 uplinks + 2 SFP fiber = 12 total ports', async () => {
      await service.generateDefaultPorts('sw-8p', 8);

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.switchPort.createMany.mock.calls[0][0];
      const ports = callArgs.data;

      // Exactly 12 total ports (8 access + 2 uplink + 2 fiber)
      expect(ports).toHaveLength(12);

      // Verify 8 RJ45 1G access ports
      for (let i = 0; i < 8; i++) {
        const portNum = i + 1;
        expect(ports[i]).toMatchObject({
          switchId: 'sw-8p',
          portNumber: portNum,
          name: `Gi1/0/${portNum}`,
          formFactor: 'RJ45_1G',
          poeEnabled: true,
          adminStatus: 'UP',
          operStatus: 'DOWN',
          speed: '1 Gbps',
          duplex: 'Full',
          mode: 'ACCESS',
        });
      }

      // Verify 2 RJ45 uplink ports
      expect(ports[8]).toMatchObject({
        switchId: 'sw-8p',
        portNumber: 9,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '1 Gbps',
        duplex: 'Full',
        mode: 'TRUNK',
        description: 'RJ45 Uplink 1',
      });

      expect(ports[9]).toMatchObject({
        switchId: 'sw-8p',
        portNumber: 10,
        name: 'Uplink 2',
        formFactor: 'RJ45_1G',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '1 Gbps',
        duplex: 'Full',
        mode: 'TRUNK',
        description: 'RJ45 Uplink 2',
      });

      // Verify 2 SFP optical ports
      expect(ports[10]).toMatchObject({
        switchId: 'sw-8p',
        portNumber: 11,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '10 Gbps',
        duplex: 'Full',
        mode: 'TRUNK',
      });

      expect(ports[11]).toMatchObject({
        switchId: 'sw-8p',
        portNumber: 12,
        name: 'SFP 2',
        formFactor: 'SFP_PLUS_10G',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '10 Gbps',
        duplex: 'Full',
        mode: 'TRUNK',
      });
    });

    it('16-Port Switch: exactly 16 RJ45 1G access + 2 RJ45 uplinks + 2 SFP fiber = 20 total ports', async () => {
      await service.generateDefaultPorts('sw-16p', 16);

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;

      expect(ports).toHaveLength(20);

      // Verify RJ45 ports 1..16
      for (let i = 0; i < 16; i++) {
        const portNum = i + 1;
        expect(ports[i]).toMatchObject({
          switchId: 'sw-16p',
          portNumber: portNum,
          name: `Gi1/0/${portNum}`,
          formFactor: 'RJ45_1G',
          poeEnabled: true,
          speed: '1 Gbps',
          mode: 'ACCESS',
        });
      }

      // Verify 2 RJ45 uplinks
      expect(ports[16]).toMatchObject({
        switchId: 'sw-16p',
        portNumber: 17,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        speed: '1 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      expect(ports[17]).toMatchObject({
        switchId: 'sw-16p',
        portNumber: 18,
        name: 'Uplink 2',
        formFactor: 'RJ45_1G',
        speed: '1 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      // Verify 2 SFP fiber
      expect(ports[18]).toMatchObject({
        switchId: 'sw-16p',
        portNumber: 19,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        speed: '10 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      expect(ports[19]).toMatchObject({
        switchId: 'sw-16p',
        portNumber: 20,
        name: 'SFP 2',
        formFactor: 'SFP_PLUS_10G',
        speed: '10 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });
    });

    it('24-Port Switch: exactly 24 RJ45 access + 2 RJ45 uplinks + 2 SFP fiber = 28 total ports', async () => {
      await service.generateDefaultPorts('sw-24p', 24);

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;

      expect(ports).toHaveLength(28);

      // 24 RJ45 ports
      for (let i = 0; i < 24; i++) {
        expect(ports[i].formFactor).toBe('RJ45_1G');
        expect(ports[i].speed).toBe('1 Gbps');
        expect(ports[i].mode).toBe('ACCESS');
        expect(ports[i].name).toBe(`Gi1/0/${i + 1}`);
      }

      // 2 RJ45 uplinks
      expect(ports[24]).toMatchObject({
        switchId: 'sw-24p',
        portNumber: 25,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        speed: '1 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      expect(ports[25]).toMatchObject({
        switchId: 'sw-24p',
        portNumber: 26,
        name: 'Uplink 2',
        formFactor: 'RJ45_1G',
        speed: '1 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      // 2 SFP fiber
      expect(ports[26]).toMatchObject({
        switchId: 'sw-24p',
        portNumber: 27,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        speed: '10 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      expect(ports[27]).toMatchObject({
        switchId: 'sw-24p',
        portNumber: 28,
        name: 'SFP 2',
        formFactor: 'SFP_PLUS_10G',
        speed: '10 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });
    });

    it('48-Port Switch: exactly 48 RJ45 access + 2 RJ45 uplinks + 2 SFP fiber = 52 total ports', async () => {
      await service.generateDefaultPorts('sw-48p', 48);

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;

      expect(ports).toHaveLength(52);

      // 48 RJ45 ports
      for (let i = 0; i < 48; i++) {
        expect(ports[i].formFactor).toBe('RJ45_1G');
        expect(ports[i].speed).toBe('1 Gbps');
        expect(ports[i].mode).toBe('ACCESS');
        expect(ports[i].name).toBe(`Gi1/0/${i + 1}`);
      }

      // 2 RJ45 uplinks
      expect(ports[48]).toMatchObject({
        switchId: 'sw-48p',
        portNumber: 49,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        speed: '1 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
        description: 'RJ45 Uplink 1',
      });

      // 2 SFP fiber
      expect(ports[50]).toMatchObject({
        switchId: 'sw-48p',
        portNumber: 51,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        speed: '10 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });
    });

    it('0 Access Port Switch (Terminal Server): 2 uplinks + 2 SFP preserved', async () => {
      await service.generateDefaultPorts('sw-0p', 0);

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;

      // 0 RJ45 + 2 RJ45 uplink + 2 SFP fiber = 4 total ports
      expect(ports).toHaveLength(4);

      expect(ports[0]).toMatchObject({
        switchId: 'sw-0p',
        portNumber: 1,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        speed: '1 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });

      expect(ports[2]).toMatchObject({
        switchId: 'sw-0p',
        portNumber: 3,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        speed: '10 Gbps',
        mode: 'TRUNK',
        poeEnabled: false,
      });
    });

    it('Adversarial edge cases: custom sizes (2, 12, 32 ports)', async () => {
      // 2-Port: 2 RJ45 + 1 Uplink + 1 SFP = 4 ports
      await service.generateDefaultPorts('sw-2p', 2, 1, 1, '1 Gbps', '1 Gbps');
      const p2 = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(p2).toHaveLength(4);
      expect(p2[0].name).toBe('Gi1/0/1');
      expect(p2[2].name).toBe('Uplink 1');
      expect(p2[3].name).toBe('SFP 1');
      expect(p2[3].formFactor).toBe('SFP_1G');

      mockPrisma.switchPort.createMany.mockClear();

      // 12-Port: 12 RJ45 + 2 Uplink + 2 SFP = 16 ports
      await service.generateDefaultPorts('sw-12p', 12, 2, 2);
      const p12 = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(p12).toHaveLength(16);
      expect(p12[11].name).toBe('Gi1/0/12');
      expect(p12[12].name).toBe('Uplink 1');
      expect(p12[14].name).toBe('SFP 1');

      mockPrisma.switchPort.createMany.mockClear();

      // 32-Port: 32 RJ45 + 2 Uplink + 4 SFP = 38 ports
      await service.generateDefaultPorts('sw-32p', 32, 2, 4);
      const p32 = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(p32).toHaveLength(38);
      expect(p32[31].name).toBe('Gi1/0/32');
      expect(p32[32].name).toBe('Uplink 1');
      expect(p32[34].name).toBe('SFP 1');
      expect(p32[34].formFactor).toBe('SFP_PLUS_10G');
    });

    it('createSwitch integration: verify auto-generation trigger for 8, 16, 24, 48 port switches', async () => {
      for (const count of [8, 16, 24, 48]) {
        mockPrisma.networkSwitch.findUnique.mockResolvedValue(null);
        mockPrisma.networkSwitch.create.mockResolvedValue({ id: `sw-${count}` });
        mockPrisma.networkSwitch.findFirst.mockResolvedValue({
          id: `sw-${count}`,
          name: `SW-${count}`,
        });
        mockPrisma.switchPort.createMany.mockClear();

        await service.createSwitch({
          name: `SW-${count}`,
          model: `Model-${count}`,
          vendor: 'Cisco',
          totalPorts: count,
          autoGeneratePorts: true,
        });

        expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
        const expectedTotal = count + 4; // count access + 2 uplink + 2 fiber
        expect(mockPrisma.switchPort.createMany.mock.calls[0][0].data).toHaveLength(expectedTotal);
      }
    });

    it('createSwitch rejects invalid port counts (e.g. 0, odd, out-of-bounds)', async () => {
      await expect(
        service.createSwitch({
          name: 'Terminal Server 0P',
          model: 'IM7200',
          vendor: 'Opengear',
          totalPorts: 0,
          autoGeneratePorts: true,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createSwitch({
          name: 'Odd Switch',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 7,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createSwitch({
          name: 'Over Switch',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // SECTION 2: DTO VALIDATION & BOUNDS STRESS TESTS
  // =========================================================================
  describe('2. DTO Validation & Bounds Stress Tests', () => {
    it('CreateSwitchDto: accepts valid even port counts (2, 4, 8, 16, 24, 48) and rejects out-of-bounds (<2, >48, odd, float)', async () => {
      const { CreateSwitchDto } = await import('../src/modules/network/dto/create-switch.dto');
      const { validate } = await import('class-validator');
      const { plainToInstance } = await import('class-transformer');

      for (const validPorts of [2, 4, 8, 16, 24, 48]) {
        const dto = plainToInstance(CreateSwitchDto, {
          name: `Switch-${validPorts}`,
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: validPorts,
        });
        const errors = await validate(dto);
        const portErrors = errors.filter((e) => e.property === 'totalPorts');
        expect(portErrors).toHaveLength(0);
      }

      // Rejects odd numbers
      for (const oddPorts of [1, 3, 7, 23, 25, 47, 49]) {
        const oddDto = plainToInstance(CreateSwitchDto, {
          name: `Switch-${oddPorts}`,
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: oddPorts,
        });
        const errors = await validate(oddDto);
        expect(errors.some((e) => e.property === 'totalPorts')).toBe(true);
      }

      // Negative, zero, and over-48 port counts
      for (const invalidPorts of [-1, 0, 50, 52, 53]) {
        const invDto = plainToInstance(CreateSwitchDto, {
          name: 'Invalid Ports',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: invalidPorts,
        });
        const invErrors = await validate(invDto);
        expect(invErrors.some((e) => e.property === 'totalPorts')).toBe(true);
      }

      // Non-integer ports
      const floatDto = plainToInstance(CreateSwitchDto, {
        name: 'Float Ports',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24.5,
      });
      const floatErrors = await validate(floatDto);
      expect(floatErrors.some((e) => e.property === 'totalPorts')).toBe(true);

      // Validate uplinkPorts and fiberPorts bounds
      const validUplinkDto = plainToInstance(CreateSwitchDto, {
        name: 'Valid Uplinks',
        model: 'C9300',
        vendor: 'Cisco',
        uplinkPorts: 4,
        fiberPorts: 4,
      });
      expect(
        (await validate(validUplinkDto)).filter(
          (e) => e.property === 'uplinkPorts' || e.property === 'fiberPorts',
        ),
      ).toHaveLength(0);

      const invalidUplinkDto = plainToInstance(CreateSwitchDto, {
        name: 'Invalid Uplinks',
        model: 'C9300',
        vendor: 'Cisco',
        uplinkPorts: 9,
        fiberPorts: -1,
      });
      const upErrors = await validate(invalidUplinkDto);
      expect(upErrors.some((e) => e.property === 'uplinkPorts')).toBe(true);
      expect(upErrors.some((e) => e.property === 'fiberPorts')).toBe(true);
    });

    it('CreateIPAddressDto & IPAddressQueryDto: do not expose or validate hostname', async () => {
      const { CreateIPAddressDto } = await import('../src/modules/network/dto/create-ip.dto');
      const { IPAddressQueryDto } = await import('../src/modules/network/dto/ip-query.dto');
      const { validate } = await import('class-validator');
      const { plainToInstance } = await import('class-transformer');

      const ipDto = plainToInstance(CreateIPAddressDto, {
        address: '10.232.130.10',
        hostname: 'legacy-hostname', // extraneous field
      });

      // Verification that class-validator does not track hostname
      const errors = await validate(ipDto);
      expect(errors).toHaveLength(0);
      expect(
        Object.getOwnPropertyDescriptor(CreateIPAddressDto.prototype, 'hostname'),
      ).toBeUndefined();

      const queryDto = plainToInstance(IPAddressQueryDto, {
        search: '10.232.130',
        hostname: 'legacy-hostname',
      });
      const queryErrors = await validate(queryDto);
      expect(queryErrors).toHaveLength(0);
      expect(
        Object.getOwnPropertyDescriptor(IPAddressQueryDto.prototype, 'hostname'),
      ).toBeUndefined();
    });
  });

  // =========================================================================
  // SECTION 2: HOSTNAME PURGE IN NETWORK MODULE
  // =========================================================================
  describe('2. Hostname Purge in Network Module', () => {
    it('findAllIps: search query filters ONLY on address, macAddress, vendor (NO hostname)', async () => {
      await service.findAllIps({ search: '10.232.130' });

      expect(mockPrisma.iPAddress.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.iPAddress.findMany.mock.calls[0][0];

      expect(callArgs.where).toBeDefined();
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR).toEqual([
        { address: { contains: '10.232.130', mode: 'insensitive' } },
        { macAddress: { contains: '10.232.130', mode: 'insensitive' } },
        { vendor: { contains: '10.232.130', mode: 'insensitive' } },
      ]);

      // Assert that 'hostname' key does NOT exist anywhere in where clause
      const whereKeys = Object.keys(callArgs.where);
      expect(whereKeys).not.toContain('hostname');
      for (const clause of callArgs.where.OR) {
        expect(Object.keys(clause)).not.toContain('hostname');
      }
    });

    it('createIp: completely ignores and purges any injected hostname property', async () => {
      mockPrisma.iPAddress.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'ip-test-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      // Adversarial payload containing an injected 'hostname' property
      const adversarialPayload = {
        address: '10.232.130.55',
        hostname: 'malicious-host.internal',
        macAddress: '00:1A:2B:3C:4D:5E',
        vendor: 'Cisco',
      };

      const result = await service.createIp(adversarialPayload as unknown as CreateIPAddressDto);

      // 1. Verify Prisma create call data does NOT include hostname
      expect(mockPrisma.iPAddress.create).toHaveBeenCalledTimes(1);
      const createData = mockPrisma.iPAddress.create.mock.calls[0][0].data;
      expect(createData.hostname).toBeUndefined();
      expect(Object.keys(createData)).not.toContain('hostname');

      // 2. Verify returned formatted IP does NOT contain hostname
      expect((result as Record<string, unknown>).hostname).toBeUndefined();
      expect(Object.keys(result)).not.toContain('hostname');
    });

    it('updateIp: completely ignores and purges any injected hostname property', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-test-1',
        address: '10.232.130.55',
        subnetId: null,
        status: 'AVAILABLE',
      });

      mockPrisma.iPAddress.update = vi
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'ip-test-1',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );

      const updatePayload = {
        address: '10.232.130.56',
        hostname: 'new-injected-host.internal',
        vendor: 'Dell',
      };

      await service.updateIp('ip-test-1', updatePayload as unknown as UpdateIPAddressDto);

      expect(mockPrisma.iPAddress.update).toHaveBeenCalledTimes(1);
      const updateData = mockPrisma.iPAddress.update.mock.calls[0][0].data;
      expect(updateData.hostname).toBeUndefined();
      expect(Object.keys(updateData)).not.toContain('hostname');
    });

    it('formatIp: returned entity has address, macAddress, vendor, but NEVER hostname', async () => {
      mockPrisma.iPAddress.findFirst.mockResolvedValue({
        id: 'ip-raw-1',
        address: '10.232.130.1',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        vendor: 'Aruba',
        deviceType: 'Switch',
        model: 'CX 6300',
        serialNumber: 'SN-12345',
        section: 'Rack A',
        floor: '2F',
        subnetId: null,
        vlanId: null,
        locationId: null,
        assetId: null,
        assignedUserId: null,
        status: 'AVAILABLE',
        pingStatus: 'online',
        responseTimeMs: 2.5,
        lastSeen: new Date(),
        description: 'Gateway IP',
        createdAt: new Date(),
        updatedAt: new Date(),
        subnet: null,
        vlan: null,
        location: null,
        asset: null,
        assignedUser: null,
        switchPorts: [],
      });

      const formatted = await service.findIp('ip-raw-1');

      expect(formatted).toBeDefined();
      expect(formatted.address).toBe('10.232.130.1');
      expect(formatted.macAddress).toBe('AA:BB:CC:DD:EE:FF');
      expect(formatted.vendor).toBe('Aruba');
      expect((formatted as Record<string, unknown>).hostname).toBeUndefined();
      expect(Object.keys(formatted)).not.toContain('hostname');
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { createSwitchSchema, updateSwitchSchema } from '@uims/shared-validators';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/database/prisma.service';
import {
  CreateSwitchDto,
  IsEvenNumberConstraint,
} from '../src/modules/network/dto/create-switch.dto';
import { UpdateSwitchDto } from '../src/modules/network/dto/update-switch.dto';
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

describe('Challenger M1: Adversarial Switch Validation & Port Generation Suite', () => {
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

  const baseValidSwitch = {
    name: 'SW-CHALLENGE-01',
    model: 'Catalyst-9300',
    vendor: 'Cisco',
  };

  // =========================================================================
  // 1. ZOD SCHEMA ADVERSARIAL CHALLENGES (createSwitchSchema & updateSwitchSchema)
  // =========================================================================
  describe('1. Zod Schema Adversarial Challenges (createSwitchSchema & updateSwitchSchema)', () => {
    describe('Odd totalPorts rejection (1..49 and beyond)', () => {
      const oddNumbers = [
        1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47,
        49, 51, 99,
      ];

      for (const odd of oddNumbers) {
        it(`rejects odd totalPorts = ${odd}`, () => {
          const res = createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: odd });
          expect(res.success).toBe(false);
          if (!res.success) {
            const messages = res.error.issues.map((i) => i.message);
            expect(
              messages.some(
                (m) =>
                  m.includes('even number') ||
                  m.includes('at least 2') ||
                  m.includes('cannot exceed 48'),
              ),
            ).toBe(true);
          }
        });
      }
    });

    describe('Out-of-range totalPorts rejection (<2 and >48)', () => {
      const outOfBounds = [0, -1, -2, -4, -10, -100, 50, 52, 64, 96, 100, 128, 1000];

      for (const oob of outOfBounds) {
        it(`rejects out-of-range totalPorts = ${oob}`, () => {
          const res = createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: oob });
          expect(res.success).toBe(false);
        });
      }
    });

    describe('Float and decimal totalPorts rejection', () => {
      const floats = [0.5, 2.5, 3.14, 24.1, 24.5, 47.9, 48.0001, -0.1, -2.5];

      for (const fl of floats) {
        it(`rejects float totalPorts = ${fl}`, () => {
          const res = createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: fl });
          expect(res.success).toBe(false);
        });
      }
    });

    describe('Uplink and Fiber port bounds (0..8)', () => {
      it('accepts valid uplink and fiber bounds (0, 1, 2, 4, 8)', () => {
        for (const valid of [0, 1, 2, 4, 8]) {
          expect(
            createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: valid }).success,
          ).toBe(true);
          expect(
            createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: valid }).success,
          ).toBe(true);
        }
      });

      it('rejects negative uplink and fiber ports (-1, -5)', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: -1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: -5 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: -1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: -5 }).success).toBe(
          false,
        );
      });

      it('rejects uplink and fiber ports exceeding 8 (9, 10, 100)', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 9 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 10 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 100 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: 9 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: 10 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: 100 }).success).toBe(
          false,
        );
      });

      it('rejects float uplink and fiber ports (2.5, 0.5)', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 2.5 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: 2.5 }).success).toBe(
          false,
        );
      });

      it('rejects non-numeric types for ports', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: '24' }).success).toBe(
          false,
        );
        expect(
          createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 'invalid' }).success,
        ).toBe(false);
        expect(
          createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: 'invalid' }).success,
        ).toBe(false);
      });
    });

    describe('All valid even numbers in [2, 48]', () => {
      const validEvens = [
        2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
      ];

      for (const even of validEvens) {
        it(`accepts valid even totalPorts = ${even}`, () => {
          const res = createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: even });
          expect(res.success).toBe(true);
        });
      }
    });

    describe('updateSwitchSchema partial validation', () => {
      it('accepts partial update with valid even totalPorts', () => {
        expect(updateSwitchSchema.safeParse({ totalPorts: 16 }).success).toBe(true);
        expect(updateSwitchSchema.safeParse({ uplinkPorts: 4, fiberPorts: 4 }).success).toBe(true);
      });

      it('rejects partial update with invalid totalPorts (odd, float, out of range)', () => {
        expect(updateSwitchSchema.safeParse({ totalPorts: 7 }).success).toBe(false);
        expect(updateSwitchSchema.safeParse({ totalPorts: 24.5 }).success).toBe(false);
        expect(updateSwitchSchema.safeParse({ totalPorts: 50 }).success).toBe(false);
        expect(updateSwitchSchema.safeParse({ totalPorts: 0 }).success).toBe(false);
        expect(updateSwitchSchema.safeParse({ uplinkPorts: -1 }).success).toBe(false);
        expect(updateSwitchSchema.safeParse({ fiberPorts: 9 }).success).toBe(false);
      });
    });
  });

  // =========================================================================
  // 2. DTO & CLASS-VALIDATOR ADVERSARIAL CHALLENGES
  // =========================================================================
  describe('2. DTO & Class-Validator Adversarial Challenges (CreateSwitchDto & UpdateSwitchDto)', () => {
    it('IsEvenNumberConstraint validator directly', () => {
      const constraint = new IsEvenNumberConstraint();
      expect(constraint.validate(undefined)).toBe(true);
      expect(constraint.validate(null)).toBe(true);
      expect(constraint.validate(24)).toBe(true);
      expect(constraint.validate(2)).toBe(true);
      expect(constraint.validate(48)).toBe(true);
      expect(constraint.validate(7)).toBe(false);
      expect(constraint.validate(24.5)).toBe(false);
      expect(constraint.validate('24')).toBe(false);
      expect(constraint.validate({})).toBe(false);
      expect(constraint.validate(NaN)).toBe(false);
    });

    it('rejects odd totalPorts (1, 3, 5, 7, 21, 23, 25, 47, 49, 99) in CreateSwitchDto', async () => {
      const oddList = [1, 3, 5, 7, 21, 23, 25, 47, 49, 99];
      for (const odd of oddList) {
        const dto = plainToInstance(CreateSwitchDto, {
          ...baseValidSwitch,
          totalPorts: odd,
        });
        const errors = await validate(dto);
        const totalPortError = errors.find((e) => e.property === 'totalPorts');
        expect(totalPortError).toBeDefined();
      }
    });

    it('rejects out-of-range totalPorts (0, -2, -4, 50, 52, 100, 128) in CreateSwitchDto', async () => {
      const oobList = [0, -2, -4, 50, 52, 100, 128];
      for (const oob of oobList) {
        const dto = plainToInstance(CreateSwitchDto, {
          ...baseValidSwitch,
          totalPorts: oob,
        });
        const errors = await validate(dto);
        const totalPortError = errors.find((e) => e.property === 'totalPorts');
        expect(totalPortError).toBeDefined();
      }
    });

    it('rejects float totalPorts (2.5, 24.1) in CreateSwitchDto', async () => {
      for (const fl of [2.5, 24.1]) {
        const dto = plainToInstance(CreateSwitchDto, {
          ...baseValidSwitch,
          totalPorts: fl,
        });
        const errors = await validate(dto);
        const totalPortError = errors.find((e) => e.property === 'totalPorts');
        expect(totalPortError).toBeDefined();
      }
    });

    it('rejects out-of-bound uplinkPorts and fiberPorts (-1, 9, 10) in CreateSwitchDto', async () => {
      const dto = plainToInstance(CreateSwitchDto, {
        ...baseValidSwitch,
        uplinkPorts: -1,
        fiberPorts: 9,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'uplinkPorts')).toBe(true);
      expect(errors.some((e) => e.property === 'fiberPorts')).toBe(true);
    });

    it('accepts all valid even totalPorts (2, 8, 16, 24, 32, 48) and valid uplinks (0..8) in CreateSwitchDto', async () => {
      for (const validPorts of [2, 8, 16, 24, 32, 48]) {
        const dto = plainToInstance(CreateSwitchDto, {
          ...baseValidSwitch,
          totalPorts: validPorts,
          uplinkPorts: 4,
          fiberPorts: 4,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('UpdateSwitchDto validates partial updates', async () => {
      const oddUpdate = plainToInstance(UpdateSwitchDto, { totalPorts: 7 });
      const oddErrors = await validate(oddUpdate);
      expect(oddErrors.some((e) => e.property === 'totalPorts')).toBe(true);

      const validUpdate = plainToInstance(UpdateSwitchDto, { totalPorts: 16, uplinkPorts: 0 });
      const validErrors = await validate(validUpdate);
      expect(validErrors).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. DYNAMIC 3-BAY PORT GENERATION (generateDefaultPorts)
  // =========================================================================
  describe('3. Dynamic 3-Bay Port Generation (generateDefaultPorts)', () => {
    it('Valid combination 2 + 0 + 0: exactly 2 access ports, 0 uplinks, 0 fiber', async () => {
      await service.generateDefaultPorts('sw-2p', 2, 0, 0);

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;

      expect(ports).toHaveLength(2);
      expect(ports[0]).toMatchObject({
        switchId: 'sw-2p',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G',
        mode: 'ACCESS',
        speed: '1 Gbps',
        poeEnabled: true,
        adminStatus: 'UP',
        operStatus: 'DOWN',
      });
      expect(ports[1]).toMatchObject({
        switchId: 'sw-2p',
        portNumber: 2,
        name: 'Gi1/0/2',
        formFactor: 'RJ45_1G',
        mode: 'ACCESS',
        speed: '1 Gbps',
        poeEnabled: true,
      });
    });

    it('Valid combination 8 + 2 + 2: exactly 8 access + 2 RJ45 uplink + 2 SFP fiber = 12 total ports', async () => {
      await service.generateDefaultPorts('sw-8p', 8, 2, 2);

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(ports).toHaveLength(12);

      // Bay 1: Access 1..8
      for (let i = 0; i < 8; i++) {
        expect(ports[i]).toMatchObject({
          portNumber: i + 1,
          name: `Gi1/0/${i + 1}`,
          formFactor: 'RJ45_1G',
          mode: 'ACCESS',
          poeEnabled: true,
          speed: '1 Gbps',
        });
      }

      // Bay 2: Uplinks 9..10
      expect(ports[8]).toMatchObject({
        portNumber: 9,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        mode: 'TRUNK',
        poeEnabled: false,
        speed: '1 Gbps',
      });
      expect(ports[9]).toMatchObject({
        portNumber: 10,
        name: 'Uplink 2',
        formFactor: 'RJ45_1G',
        mode: 'TRUNK',
        poeEnabled: false,
        speed: '1 Gbps',
      });

      // Bay 3: SFP Optical 11..12
      expect(ports[10]).toMatchObject({
        portNumber: 11,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        mode: 'TRUNK',
        poeEnabled: false,
        speed: '10 Gbps',
      });
      expect(ports[11]).toMatchObject({
        portNumber: 12,
        name: 'SFP 2',
        formFactor: 'SFP_PLUS_10G',
        mode: 'TRUNK',
        poeEnabled: false,
        speed: '10 Gbps',
      });
    });

    it('Valid combination 16 + 2 + 2: exactly 16 access + 2 RJ45 uplink + 2 SFP fiber = 20 total ports', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-16p', 16, 2, 2);

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(ports).toHaveLength(20);
      expect(ports[0].portNumber).toBe(1);
      expect(ports[15].portNumber).toBe(16);
      expect(ports[16]).toMatchObject({ portNumber: 17, name: 'Uplink 1', mode: 'TRUNK' });
      expect(ports[17]).toMatchObject({ portNumber: 18, name: 'Uplink 2', mode: 'TRUNK' });
      expect(ports[18]).toMatchObject({ portNumber: 19, name: 'SFP 1', mode: 'TRUNK' });
      expect(ports[19]).toMatchObject({ portNumber: 20, name: 'SFP 2', mode: 'TRUNK' });
    });

    it('Valid combination 24 + 4 + 4: exactly 24 access + 4 RJ45 uplink + 4 SFP fiber = 32 total ports', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-24p', 24, 4, 4, '2.5 Gbps', '10 Gbps');

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(ports).toHaveLength(32);

      // Access: 1..24
      expect(ports[23]).toMatchObject({ portNumber: 24, name: 'Gi1/0/24', mode: 'ACCESS' });

      // Uplinks: 25..28 with 2.5 Gbps speed
      for (let u = 1; u <= 4; u++) {
        expect(ports[23 + u]).toMatchObject({
          portNumber: 24 + u,
          name: `Uplink ${u}`,
          mode: 'TRUNK',
          speed: '2.5 Gbps',
          formFactor: 'RJ45_1G',
        });
      }

      // SFP: 29..32 with 10 Gbps speed and SFP_PLUS_10G
      for (let f = 1; f <= 4; f++) {
        expect(ports[27 + f]).toMatchObject({
          portNumber: 28 + f,
          name: `SFP ${f}`,
          mode: 'TRUNK',
          speed: '10 Gbps',
          formFactor: 'SFP_PLUS_10G',
        });
      }
    });

    it('Valid combination 48 + 8 + 8: exactly 48 access + 8 RJ45 uplink + 8 SFP fiber = 64 total ports', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-48p', 48, 8, 8, '10 Gbps', '1 Gbps');

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(ports).toHaveLength(64);

      // Bay 1: 1..48 Access
      expect(ports[0].portNumber).toBe(1);
      expect(ports[47].portNumber).toBe(48);

      // Bay 2: 49..56 Uplinks (8 ports)
      expect(ports[48]).toMatchObject({
        portNumber: 49,
        name: 'Uplink 1',
        mode: 'TRUNK',
        speed: '10 Gbps',
      });
      expect(ports[55]).toMatchObject({
        portNumber: 56,
        name: 'Uplink 8',
        mode: 'TRUNK',
        speed: '10 Gbps',
      });

      // Bay 3: 57..64 Fiber (8 ports) with 1 Gbps resolving to SFP_1G
      expect(ports[56]).toMatchObject({
        portNumber: 57,
        name: 'SFP 1',
        mode: 'TRUNK',
        speed: '1 Gbps',
        formFactor: 'SFP_1G',
      });
      expect(ports[63]).toMatchObject({
        portNumber: 64,
        name: 'SFP 8',
        mode: 'TRUNK',
        speed: '1 Gbps',
        formFactor: 'SFP_1G',
      });
    });

    it('Fiber form factor resolution: 10G -> SFP_PLUS_10G, 1G -> SFP_1G', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-speed-test', 2, 0, 2, null, '1 Gbps');
      const ports1G = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(ports1G[2].formFactor).toBe('SFP_1G');

      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-speed-test', 2, 0, 2, null, '10 Gbps');
      const ports10G = mockPrisma.switchPort.createMany.mock.calls[0][0].data;
      expect(ports10G[2].formFactor).toBe('SFP_PLUS_10G');
    });
  });

  // =========================================================================
  // 4. SERVICE-LEVEL VALIDATION & ERROR HANDLING (createSwitch & updateSwitch)
  // =========================================================================
  describe('4. Service-Level Validation & Error Handling (createSwitch & updateSwitch)', () => {
    it('createSwitch rejects odd totalPorts with BadRequestException("Total ports must be an even number")', async () => {
      for (const odd of [1, 3, 5, 7, 21, 23, 25, 47, 49]) {
        await expect(service.createSwitch({ ...baseValidSwitch, totalPorts: odd })).rejects.toThrow(
          new BadRequestException('Total ports must be an even number'),
        );
      }
    });

    it('createSwitch rejects totalPorts < 2 with BadRequestException("Total ports must be at least 2")', async () => {
      await expect(service.createSwitch({ ...baseValidSwitch, totalPorts: 0 })).rejects.toThrow(
        new BadRequestException('Total ports must be at least 2'),
      );

      await expect(service.createSwitch({ ...baseValidSwitch, totalPorts: -2 })).rejects.toThrow(
        new BadRequestException('Total ports must be at least 2'),
      );
    });

    it('createSwitch rejects totalPorts > 48 with BadRequestException("Total ports cannot exceed 48")', async () => {
      for (const over of [50, 52, 64, 100]) {
        await expect(
          service.createSwitch({ ...baseValidSwitch, totalPorts: over }),
        ).rejects.toThrow(new BadRequestException('Total ports cannot exceed 48'));
      }
    });

    it('createSwitch rejects uplinkPorts < 0 or > 8 with exact BadRequestException', async () => {
      await expect(service.createSwitch({ ...baseValidSwitch, uplinkPorts: -1 })).rejects.toThrow(
        new BadRequestException('Uplink ports cannot be negative'),
      );

      await expect(service.createSwitch({ ...baseValidSwitch, uplinkPorts: 9 })).rejects.toThrow(
        new BadRequestException('Uplink ports cannot exceed 8'),
      );
    });

    it('createSwitch rejects fiberPorts < 0 or > 8 with exact BadRequestException', async () => {
      await expect(service.createSwitch({ ...baseValidSwitch, fiberPorts: -1 })).rejects.toThrow(
        new BadRequestException('Fiber ports cannot be negative'),
      );

      await expect(service.createSwitch({ ...baseValidSwitch, fiberPorts: 9 })).rejects.toThrow(
        new BadRequestException('Fiber ports cannot exceed 8'),
      );
    });

    it('updateSwitch validates totalPorts, uplinkPorts, fiberPorts on update', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue({
        id: 'sw-exist-1',
        name: 'Existing SW',
        totalPorts: 24,
      });

      // Odd totalPorts
      await expect(service.updateSwitch('sw-exist-1', { totalPorts: 7 })).rejects.toThrow(
        new BadRequestException('Total ports must be an even number'),
      );

      // Out of bounds totalPorts
      await expect(service.updateSwitch('sw-exist-1', { totalPorts: 50 })).rejects.toThrow(
        new BadRequestException('Total ports cannot exceed 48'),
      );

      await expect(service.updateSwitch('sw-exist-1', { totalPorts: 0 })).rejects.toThrow(
        new BadRequestException('Total ports must be at least 2'),
      );

      // Invalid uplink
      await expect(service.updateSwitch('sw-exist-1', { uplinkPorts: -1 })).rejects.toThrow(
        new BadRequestException('Uplink ports cannot be negative'),
      );

      await expect(service.updateSwitch('sw-exist-1', { uplinkPorts: 10 })).rejects.toThrow(
        new BadRequestException('Uplink ports cannot exceed 8'),
      );

      // Invalid fiber
      await expect(service.updateSwitch('sw-exist-1', { fiberPorts: -1 })).rejects.toThrow(
        new BadRequestException('Fiber ports cannot be negative'),
      );

      await expect(service.updateSwitch('sw-exist-1', { fiberPorts: 10 })).rejects.toThrow(
        new BadRequestException('Fiber ports cannot exceed 8'),
      );
    });
  });
});

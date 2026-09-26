import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createSwitchSchema, updateSwitchSchema } from '@uims/shared-validators';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import {
  CreateSwitchDto,
  IsEvenNumberConstraint,
} from '../../src/modules/network/dto/create-switch.dto';
import { UpdateSwitchDto } from '../../src/modules/network/dto/update-switch.dto';
import { NetworkService } from '../../src/modules/network/network.service';

interface MockPrismaClient {
  networkSwitch: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
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

describe('Milestone 4 Challenger: Exhaustive Monorepo Stress Test Suite (Backend & API)', () => {
  let service: NetworkService;
  let mockPrisma: MockPrismaClient;

  const ALL_24_EVEN_PORT_CONFIGS = [
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
  ] as const;

  const ALL_ODD_NUMBERS_IN_SCOPE = [
    1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49,
    51, 99,
  ];

  beforeEach(() => {
    mockPrisma = {
      networkSwitch: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
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
    name: 'SW-STRESS-4K',
    model: 'Catalyst-9300-UIMS',
    vendor: 'Cisco Systems',
  };

  // =========================================================================
  // 1. ALL 24 EVEN PORT CONFIGURATIONS STRESS MATRIX
  // =========================================================================
  describe('1. Exhaustive Verification of All 24 Even Configurations [2, 48]', () => {
    it('1.1 verifies exactly 24 even configurations in the defined range [2, 48]', () => {
      expect(ALL_24_EVEN_PORT_CONFIGS.length).toBe(24);
      expect(ALL_24_EVEN_PORT_CONFIGS[0]).toBe(2);
      expect(ALL_24_EVEN_PORT_CONFIGS[23]).toBe(48);
      for (let i = 0; i < 24; i++) {
        expect(ALL_24_EVEN_PORT_CONFIGS[i]).toBe((i + 1) * 2);
      }
    });

    describe('1.2 Zod Schema accepts all 24 even configurations', () => {
      for (const ports of ALL_24_EVEN_PORT_CONFIGS) {
        it(`Zod validator accepts totalPorts = ${ports}`, () => {
          const parsed = createSwitchSchema.safeParse({
            ...baseValidSwitch,
            totalPorts: ports,
          });
          expect(parsed.success, `createSwitchSchema should accept ${ports}`).toBe(true);
          if (parsed.success) {
            expect(parsed.data.totalPorts).toBe(ports);
          }
        });
      }
    });

    describe('1.3 Class-Validator DTO accepts all 24 even configurations', () => {
      for (const ports of ALL_24_EVEN_PORT_CONFIGS) {
        it(`CreateSwitchDto validates totalPorts = ${ports} with 0 errors`, async () => {
          const dto = plainToInstance(CreateSwitchDto, {
            ...baseValidSwitch,
            totalPorts: ports,
            uplinkPorts: 2,
            fiberPorts: 2,
          });
          const errors = await validate(dto);
          const portErrors = errors.filter((e) => e.property === 'totalPorts');
          expect(portErrors.length, `Dto validation should have 0 errors for ${ports}`).toBe(0);
        });
      }
    });

    describe('1.4 Dynamic Port Generator generates exact 3-bay ports for all 24 configurations', () => {
      for (const ports of ALL_24_EVEN_PORT_CONFIGS) {
        it(`generateDefaultPorts creates exact ports for totalPorts = ${ports} (+ 2 uplinks, + 2 fiber)`, async () => {
          mockPrisma.switchPort.createMany.mockClear();
          const expectedTotal = ports + 2 + 2;

          await service.generateDefaultPorts(
            `sw-stress-${ports}`,
            ports,
            2,
            2,
            '1 Gbps',
            '10 Gbps',
          );

          expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
          const generated = mockPrisma.switchPort.createMany.mock.calls[0][0]
            .data as Prisma.SwitchPortCreateManyInput[];

          expect(generated.length).toBe(expectedTotal);

          // Verify consecutive numbering 1 .. expectedTotal without any gap
          const numbers = generated.map((p) => p.portNumber);
          expect(numbers).toEqual(Array.from({ length: expectedTotal }, (_, i) => i + 1));

          // Bay 1: Access 1 .. ports
          for (let a = 0; a < ports; a++) {
            const p = generated[a];
            expect(p.portNumber).toBe(a + 1);
            expect(p.name).toBe(`Gi1/0/${a + 1}`);
            expect(p.formFactor).toBe('RJ45_1G');
            expect(p.mode).toBe('ACCESS');
            expect(p.speed).toBe('1 Gbps');
            expect(p.poeEnabled).toBe(true);
            expect(p.adminStatus).toBe('UP');
            expect(p.operStatus).toBe('DOWN');
          }

          // Bay 2: Uplinks
          expect(generated[ports]).toMatchObject({
            portNumber: ports + 1,
            name: 'Uplink 1',
            formFactor: 'RJ45_1G',
            mode: 'TRUNK',
            speed: '1 Gbps',
            poeEnabled: false,
          });
          expect(generated[ports + 1]).toMatchObject({
            portNumber: ports + 2,
            name: 'Uplink 2',
            formFactor: 'RJ45_1G',
            mode: 'TRUNK',
            speed: '1 Gbps',
            poeEnabled: false,
          });

          // Bay 3: Fiber SFP+
          expect(generated[ports + 2]).toMatchObject({
            portNumber: ports + 3,
            name: 'SFP 1',
            formFactor: 'SFP_PLUS_10G',
            mode: 'TRUNK',
            speed: '10 Gbps',
            poeEnabled: false,
          });
          expect(generated[ports + 3]).toMatchObject({
            portNumber: ports + 4,
            name: 'SFP 2',
            formFactor: 'SFP_PLUS_10G',
            mode: 'TRUNK',
            speed: '10 Gbps',
            poeEnabled: false,
          });
        });
      }
    });
  });

  // =========================================================================
  // 2. REJECTION OF ALL ODD NUMBERS & EXACT ERROR MESSAGE ENFORCEMENT
  // =========================================================================
  describe('2. Strict Rejection of All Odd Numbers with Exact Message', () => {
    const EXPECTED_ODD_ERROR = 'Total ports must be an even number';

    it('2.1 IsEvenNumberConstraint validator directly rejects odd numbers', () => {
      const constraint = new IsEvenNumberConstraint();
      for (const odd of ALL_ODD_NUMBERS_IN_SCOPE) {
        expect(constraint.validate(odd)).toBe(false);
      }
    });

    describe('2.2 Zod Schema rejects all odd numbers with exact message', () => {
      for (const odd of ALL_ODD_NUMBERS_IN_SCOPE) {
        it(`Zod rejects odd totalPorts = ${odd}`, () => {
          const res = createSwitchSchema.safeParse({
            ...baseValidSwitch,
            totalPorts: odd,
          });
          expect(res.success).toBe(false);
          if (!res.success) {
            const messages = res.error.issues.map((i) => i.message);
            if (odd >= 2 && odd <= 48) {
              expect(messages).toContain(EXPECTED_ODD_ERROR);
            } else {
              expect(
                messages.some(
                  (m) =>
                    m.includes('even number') ||
                    m.includes('at least 2') ||
                    m.includes('cannot exceed 48'),
                ),
              ).toBe(true);
            }
          }
        });
      }
    });

    describe('2.3 Class-Validator DTO rejects all odd numbers with exact message', () => {
      for (const odd of ALL_ODD_NUMBERS_IN_SCOPE) {
        it(`CreateSwitchDto rejects odd totalPorts = ${odd}`, async () => {
          const dto = plainToInstance(CreateSwitchDto, {
            ...baseValidSwitch,
            totalPorts: odd,
          });
          const errors = await validate(dto);
          const portError = errors.find((e) => e.property === 'totalPorts');
          expect(portError).toBeDefined();
          if (odd >= 2 && odd <= 48) {
            expect(portError?.constraints?.isEvenNumber).toBe(EXPECTED_ODD_ERROR);
          }
        });
      }
    });

    describe('2.4 Service Layer throws BadRequestException on odd numbers', () => {
      for (const odd of [1, 3, 5, 7, 21, 23, 25, 47, 49]) {
        it(`NetworkService.createSwitch throws on odd totalPorts = ${odd}`, async () => {
          await expect(
            service.createSwitch({
              ...baseValidSwitch,
              totalPorts: odd,
            }),
          ).rejects.toThrow(new BadRequestException(EXPECTED_ODD_ERROR));
        });
      }
    });
  });

  // =========================================================================
  // 3. OUT-OF-BOUNDS & MALFORMED INPUT REJECTION
  // =========================================================================
  describe('3. Out-of-Bounds, Negative, Float, and Malformed Rejection', () => {
    it('3.1 rejects totalPorts < 2 (0, -1, -2, -100)', async () => {
      // Even values < 2 throw "Total ports must be at least 2"
      for (const val of [0, -2, -100]) {
        // Zod
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: val }).success).toBe(
          false,
        );
        // DTO
        const errors = await validate(
          plainToInstance(CreateSwitchDto, { ...baseValidSwitch, totalPorts: val }),
        );
        expect(errors.some((e) => e.property === 'totalPorts')).toBe(true);
        // Service
        await expect(service.createSwitch({ ...baseValidSwitch, totalPorts: val })).rejects.toThrow(
          new BadRequestException('Total ports must be at least 2'),
        );
      }

      // Odd negative value -1 throws "Total ports must be an even number"
      await expect(service.createSwitch({ ...baseValidSwitch, totalPorts: -1 })).rejects.toThrow(
        new BadRequestException('Total ports must be an even number'),
      );
    });

    it('3.2 rejects totalPorts > 48 (50, 52, 64, 100, 1000)', async () => {
      for (const val of [50, 52, 64, 100, 1000]) {
        // Zod
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: val }).success).toBe(
          false,
        );
        // DTO
        const errors = await validate(
          plainToInstance(CreateSwitchDto, { ...baseValidSwitch, totalPorts: val }),
        );
        expect(errors.some((e) => e.property === 'totalPorts')).toBe(true);
        // Service
        await expect(service.createSwitch({ ...baseValidSwitch, totalPorts: val })).rejects.toThrow(
          new BadRequestException('Total ports cannot exceed 48'),
        );
      }
    });

    it('3.3 rejects float totalPorts (2.5, 24.1, 47.9)', async () => {
      for (const fl of [2.5, 24.1, 47.9]) {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: fl }).success).toBe(
          false,
        );
        const errors = await validate(
          plainToInstance(CreateSwitchDto, { ...baseValidSwitch, totalPorts: fl }),
        );
        expect(errors.some((e) => e.property === 'totalPorts')).toBe(true);
      }
    });

    it('3.4 rejects uplinkPorts out of bounds (< 0, > 8, floats)', async () => {
      for (const bad of [-1, -5, 9, 10, 100, 2.5]) {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: bad }).success).toBe(
          false,
        );

        const errors = await validate(
          plainToInstance(CreateSwitchDto, { ...baseValidSwitch, uplinkPorts: bad }),
        );
        expect(errors.some((e) => e.property === 'uplinkPorts')).toBe(true);
      }
    });

    it('3.5 rejects fiberPorts out of bounds (< 0, > 8, floats)', async () => {
      for (const bad of [-1, -5, 9, 10, 100, 2.5]) {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: bad }).success).toBe(
          false,
        );

        const errors = await validate(
          plainToInstance(CreateSwitchDto, { ...baseValidSwitch, fiberPorts: bad }),
        );
        expect(errors.some((e) => e.property === 'fiberPorts')).toBe(true);
      }
    });
  });

  // =========================================================================
  // 4. UPLINK & FIBER COMBINATIONS, SPEED, AND ASYMMETRIC STRESS
  // =========================================================================
  describe('4. Uplink & Fiber Port Combinations and Speed Dynamics', () => {
    it('4.1 Minimal boundary: 2 access + 0 uplink + 0 fiber = exactly 2 ports', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-min', 2, 0, 0);

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(2);
      expect(ports.map((p) => p.portNumber)).toEqual([1, 2]);
      expect(ports[0].mode).toBe('ACCESS');
      expect(ports[1].mode).toBe('ACCESS');
    });

    it('4.2 Maximal boundary: 48 access + 8 uplink + 8 fiber = exactly 64 ports', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-max', 48, 8, 8, '10 Gbps', '10 Gbps');

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(64);
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));

      // Check uplinks (49..56)
      for (let u = 0; u < 8; u++) {
        expect(ports[48 + u]).toMatchObject({
          portNumber: 49 + u,
          name: `Uplink ${u + 1}`,
          mode: 'TRUNK',
          speed: '10 Gbps',
          formFactor: 'RJ45_1G',
        });
      }

      // Check fiber SFP+ (57..64)
      for (let f = 0; f < 8; f++) {
        expect(ports[56 + f]).toMatchObject({
          portNumber: 57 + f,
          name: `SFP ${f + 1}`,
          mode: 'TRUNK',
          speed: '10 Gbps',
          formFactor: 'SFP_PLUS_10G',
        });
      }
    });

    it('4.3 Asymmetric: 8 access + 0 uplink + 4 fiber', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-asym-fib', 8, 0, 4, null, '10 Gbps');

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(12);
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
      expect(ports[7].name).toBe('Gi1/0/8');
      expect(ports[8].name).toBe('SFP 1');
      expect(ports[11].name).toBe('SFP 4');
    });

    it('4.4 Asymmetric: 8 access + 4 uplink + 0 fiber', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-asym-up', 8, 4, 0, '2.5 Gbps');

      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(12);
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
      expect(ports[7].name).toBe('Gi1/0/8');
      expect(ports[8].name).toBe('Uplink 1');
      expect(ports[8].speed).toBe('2.5 Gbps');
      expect(ports[11].name).toBe('Uplink 4');
    });

    it('4.5 Fiber Speed FormFactor resolution: 1 Gbps -> SFP_1G, 10 Gbps -> SFP_PLUS_10G', async () => {
      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-1g', 2, 0, 1, null, '1 Gbps');
      const p1g = (
        mockPrisma.switchPort.createMany.mock.calls[0][0].data as Prisma.SwitchPortCreateManyInput[]
      )[2];
      expect(p1g.formFactor).toBe('SFP_1G');
      expect(p1g.speed).toBe('1 Gbps');

      mockPrisma.switchPort.createMany.mockClear();
      await service.generateDefaultPorts('sw-10g', 2, 0, 1, null, '10 Gbps');
      const p10g = (
        mockPrisma.switchPort.createMany.mock.calls[0][0].data as Prisma.SwitchPortCreateManyInput[]
      )[2];
      expect(p10g.formFactor).toBe('SFP_PLUS_10G');
      expect(p10g.speed).toBe('10 Gbps');
    });
  });

  // =========================================================================
  // 5. UPDATE SWITCH VALIDATION & IMMUTABILITY DEFENSE
  // =========================================================================
  describe('5. UpdateSwitchDto & Service-Level Partial Mutation Defense', () => {
    it('5.1 updateSwitchSchema accepts valid partial even updates and rejects odd updates', () => {
      expect(updateSwitchSchema.safeParse({ totalPorts: 32 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 31 }).success).toBe(false);
      expect(updateSwitchSchema.safeParse({ uplinkPorts: 6 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ uplinkPorts: 9 }).success).toBe(false);
      expect(updateSwitchSchema.safeParse({ fiberPorts: 8 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ fiberPorts: -1 }).success).toBe(false);
    });

    it('5.2 UpdateSwitchDto rejects odd totalPorts on partial updates', async () => {
      const oddUpdate = plainToInstance(UpdateSwitchDto, { totalPorts: 17 });
      const errors = await validate(oddUpdate);
      expect(errors.some((e) => e.property === 'totalPorts')).toBe(true);
      const portErr = errors.find((e) => e.property === 'totalPorts');
      expect(portErr?.constraints?.isEvenNumber).toBe('Total ports must be an even number');
    });

    it('5.3 NetworkService.updateSwitch rejects invalid totalPorts/uplink/fiber values', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue({
        id: 'sw-existing',
        name: 'Existing Switch',
        totalPorts: 24,
      });

      await expect(service.updateSwitch('sw-existing', { totalPorts: 25 })).rejects.toThrow(
        new BadRequestException('Total ports must be an even number'),
      );

      await expect(service.updateSwitch('sw-existing', { totalPorts: 0 })).rejects.toThrow(
        new BadRequestException('Total ports must be at least 2'),
      );

      await expect(service.updateSwitch('sw-existing', { totalPorts: 50 })).rejects.toThrow(
        new BadRequestException('Total ports cannot exceed 48'),
      );

      await expect(service.updateSwitch('sw-existing', { uplinkPorts: 10 })).rejects.toThrow(
        new BadRequestException('Uplink ports cannot exceed 8'),
      );

      await expect(service.updateSwitch('sw-existing', { fiberPorts: -2 })).rejects.toThrow(
        new BadRequestException('Fiber ports cannot be negative'),
      );
    });
  });
});

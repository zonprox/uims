import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/database/prisma.service';
import { CreateSwitchDto } from '../src/modules/network/dto/create-switch.dto';
import { UpdateSwitchDto } from '../src/modules/network/dto/update-switch.dto';
import { NetworkService } from '../src/modules/network/network.service';

interface MockPrismaClient {
  networkSwitch: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  switchPort: {
    createMany: ReturnType<typeof vi.fn>;
  };
}

describe('Empirical Challenger M1: 3-Bay Port Generation & Validation Stress Suite', () => {
  let service: NetworkService;
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = {
      networkSwitch: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      switchPort: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new NetworkService(mockPrisma as unknown as PrismaService);
  });

  describe('1. 3-Bay Port Generation Combinations Stress Matrix', () => {
    it('Combination 1 [2+0+0]: 2 Access, 0 Uplink, 0 Fiber => exactly 2 ports', async () => {
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-2-0-0' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-2-0-0',
        name: 'SW-MIN-2P',
        totalPorts: 2,
        uplinkPorts: 0,
        fiberPorts: 0,
      });

      await service.createSwitch({
        name: 'SW-MIN-2P',
        model: 'Edge-2P',
        vendor: 'Cisco',
        totalPorts: 2,
        uplinkPorts: 0,
        fiberPorts: 0,
        autoGeneratePorts: true,
      });

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(2);

      // Verify strictly consecutive port numbers
      expect(ports.map((p) => p.portNumber)).toEqual([1, 2]);

      // Bay 1: Access
      ports.forEach((p, idx) => {
        expect(p.switchId).toBe('sw-2-0-0');
        expect(p.portNumber).toBe(idx + 1);
        expect(p.name).toBe(`Gi1/0/${idx + 1}`);
        expect(p.formFactor).toBe('RJ45_1G');
        expect(p.mode).toBe('ACCESS');
        expect(p.speed).toBe('1 Gbps');
        expect(p.poeEnabled).toBe(true);
        expect(p.adminStatus).toBe('UP');
        expect(p.operStatus).toBe('DOWN');
      });
    });

    it('Combination 2 [8+2+2]: 8 Access, 2 Uplink, 2 Fiber => exactly 12 ports', async () => {
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-8-2-2' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-8-2-2',
        name: 'SW-8P',
        totalPorts: 8,
        uplinkPorts: 2,
        fiberPorts: 2,
      });

      await service.createSwitch({
        name: 'SW-8P',
        model: 'C1000-8P',
        vendor: 'Cisco',
        totalPorts: 8,
        uplinkPorts: 2,
        fiberPorts: 2,
        uplinkSpeed: '1 Gbps',
        fiberSpeed: '10 Gbps',
        autoGeneratePorts: true,
      });

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(12);

      // Verify port numbers strictly consecutive 1..12
      const portNums = ports.map((p) => p.portNumber);
      expect(portNums).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));

      // Bay 1: Access 1..8
      for (let i = 0; i < 8; i++) {
        expect(ports[i]).toMatchObject({
          portNumber: i + 1,
          name: `Gi1/0/${i + 1}`,
          formFactor: 'RJ45_1G',
          mode: 'ACCESS',
          speed: '1 Gbps',
          poeEnabled: true,
          adminStatus: 'UP',
          operStatus: 'DOWN',
        });
      }

      // Bay 2: Uplink 9..10
      expect(ports[8]).toMatchObject({
        portNumber: 9,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        mode: 'TRUNK',
        speed: '1 Gbps',
        poeEnabled: false,
        adminStatus: 'UP',
        operStatus: 'DOWN',
      });
      expect(ports[9]).toMatchObject({
        portNumber: 10,
        name: 'Uplink 2',
        formFactor: 'RJ45_1G',
        mode: 'TRUNK',
        speed: '1 Gbps',
        poeEnabled: false,
      });

      // Bay 3: Fiber SFP 11..12
      expect(ports[10]).toMatchObject({
        portNumber: 11,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        mode: 'TRUNK',
        speed: '10 Gbps',
        poeEnabled: false,
      });
      expect(ports[11]).toMatchObject({
        portNumber: 12,
        name: 'SFP 2',
        formFactor: 'SFP_PLUS_10G',
        mode: 'TRUNK',
        speed: '10 Gbps',
        poeEnabled: false,
      });
    });

    it('Combination 3 [16+2+2]: 16 Access, 2 Uplink, 2 Fiber => exactly 20 ports', async () => {
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-16-2-2' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-16-2-2',
        name: 'SW-16P',
        totalPorts: 16,
        uplinkPorts: 2,
        fiberPorts: 2,
      });

      await service.createSwitch({
        name: 'SW-16P',
        model: 'C1000-16P',
        vendor: 'Cisco',
        totalPorts: 16,
        uplinkPorts: 2,
        fiberPorts: 2,
        autoGeneratePorts: true,
      });

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(20);

      // Verify port numbers strictly consecutive 1..20
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));

      // Bay 1: Access 1..16
      for (let i = 0; i < 16; i++) {
        expect(ports[i].portNumber).toBe(i + 1);
        expect(ports[i].name).toBe(`Gi1/0/${i + 1}`);
        expect(ports[i].formFactor).toBe('RJ45_1G');
        expect(ports[i].mode).toBe('ACCESS');
      }

      // Bay 2: Uplink 17..18
      expect(ports[16]).toMatchObject({
        portNumber: 17,
        name: 'Uplink 1',
        formFactor: 'RJ45_1G',
        mode: 'TRUNK',
      });
      expect(ports[17]).toMatchObject({
        portNumber: 18,
        name: 'Uplink 2',
        formFactor: 'RJ45_1G',
        mode: 'TRUNK',
      });

      // Bay 3: Fiber SFP 19..20
      expect(ports[18]).toMatchObject({
        portNumber: 19,
        name: 'SFP 1',
        formFactor: 'SFP_PLUS_10G',
        mode: 'TRUNK',
      });
      expect(ports[19]).toMatchObject({
        portNumber: 20,
        name: 'SFP 2',
        formFactor: 'SFP_PLUS_10G',
        mode: 'TRUNK',
      });
    });

    it('Combination 4 [24+4+4]: 24 Access, 4 Uplink, 4 Fiber => exactly 32 ports', async () => {
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-24-4-4' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-24-4-4',
        name: 'SW-24P-4U-4F',
        totalPorts: 24,
        uplinkPorts: 4,
        fiberPorts: 4,
      });

      await service.createSwitch({
        name: 'SW-24P-4U-4F',
        model: 'C9300-24P',
        vendor: 'Cisco',
        totalPorts: 24,
        uplinkPorts: 4,
        fiberPorts: 4,
        uplinkSpeed: '2.5 Gbps',
        fiberSpeed: '10 Gbps',
        autoGeneratePorts: true,
      });

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(32);

      // Verify port numbers strictly consecutive 1..32
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));

      // Bay 1: Access 1..24
      for (let i = 0; i < 24; i++) {
        expect(ports[i].portNumber).toBe(i + 1);
        expect(ports[i].name).toBe(`Gi1/0/${i + 1}`);
        expect(ports[i].mode).toBe('ACCESS');
        expect(ports[i].formFactor).toBe('RJ45_1G');
      }

      // Bay 2: Uplinks 25..28
      for (let u = 0; u < 4; u++) {
        const port = ports[24 + u];
        expect(port.portNumber).toBe(25 + u);
        expect(port.name).toBe(`Uplink ${u + 1}`);
        expect(port.mode).toBe('TRUNK');
        expect(port.formFactor).toBe('RJ45_1G');
        expect(port.speed).toBe('2.5 Gbps');
        expect(port.poeEnabled).toBe(false);
      }

      // Bay 3: Fiber SFPs 29..32
      for (let f = 0; f < 4; f++) {
        const port = ports[28 + f];
        expect(port.portNumber).toBe(29 + f);
        expect(port.name).toBe(`SFP ${f + 1}`);
        expect(port.mode).toBe('TRUNK');
        expect(port.formFactor).toBe('SFP_PLUS_10G');
        expect(port.speed).toBe('10 Gbps');
        expect(port.poeEnabled).toBe(false);
      }
    });

    it('Combination 5 [48+8+8]: 48 Access, 8 Uplink, 8 Fiber (Max boundaries) => exactly 64 ports', async () => {
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-48-8-8' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-48-8-8',
        name: 'SW-MAX-48-8-8',
        totalPorts: 48,
        uplinkPorts: 8,
        fiberPorts: 8,
      });

      await service.createSwitch({
        name: 'SW-MAX-48-8-8',
        model: 'C9300-48UXM',
        vendor: 'Cisco',
        totalPorts: 48,
        uplinkPorts: 8,
        fiberPorts: 8,
        uplinkSpeed: '10 Gbps',
        fiberSpeed: '10 Gbps',
        autoGeneratePorts: true,
      });

      expect(mockPrisma.switchPort.createMany).toHaveBeenCalledTimes(1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(64);

      // Verify port numbers strictly consecutive 1..64
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));

      // Bay 1: Access 1..48
      for (let i = 0; i < 48; i++) {
        expect(ports[i].portNumber).toBe(i + 1);
        expect(ports[i].name).toBe(`Gi1/0/${i + 1}`);
        expect(ports[i].mode).toBe('ACCESS');
        expect(ports[i].formFactor).toBe('RJ45_1G');
      }

      // Bay 2: Uplinks 49..56
      for (let u = 0; u < 8; u++) {
        const port = ports[48 + u];
        expect(port.portNumber).toBe(49 + u);
        expect(port.name).toBe(`Uplink ${u + 1}`);
        expect(port.mode).toBe('TRUNK');
        expect(port.formFactor).toBe('RJ45_1G');
        expect(port.speed).toBe('10 Gbps');
        expect(port.poeEnabled).toBe(false);
      }

      // Bay 3: Fiber SFPs 57..64
      for (let f = 0; f < 8; f++) {
        const port = ports[56 + f];
        expect(port.portNumber).toBe(57 + f);
        expect(port.name).toBe(`SFP ${f + 1}`);
        expect(port.mode).toBe('TRUNK');
        expect(port.formFactor).toBe('SFP_PLUS_10G');
        expect(port.speed).toBe('10 Gbps');
        expect(port.poeEnabled).toBe(false);
      }
    });

    it('Asymmetric Bay 2/3: 2 access + 8 uplinks + 0 fiber => exactly 10 ports without numbering gaps', async () => {
      await service.generateDefaultPorts('sw-asym-up', 2, 8, 0);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(10);
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
      expect(ports[1].name).toBe('Gi1/0/2');
      expect(ports[2].name).toBe('Uplink 1');
      expect(ports[9].name).toBe('Uplink 8');
    });

    it('Asymmetric Bay 2/3: 2 access + 0 uplinks + 8 fiber => exactly 10 ports without numbering gaps', async () => {
      await service.generateDefaultPorts('sw-asym-fiber', 2, 0, 8);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];
      expect(ports).toHaveLength(10);
      expect(ports.map((p) => p.portNumber)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
      expect(ports[1].name).toBe('Gi1/0/2');
      expect(ports[2].name).toBe('SFP 1');
      expect(ports[9].name).toBe('SFP 8');
    });

    it('autoGeneratePorts: false skips port creation completely', async () => {
      mockPrisma.networkSwitch.create.mockResolvedValue({ id: 'sw-no-gen' });
      mockPrisma.networkSwitch.findFirst.mockResolvedValue({
        id: 'sw-no-gen',
        name: 'SW-NO-GEN',
        totalPorts: 24,
      });

      await service.createSwitch({
        name: 'SW-NO-GEN',
        model: 'C9300',
        vendor: 'Cisco',
        totalPorts: 24,
        autoGeneratePorts: false,
      });

      expect(mockPrisma.switchPort.createMany).not.toHaveBeenCalled();
    });
  });

  describe('2. Speed & Form Factor Dynamic Association', () => {
    it('Assigns SFP_1G form factor when fiberSpeed is 1 Gbps or 1G', async () => {
      await service.generateDefaultPorts('sw-speed-1g', 4, 1, 2, '1 Gbps', '1 Gbps');
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];

      expect(ports).toHaveLength(7);
      // Fiber ports are indices 5 and 6
      expect(ports[5].formFactor).toBe('SFP_1G');
      expect(ports[5].speed).toBe('1 Gbps');
      expect(ports[6].formFactor).toBe('SFP_1G');
      expect(ports[6].speed).toBe('1 Gbps');
    });

    it('Assigns SFP_PLUS_10G form factor when fiberSpeed contains 10G or 10 Gbps', async () => {
      await service.generateDefaultPorts('sw-speed-10g', 4, 1, 2, '2.5 Gbps', '10 Gbps');
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];

      expect(ports).toHaveLength(7);
      // Uplink port index 4
      expect(ports[4].formFactor).toBe('RJ45_1G');
      expect(ports[4].speed).toBe('2.5 Gbps');
      // Fiber ports indices 5 and 6
      expect(ports[5].formFactor).toBe('SFP_PLUS_10G');
      expect(ports[5].speed).toBe('10 Gbps');
      expect(ports[6].formFactor).toBe('SFP_PLUS_10G');
      expect(ports[6].speed).toBe('10 Gbps');
    });

    it('Defaults to 1 Gbps RJ45 and 10 Gbps SFP+ when speeds are omitted', async () => {
      await service.generateDefaultPorts('sw-speed-def', 2, 1, 1);
      const ports = mockPrisma.switchPort.createMany.mock.calls[0][0]
        .data as Prisma.SwitchPortCreateManyInput[];

      expect(ports).toHaveLength(4);
      expect(ports[2].name).toBe('Uplink 1');
      expect(ports[2].speed).toBe('1 Gbps');
      expect(ports[3].name).toBe('SFP 1');
      expect(ports[3].formFactor).toBe('SFP_PLUS_10G');
      expect(ports[3].speed).toBe('10 Gbps');
    });
  });

  describe('3. DTO Validation via class-validator & NestJS ValidationPipe Simulation', () => {
    it('Validates all valid even port counts in [2, 48]', async () => {
      const validEvenCounts = [
        2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 48,
      ];
      for (const count of validEvenCounts) {
        const dto = plainToInstance(CreateSwitchDto, {
          name: `SW-${count}`,
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: count,
        });
        const errors = await validate(dto);
        const portErrors = errors.filter((e) => e.property === 'totalPorts');
        expect(portErrors).toHaveLength(0);
      }
    });

    it('Rejects odd port counts with explicit error message', async () => {
      const oddCounts = [1, 3, 5, 7, 9, 15, 23, 25, 33, 47, 49];
      for (const count of oddCounts) {
        const dto = plainToInstance(CreateSwitchDto, {
          name: `SW-ODD-${count}`,
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: count,
        });
        const errors = await validate(dto);
        const portError = errors.find((e) => e.property === 'totalPorts');
        expect(portError).toBeDefined();
        if (count >= 2 && count <= 48) {
          expect(portError?.constraints?.isEvenNumber).toBe('Total ports must be an even number');
        }
      }
    });

    it('Rejects out-of-bounds totalPorts (<2 or >48)', async () => {
      const outOfBounds = [-10, -2, 0, 1, 50, 52, 100];
      for (const count of outOfBounds) {
        const dto = plainToInstance(CreateSwitchDto, {
          name: `SW-BOUND-${count}`,
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: count,
        });
        const errors = await validate(dto);
        const portError = errors.find((e) => e.property === 'totalPorts');
        expect(portError).toBeDefined();
      }
    });

    it('Rejects out-of-bounds uplinkPorts (<0 or >8)', async () => {
      for (const u of [-5, -1, 9, 10, 100]) {
        const dto = plainToInstance(CreateSwitchDto, {
          name: 'SW-UP',
          model: 'C9300',
          vendor: 'Cisco',
          uplinkPorts: u,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'uplinkPorts')).toBe(true);
      }
    });

    it('Rejects out-of-bounds fiberPorts (<0 or >8)', async () => {
      for (const f of [-5, -1, 9, 10, 100]) {
        const dto = plainToInstance(CreateSwitchDto, {
          name: 'SW-FIBER',
          model: 'C9300',
          vendor: 'Cisco',
          fiberPorts: f,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'fiberPorts')).toBe(true);
      }
    });

    it('UpdateSwitchDto supports partial updates with bounds validation', async () => {
      // Valid partial
      const validUpdate = plainToInstance(UpdateSwitchDto, {
        totalPorts: 16,
        uplinkPorts: 4,
      });
      const validErrors = await validate(validUpdate);
      expect(validErrors).toHaveLength(0);

      // Invalid partial: odd totalPorts
      const invalidUpdate = plainToInstance(UpdateSwitchDto, {
        totalPorts: 15,
      });
      const invalidErrors = await validate(invalidUpdate);
      expect(invalidErrors.some((e) => e.property === 'totalPorts')).toBe(true);
    });
  });

  describe('4. Service-Level Defense & Validation in createSwitch and updateSwitch', () => {
    it('createSwitch throws BadRequestException on odd totalPorts', async () => {
      await expect(
        service.createSwitch({
          name: 'SW-ODD',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 23,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createSwitch throws BadRequestException on totalPorts < 2', async () => {
      await expect(
        service.createSwitch({
          name: 'SW-UNDER',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 0,
        }),
      ).rejects.toThrow('Total ports must be at least 2');
    });

    it('createSwitch throws BadRequestException on totalPorts > 48', async () => {
      await expect(
        service.createSwitch({
          name: 'SW-OVER',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 50,
        }),
      ).rejects.toThrow('Total ports cannot exceed 48');
    });

    it('createSwitch throws BadRequestException on uplinkPorts > 8 or < 0', async () => {
      await expect(
        service.createSwitch({
          name: 'SW-BAD-UP',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
          uplinkPorts: 9,
        }),
      ).rejects.toThrow('Uplink ports cannot exceed 8');

      await expect(
        service.createSwitch({
          name: 'SW-BAD-UP-NEG',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
          uplinkPorts: -1,
        }),
      ).rejects.toThrow('Uplink ports cannot be negative');
    });

    it('createSwitch throws BadRequestException on fiberPorts > 8 or < 0', async () => {
      await expect(
        service.createSwitch({
          name: 'SW-BAD-FIBER',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
          fiberPorts: 9,
        }),
      ).rejects.toThrow('Fiber ports cannot exceed 8');

      await expect(
        service.createSwitch({
          name: 'SW-BAD-FIBER-NEG',
          model: 'C9300',
          vendor: 'Cisco',
          totalPorts: 24,
          fiberPorts: -1,
        }),
      ).rejects.toThrow('Fiber ports cannot be negative');
    });

    it('updateSwitch enforces bounds on totalPorts, uplinkPorts, and fiberPorts', async () => {
      mockPrisma.networkSwitch.findUnique.mockResolvedValue({
        id: 'sw-exist',
        name: 'Existing',
        totalPorts: 24,
        uplinkPorts: 2,
        fiberPorts: 2,
      });

      await expect(service.updateSwitch('sw-exist', { totalPorts: 25 })).rejects.toThrow(
        'Total ports must be an even number',
      );

      await expect(service.updateSwitch('sw-exist', { totalPorts: 0 })).rejects.toThrow(
        'Total ports must be at least 2',
      );

      await expect(service.updateSwitch('sw-exist', { totalPorts: 50 })).rejects.toThrow(
        'Total ports cannot exceed 48',
      );

      await expect(service.updateSwitch('sw-exist', { uplinkPorts: 10 })).rejects.toThrow(
        'Uplink ports cannot exceed 8',
      );

      await expect(service.updateSwitch('sw-exist', { fiberPorts: -2 })).rejects.toThrow(
        'Fiber ports cannot be negative',
      );
    });
  });
});

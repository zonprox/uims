import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LicensesService } from './licenses.service';

describe('LicensesService', () => {
  let service: LicensesService;
  let mockPrisma: {
    $transaction: ReturnType<typeof vi.fn>;
    license: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    licenseAssignment: {
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      license: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      licenseAssignment: {
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new LicensesService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create a software license record with correct enum types', async () => {
      mockPrisma.license.create.mockResolvedValue({
        id: 'lic-1',
        name: 'GitHub Enterprise Cloud',
        vendor: 'GitHub / Microsoft',
        type: LicenseType.SUBSCRIPTION,
        totalSeats: 100,
        usedSeats: 0,
        costPerSeat: 21,
        status: LicenseStatus.ACTIVE,
        autoRenew: true,
        licenseKey: 'GH-ENT-2026',
        assignments: [],
      });

      const result = await service.create({
        name: 'GitHub Enterprise Cloud',
        vendor: 'GitHub / Microsoft',
        type: 'Subscription',
        totalSeats: 100,
        costPerSeat: 21,
      });

      expect(result.id).toBe('lic-1');
      expect(result.type).toBe('Subscription');
      expect(result.status).toBe('Active');
    });
  });

  describe('assignUser', () => {
    it('should create assignment and increment usedSeats atomically in a transaction', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        totalSeats: 50,
        usedSeats: 10,
        assignments: [],
      });

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asgn-1',
        licenseId: 'lic-1',
        assignedName: 'Marcus Vance',
        assignedEmail: 'marcus@company.com',
        department: 'DevOps',
      });

      const assignment = await service.assignUser('lic-1', {
        name: 'Marcus Vance',
        email: 'marcus@company.com',
        department: 'DevOps',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(assignment.id).toBe('asgn-1');
      expect(mockPrisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lic-1' },
          data: { usedSeats: { increment: 1 } },
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should compute spend and utilization rates correctly', async () => {
      mockPrisma.license.count
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1); // expiringCount
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 150, usedSeats: 100 },
      });
      mockPrisma.license.findMany.mockResolvedValue([
        { usedSeats: 80, costPerSeat: 20 },
        { usedSeats: 20, costPerSeat: 50 },
      ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(2);
      expect(stats.annualSpend).toBe(80 * 20 + 20 * 50); // 1600 + 1000 = 2600
      expect(stats.utilization).toBe(67); // 100 / 150 = 66.6% -> 67%
      expect(stats.expiringCount).toBe(1);
    });
  });
});

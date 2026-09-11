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
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
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
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
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

      mockPrisma.licenseAssignment.count.mockResolvedValueOnce(10).mockResolvedValueOnce(11);

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
          data: { usedSeats: 11 },
        }),
      );
    });

    it('should reject assignment if license capacity is exceeded', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-maxed',
        name: 'Maxed License',
        totalSeats: 10,
        usedSeats: 10,
        type: LicenseType.SUBSCRIPTION,
      });

      mockPrisma.licenseAssignment.count.mockResolvedValue(10);

      await expect(
        service.assignUser('lic-maxed', {
          name: 'Denied User',
          email: 'denied@company.com',
        }),
      ).rejects.toThrow();
    });

    it('should trigger License Capacity Near Limit warning when seats reach >= 90%', async () => {
      const mockNotificationsService = {
        notifyUser: vi.fn().mockResolvedValue({}),
        notifyAdmins: vi.fn().mockResolvedValue([]),
      };
      const serviceWithNotif = new LicensesService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockNotificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      );

      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        name: 'Figma Organization',
        totalSeats: 10,
        usedSeats: 8,
        assignments: [],
      });

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asgn-9',
        licenseId: 'lic-1',
        assignedName: 'Alice Designer',
        assignedEmail: 'alice@company.com',
      });

      mockPrisma.licenseAssignment.count.mockResolvedValueOnce(8).mockResolvedValueOnce(9);

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-1',
        name: 'Figma Organization',
        totalSeats: 10,
        usedSeats: 9, // 9/10 = 90%
      });

      await serviceWithNotif.assignUser('lic-1', {
        name: 'Alice Designer',
        email: 'alice@company.com',
      });

      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'License Capacity Near Limit',
          type: 'WARNING',
        }),
      );
    });

    it('should trigger License Capacity Reached alert when seats reach 100%', async () => {
      const mockNotificationsService = {
        notifyUser: vi.fn().mockResolvedValue({}),
        notifyAdmins: vi.fn().mockResolvedValue([]),
      };
      const serviceWithNotif = new LicensesService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockNotificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      );

      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        name: 'Figma Organization',
        totalSeats: 10,
        usedSeats: 9,
        assignments: [],
      });

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asgn-10',
        licenseId: 'lic-1',
        assignedName: 'Bob Designer',
        assignedEmail: 'bob@company.com',
      });

      mockPrisma.licenseAssignment.count.mockResolvedValueOnce(9).mockResolvedValueOnce(10);

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-1',
        name: 'Figma Organization',
        totalSeats: 10,
        usedSeats: 10, // 10/10 = 100%
      });

      await serviceWithNotif.assignUser('lic-1', {
        name: 'Bob Designer',
        email: 'bob@company.com',
      });

      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'License Capacity Reached',
          type: 'WARNING',
        }),
      );
    });
  });

  describe('revokeUser', () => {
    it('should soft-revoke assignment and decrement dynamic usedSeats', async () => {
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue({
        id: 'asgn-1',
        licenseId: 'lic-1',
        unassignedAt: null,
      });

      mockPrisma.licenseAssignment.update.mockResolvedValue({
        id: 'asgn-1',
        licenseId: 'lic-1',
        unassignedAt: new Date(),
      });

      mockPrisma.licenseAssignment.count = vi.fn().mockResolvedValue(9);
      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-1',
        usedSeats: 9,
      });

      const result = await service.revokeUser('lic-1', 'asgn-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.licenseAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asgn-1' },
          data: { unassignedAt: expect.any(Date) },
        }),
      );
      expect(mockPrisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lic-1' },
          data: { usedSeats: 9 },
        }),
      );
      expect(result).toEqual({
        success: true,
        licenseId: 'lic-1',
        assignmentId: 'asgn-1',
        usedSeats: 9,
      });
    });

    it('should throw NotFoundException if assignment does not exist for the license', async () => {
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue(null);

      await expect(service.revokeUser('lic-1', 'asgn-unknown')).rejects.toThrow();
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

    it('should compute annualSpend using $queryRaw database aggregation when available', async () => {
      mockPrisma.license.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 200, usedSeats: 150 },
      });
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ totalSpend: 7500 }]);

      const stats = await service.getStats();

      expect(stats.total).toBe(5);
      expect(stats.annualSpend).toBe(7500);
      expect(stats.utilization).toBe(75);
      expect(stats.expiringCount).toBe(2);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });
});

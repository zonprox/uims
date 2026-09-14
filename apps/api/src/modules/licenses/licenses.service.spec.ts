import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptLicenseKey } from '../../common/crypto/license-crypto';
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
    process.env.LICENSE_ENCRYPTION_KEY =
      process.env.LICENSE_ENCRYPTION_KEY || 'test-license-key-32-chars-minimum-secure!';
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

    it('should encrypt licenseKey on create when provided', async () => {
      mockPrisma.license.create.mockImplementation(async ({ data }) => ({
        id: 'lic-enc-1',
        ...data,
        assignments: [],
      }));

      const plaintextKey = 'KEY-TO-ENCRYPT-1234';
      const result = await service.create({
        name: 'Visual Studio Enterprise',
        vendor: 'Microsoft',
        licenseKey: plaintextKey,
      });

      expect(mockPrisma.license.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            licenseKey: expect.stringMatching(/^enc:v1:/),
          }),
        }),
      );
      expect(result.licenseKey).toBe(plaintextKey);
      expect(result.maskedKey).toBe('••••-••••-1234');
    });

    it('should default licenseKey to N/A when omitted on create', async () => {
      mockPrisma.license.create.mockImplementation(async ({ data }) => ({
        id: 'lic-no-key',
        ...data,
        assignments: [],
      }));

      const result = await service.create({
        name: 'Open Source License',
        vendor: 'Apache Foundation',
      });

      expect(mockPrisma.license.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            licenseKey: 'N/A',
          }),
        }),
      );
      expect(result.licenseKey).toBe('N/A');
      expect(result.maskedKey).toBe('N/A');
    });
  });

  describe('findAll', () => {
    it('should query with search terms matching name, vendor, and notes but NOT licenseKey', async () => {
      mockPrisma.license.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'security' });

      expect(mockPrisma.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'security', mode: 'insensitive' } },
              { vendor: { contains: 'security', mode: 'insensitive' } },
              { notes: { contains: 'security', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should filter by vendor, type, and status if provided', async () => {
      mockPrisma.license.findMany.mockResolvedValue([]);

      await service.findAll({
        vendor: 'Microsoft',
        type: 'Subscription',
        status: 'Active',
      });

      expect(mockPrisma.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vendor: { contains: 'Microsoft', mode: 'insensitive' },
            type: LicenseType.SUBSCRIPTION,
            status: LicenseStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should decrypt encrypted license keys and format maskedKey in returned list', async () => {
      const plaintextKey = 'SECRET-PRODUCT-KEY-9988';
      const encryptedKey = encryptLicenseKey(plaintextKey);

      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-1',
          name: 'CAD Tool',
          vendor: 'Lectra',
          type: LicenseType.SUBSCRIPTION,
          totalSeats: 10,
          usedSeats: 2,
          costPerSeat: 100,
          status: LicenseStatus.ACTIVE,
          licenseKey: encryptedKey,
          assignments: [],
        },
        {
          id: 'lic-legacy',
          name: 'Legacy Plaintext License',
          vendor: 'Adobe',
          type: LicenseType.PERPETUAL,
          totalSeats: 5,
          usedSeats: 1,
          costPerSeat: 50,
          status: LicenseStatus.ACTIVE,
          licenseKey: 'LEGACY-PLAIN-KEY-1122',
          assignments: [],
        },
      ]);

      const results = await service.findAll();

      expect(results[0].licenseKey).toBe(plaintextKey);
      expect(results[0].maskedKey).toBe('••••-••••-9988');
      expect(results[1].licenseKey).toBe('LEGACY-PLAIN-KEY-1122');
      expect(results[1].maskedKey).toBe('••••-••••-1122');
    });
  });

  describe('findOne', () => {
    it('should find unique license, decrypt key, and return formatted payload', async () => {
      const plaintext = 'MY-SECRET-KEY-5544';
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-find-1',
        name: 'Database Tool',
        vendor: 'JetBrains',
        type: LicenseType.SUBSCRIPTION,
        totalSeats: 5,
        usedSeats: 1,
        costPerSeat: 200,
        status: LicenseStatus.ACTIVE,
        licenseKey: encryptLicenseKey(plaintext),
        assignments: [],
      });

      const result = await service.findOne('lic-find-1');

      expect(result.id).toBe('lic-find-1');
      expect(result.licenseKey).toBe(plaintext);
      expect(result.maskedKey).toBe('••••-••••-5544');
    });

    it('should throw NotFoundException if license does not exist', async () => {
      mockPrisma.license.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should encrypt licenseKey on update when provided', async () => {
      const newKey = 'UPDATED-KEY-9999';
      mockPrisma.license.update.mockImplementation(async ({ data }) => ({
        id: 'lic-update-1',
        name: 'Updated Name',
        type: LicenseType.SUBSCRIPTION,
        totalSeats: 20,
        usedSeats: 5,
        costPerSeat: 50,
        status: LicenseStatus.ACTIVE,
        ...data,
        assignments: [],
      }));

      const result = await service.update('lic-update-1', {
        licenseKey: newKey,
      });

      expect(mockPrisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lic-update-1' },
          data: expect.objectContaining({
            licenseKey: expect.stringMatching(/^enc:v1:/),
          }),
        }),
      );
      expect(result.licenseKey).toBe(newKey);
      expect(result.maskedKey).toBe('••••-••••-9999');
    });

    it('should notify admins when status changes to EXPIRING_SOON or EXPIRED', async () => {
      const mockNotificationsService = {
        notifyUser: vi.fn(),
        notifyAdmins: vi.fn().mockResolvedValue([]),
      };
      const serviceWithNotif = new LicensesService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockNotificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      );

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-exp',
        name: 'Expiring License',
        type: LicenseType.SUBSCRIPTION,
        totalSeats: 10,
        usedSeats: 5,
        status: LicenseStatus.EXPIRING_SOON,
        licenseKey: 'N/A',
        assignments: [],
      });

      await serviceWithNotif.update('lic-exp', {
        status: 'EXPIRING_SOON',
      });

      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'License Expiry Notice',
          type: 'WARNING',
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete license from database', async () => {
      mockPrisma.license.delete.mockResolvedValue({ id: 'lic-del-1' });

      const result = await service.remove('lic-del-1');

      expect(mockPrisma.license.delete).toHaveBeenCalledWith({
        where: { id: 'lic-del-1' },
      });
      expect(result).toEqual({ id: 'lic-del-1' });
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

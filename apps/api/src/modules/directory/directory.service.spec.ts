import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DirectoryService } from './directory.service';
import { AccountStatus } from '@uims/shared-types';

describe('DirectoryService', () => {
  let service: DirectoryService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      directoryUser: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      directoryGroup: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      asset: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      licenseAssignment: {
        findMany: vi.fn(),
      },
    };

    service = new DirectoryService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('createUser', () => {
    it('should create directory user with active status', async () => {
      mockPrisma.directoryUser.create.mockResolvedValue({
        id: 'dir-1',
        username: 'john.doe',
        email: 'john.doe@company.com',
        displayName: 'John Doe',
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        accountStatus: AccountStatus.ACTIVE,
      });

      const user = await service.createUser({
        name: 'John Doe',
        email: 'john.doe@company.com',
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        status: 'Active',
      });

      expect(user.id).toBe('dir-1');
      expect(user.accountStatus).toBe('ACTIVE');
    });
  });

  describe('findAllUsers', () => {
    it('should map users with assigned assets and licenses count', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        {
          id: 'dir-1',
          username: 'john.doe',
          email: 'john.doe@company.com',
          displayName: 'John Doe',
          accountStatus: 'ACTIVE',
        },
      ]);

      mockPrisma.asset.findMany.mockResolvedValue([
        { assignedTo: { email: 'john.doe@company.com' } },
      ]);

      mockPrisma.licenseAssignment.findMany.mockResolvedValue([
        { assignedEmail: 'john.doe@company.com' },
        { assignedEmail: 'john.doe@company.com' },
      ]);

      const users = await service.findAllUsers();

      expect(users).toHaveLength(1);
      expect(users[0].assignedAssetsCount).toBe(1);
      expect(users[0].assignedLicensesCount).toBe(2);
      expect(users[0].status).toBe('Active');
    });
  });

  describe('getStats', () => {
    it('should calculate directory custodian metrics', async () => {
      mockPrisma.directoryUser.count
        .mockResolvedValueOnce(4) // total
        .mockResolvedValueOnce(3) // active
        .mockResolvedValueOnce(1); // suspended
      (mockPrisma.asset as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(2); // assignedAssetsCount

      const stats = await service.getStats();

      expect(stats.totalUsers).toBe(4);
      expect(stats.activeUsers).toBe(3);
      expect(stats.custodiansCount).toBe(2);
      expect(stats.twoFactorRate).toBe(50); // 2/4 = 50%
      expect(stats.suspendedAccounts).toBe(1);
    });
  });
});

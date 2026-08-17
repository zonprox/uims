import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      asset: {
        count: vi.fn(),
      },
      role: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      directoryGroup: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      directoryMembership: {
        upsert: vi.fn(),
      },
    };

    service = new UsersService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('getStats', () => {
    it('should aggregate system login user metrics', async () => {
      (mockPrisma.user as { count: ReturnType<typeof vi.fn> }).count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // active
        .mockResolvedValueOnce(5) // admin
        .mockResolvedValueOnce(2) // suspended
        .mockResolvedValueOnce(38) // totalWorkstations
        .mockResolvedValueOnce(0); // lockedCount
      (mockPrisma.asset as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(38); // custodians
      (
        mockPrisma.directoryGroup as { count: ReturnType<typeof vi.fn> }
      ).count.mockResolvedValueOnce(12); // totalGroups

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalUsers: 50,
        activeUsers: 45,
        adminUsers: 5,
        custodiansCount: 38,
        suspendedUsers: 2,
        recentActiveCount: 45,
        totalGroups: 12,
        totalWorkstations: 38,
        lockedCount: 0,
        totalOUs: 6,
      });
    });
  });

  describe('toggleStatus', () => {
    it('should update user status', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        firstName: 'John',
        lastName: 'Doe',
      });
      (mockPrisma.user as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        status: 'SUSPENDED',
        isClosed: true,
      });

      const res = await service.toggleStatus(
        'usr-1',
        'SUSPENDED' as import('@prisma/client').UserStatus,
      );

      expect(res.status).toBe('SUSPENDED');
    });
  });

  describe('syncDomain', () => {
    it('should simulate active directory replication telemetry', async () => {
      (mockPrisma.user as { count: ReturnType<typeof vi.fn> }).count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45); // active
      (
        mockPrisma.directoryGroup as { count: ReturnType<typeof vi.fn> }
      ).count.mockResolvedValueOnce(12);

      const res = await service.syncDomain();

      expect(res.domain).toBe('uims.internal');
      expect(res.controller).toBe('DC01-PRIMARY.corp.uims.internal');
      expect(res.status).toBe('SYNCHRONIZED');
      expect(res.replicatedObjects).toBe(62);
    });
  });
});

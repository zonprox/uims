import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  const mockPrisma = {
    role: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    appUser: {
      count: vi.fn(),
    },
    rolePermission: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  beforeEach(() => {
    prisma = mockPrisma as unknown as PrismaService;
    service = new RolesService(prisma);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return mapped roles with system flag', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        {
          id: 'role-1',
          name: 'Super Admin',
          description: 'All permissions',
          permissions: [{ permission: { id: 'p-1', subject: 'Asset', action: 'read' } }],
          _count: { users: 2, permissions: 1 },
        },
        {
          id: 'role-2',
          name: 'Custom Auditor',
          description: 'Audits assets',
          permissions: [],
          _count: { users: 0, permissions: 0 },
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(result[0].isSystem).toBe(true);
      expect(result[1].isSystem).toBe(false);
      expect(result[0].userCount).toBe(2);
    });
  });

  describe('create', () => {
    it('should prevent creating duplicate role name', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'existing', name: 'Technician' });
      await expect(service.create({ name: 'Technician' })).rejects.toThrow(ConflictException);
    });

    it('should create new custom role and assign permissions', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({
        id: 'new-id',
        name: 'Field Tech',
        description: 'desc',
      });
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'new-id',
        name: 'Field Tech',
        description: 'desc',
        permissions: [{ permission: { id: 'p-1', subject: 'Asset', action: 'read' } }],
        users: [],
        _count: { users: 0, permissions: 1 },
      });

      const result = await service.create({
        name: 'Field Tech',
        description: 'desc',
        permissionIds: ['p-1'],
      });

      expect(result.id).toBe('new-id');
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should protect built-in system roles from deletion', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'admin-id',
        name: 'Admin',
        _count: { users: 0 },
      });
      await expect(service.remove('admin-id')).rejects.toThrow(BadRequestException);
    });

    it('should block deletion if role has assigned users', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'custom-id',
        name: 'Custom Manager',
        _count: { users: 3 },
      });
      await expect(service.remove('custom-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cache invalidation', () => {
    let mockRedis: { del: ReturnType<typeof vi.fn> };
    let serviceWithRedis: RolesService;

    beforeEach(() => {
      mockRedis = {
        del: vi.fn().mockResolvedValue(1),
      };
      serviceWithRedis = new RolesService(
        prisma,
        mockRedis as unknown as import('../../common/redis/redis.service').RedisService,
      );
    });

    it('should invalidate both roles and permissions caches on create', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({ id: 'r-1', name: 'New Role' });
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r-1',
        name: 'New Role',
        permissions: [],
        users: [],
        _count: { users: 0, permissions: 0 },
      });

      await serviceWithRedis.create({ name: 'New Role' });

      expect(mockRedis.del).toHaveBeenCalledWith('uims:cache:roles:all');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:roles:permissions');
    });

    it('should safely handle Redis deletion failures without throwing', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({ id: 'r-2', name: 'Role Failure Test' });
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r-2',
        name: 'Role Failure Test',
        permissions: [],
        users: [],
        _count: { users: 0, permissions: 0 },
      });
      mockRedis.del.mockRejectedValue(new Error('Redis connection down'));

      const result = await serviceWithRedis.create({ name: 'Role Failure Test' });

      expect(result.id).toBe('r-2');
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should aggregate role statistics and use appUser count for assigned users', async () => {
      mockPrisma.role.count
        .mockResolvedValueOnce(2) // totalRoles
        .mockResolvedValueOnce(1); // systemRolesCount
      mockPrisma.permission.count.mockResolvedValue(25);
      mockPrisma.appUser.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(1) // superAdminsCount
        .mockResolvedValueOnce(5); // assignedUsers (roleId: not null)

      const stats = await service.getStats();

      expect(mockPrisma.role.count).toHaveBeenCalledTimes(2);
      expect(mockPrisma.role.count).toHaveBeenNthCalledWith(1);
      expect(mockPrisma.role.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object),
          }),
        }),
      );
      expect(mockPrisma.role.findMany).not.toHaveBeenCalled();

      expect(stats.totalRoles).toBe(2);
      expect(stats.systemRolesCount).toBe(1);
      expect(stats.customRolesCount).toBe(1);
      expect(stats.totalPermissionsCount).toBe(25);
      expect(stats.superAdminsCount).toBe(1);
      expect(stats.assignedUsersCoverage).toBe(50); // 5 / 10 = 50%
    });
  });
});

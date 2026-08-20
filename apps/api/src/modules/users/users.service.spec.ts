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
        upsert: vi.fn().mockResolvedValue({}),
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

  describe('create', () => {
    it('should create a domain user with initial password hash and safe returned properties', async () => {
      (mockPrisma.user as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce(
        null,
      );
      (mockPrisma.role as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce({
        id: 'role-emp',
        name: 'Employee',
      });
      (mockPrisma.user as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValueOnce({
        id: 'usr-new',
        email: 'thaotn.st@youngonevn.com',
        username: 'thaotn.st',
        displayName: 'Truong Ngoc Thao',
        adInitialPassword: 'Ad#thaotn.st2026!',
        passwordHash: '$2b$10$hashedstring',
        roleName: 'Employee',
        status: 'ACTIVE',
      });

      const res = await service.create({
        email: 'thaotn.st@youngonevn.com',
        username: 'thaotn.st',
        displayName: 'Truong Ngoc Thao',
        roleName: 'Employee',
        adInitialPassword: 'Ad#thaotn.st2026!',
      });

      expect(res.id).toBe('usr-new');
      expect(res.email).toBe('thaotn.st@youngonevn.com');
      expect(res.adInitialPassword).toBe('Ad#thaotn.st2026!');
      expect((res as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException on duplicate email/username', async () => {
      (mockPrisma.user as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce({
        id: 'existing-id',
        email: 'dup@example.com',
      });

      await expect(
        service.create({
          email: 'dup@example.com',
          username: 'dup',
        }),
      ).rejects.toThrow('A user with this email, username, or employee code already exists.');
    });
  });

  describe('findOne and update', () => {
    it('should retrieve a user with relations', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        assignedAssets: [],
        licenseAssignments: [],
        passwordHash: 'hash',
      });

      const res = await service.findOne('usr-1');
      expect(res.id).toBe('usr-1');
      expect(res.fullName).toBe('John Doe');
      expect((res as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'User with ID invalid-id not found',
      );
    });

    it('should update user profile attributes and retain password hash security', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
      });
      (mockPrisma.user as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        displayName: 'John Updated',
        passwordHash: 'hash',
      });

      const res = await service.update('usr-1', {
        displayName: 'John Updated',
      });

      expect(res.displayName).toBe('John Updated');
      expect((res as Record<string, unknown>).passwordHash).toBeUndefined();
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

  describe('exportMaster', () => {
    it('should export all user attributes including Initial Pass correctly', async () => {
      (mockPrisma.user as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValueOnce([
        {
          id: 'usr-1',
          employeeCode: '63020037',
          displayName: 'Phung Thi Nhu Y',
          email: 'yptn.st@youngonevn.com',
          jobTitle: 'Asst. Officer',
          groupCompany: 'BSL',
          company: 'BSL Others',
          plant: 'BSL Others',
          department: 'Production',
          section: 'Printing',
          subSection: 'Printing',
          telephone: '888152675',
          isClosed: false,
          computerName: 'STOTHPR102',
          computerName2: null,
          adInitialPassword: 'kPm#*Ed8',
          adGroup: 'GR_BSLOTHPrinting',
          ouPath: 'OU=Production,DC=uims,DC=internal',
          status: 'ACTIVE',
        },
      ]);

      const records = await service.exportMaster();
      expect(records).toHaveLength(1);
      expect(records[0]['Employee Code']).toBe('63020037');
      expect(records[0]['Initial Password']).toBe('kPm#*Ed8');
      expect(records[0]['Directory Group']).toBe('GR_BSLOTHPrinting');
    });
  });

  describe('importBatch', () => {
    it('should create new users during batch import with generated or provided initial password', async () => {
      (mockPrisma.role as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce({
        id: 'role-emp',
        name: 'Employee',
      });
      (mockPrisma.user as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce(
        null,
      );
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce(null);
      (mockPrisma.user as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValueOnce({
        id: 'new-u1',
        email: 'imported@youngonevn.com',
      });

      const result = await service.importBatch({
        users: [
          {
            email: 'imported@youngonevn.com',
            name: 'Imported User',
            initialPassword: 'Custom#Pass123',
            employeeCode: '99001122',
          },
        ],
      });

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('absence of resetPassword', () => {
    it('should verify resetPassword method is completely eliminated', () => {
      expect((service as unknown as Record<string, unknown>).resetPassword).toBeUndefined();
    });
  });
});

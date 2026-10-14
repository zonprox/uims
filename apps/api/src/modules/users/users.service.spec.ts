import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService, generateSecureRandomPassword } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    const userMock = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };
    const dirMock = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };
    mockPrisma = {
      appUser: userMock,
      user: userMock,
      directoryUser: dirMock,
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
      (mockPrisma.appUser as { count: ReturnType<typeof vi.fn> }).count
        .mockResolvedValueOnce(50) // totalUsers
        .mockResolvedValueOnce(45) // activeUsers
        .mockResolvedValueOnce(5) // adminUsers
        .mockResolvedValueOnce(2) // suspendedUsers
        .mockResolvedValueOnce(0); // lockedUsers

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalUsers: 50,
        activeUsers: 45,
        adminUsers: 5,
        suspendedUsers: 2,
        recentActiveCount: 45,
        lockedUsers: 0,
      });
    });
  });

  describe('create', () => {
    it('should create a user without explicit password, setting mustChangePassword to true and purging adInitialPassword', async () => {
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
        passwordHash: '$2b$10$hashedstring',
        mustChangePassword: true,
        roleName: 'Employee',
        status: 'ACTIVE',
      });

      const res = await service.create({
        email: 'thaotn.st@youngonevn.com',
        username: 'thaotn.st',
        displayName: 'Truong Ngoc Thao',
        roleName: 'Employee',
      });

      expect(res.id).toBe('usr-new');
      expect(res.email).toBe('thaotn.st@youngonevn.com');
      expect(res.mustChangePassword).toBe(true);
      expect((res as Record<string, unknown>).adInitialPassword).toBeUndefined();
      expect((res as Record<string, unknown>).passwordHash).toBeUndefined();

      const createCall = (mockPrisma.user as { create: ReturnType<typeof vi.fn> }).create.mock
        .calls[0][0];
      expect(createCall.data.mustChangePassword).toBe(true);
      expect(createCall.data.passwordHash).toBeDefined();
    });

    it('should create a user with explicit password and set mustChangePassword to false', async () => {
      (mockPrisma.user as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce(
        null,
      );
      (mockPrisma.role as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce({
        id: 'role-emp',
        name: 'Employee',
      });
      (mockPrisma.user as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValueOnce({
        id: 'usr-explicit',
        email: 'explicit@example.com',
        username: 'explicit',
        displayName: 'Explicit User',
        passwordHash: '$2b$10$hashedexplicit',
        mustChangePassword: false,
        roleName: 'Employee',
        status: 'ACTIVE',
      });

      const res = await service.create({
        email: 'explicit@example.com',
        username: 'explicit',
        password: 'ExplicitSecurePassword123!',
      });

      expect(res.id).toBe('usr-explicit');
      expect(res.mustChangePassword).toBe(false);
      expect((res as Record<string, unknown>).adInitialPassword).toBeUndefined();

      const createCall = (mockPrisma.user as { create: ReturnType<typeof vi.fn> }).create.mock
        .calls[0][0];
      expect(createCall.data.mustChangePassword).toBe(false);
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
      ).rejects.toThrow('A user with this email or username already exists.');
    });

    it('should generate cryptographically secure random passwords with high entropy and character variety', () => {
      const pwd1 = generateSecureRandomPassword(20);
      const pwd2 = generateSecureRandomPassword(20);

      expect(pwd1.length).toBe(20);
      expect(pwd2.length).toBe(20);
      expect(pwd1).not.toBe(pwd2);
      expect(/[A-Z]/.test(pwd1)).toBe(true);
      expect(/[a-z]/.test(pwd1)).toBe(true);
      expect(/[0-9]/.test(pwd1)).toBe(true);
      expect(/[!@#$%^&*()_+\-=]/.test(pwd1)).toBe(true);
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

  describe('absence of deprecated methods', () => {
    it('should verify resetPassword and delegation methods are completely eliminated', () => {
      const s = service as unknown as Record<string, unknown>;
      expect(s.resetPassword).toBeUndefined();
      expect(s.getRoles).toBeUndefined();
      expect(s.getOrganizationalUnits).toBeUndefined();
      expect(s.syncDomain).toBeUndefined();
      expect(s.findAllGroups).toBeUndefined();
      expect(s.createGroup).toBeUndefined();
      expect(s.exportMaster).toBeUndefined();
      expect(s.importBatch).toBeUndefined();
    });
  });

  describe('Audit Logging Integration', () => {
    let mockAuditService: {
      logEvent: ReturnType<typeof vi.fn>;
    };
    let auditedService: UsersService;

    beforeEach(() => {
      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      };
      auditedService = new UsersService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        undefined,
        mockAuditService as unknown as import('../audit/audit.service').AuditService,
      );
    });

    it('should record USER_CREATED on user creation redacting sensitive passwords', async () => {
      (mockPrisma.user as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce(
        null,
      );
      (mockPrisma.role as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValueOnce({
        id: 'role-1',
        name: 'Employee',
      });
      (mockPrisma.user as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValueOnce({
        id: 'user-new',
        email: 'audited@example.com',
        username: 'audited',
        displayName: 'Audited User',
        passwordHash: '$2b$12$hashedstring',
        status: 'ACTIVE',
        isLocked: false,
        mustChangePassword: true,
        roleId: 'role-1',
        role: { id: 'role-1', name: 'Employee' },
      });

      const res = await auditedService.create({
        email: 'audited@example.com',
        username: 'audited',
        password: 'PlainPassword123!',
      });

      expect(res.id).toBe('user-new');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user-new',
          severity: 'Info',
          status: 'Success',
          newValue: expect.objectContaining({
            id: 'user-new',
            email: 'audited@example.com',
          }),
        }),
      );
      const loggedNewValue = mockAuditService.logEvent.mock.calls[0][0].newValue as Record<
        string,
        unknown
      >;
      expect(loggedNewValue.password).toBeUndefined();
      expect(loggedNewValue.passwordHash).toBeUndefined();
    });

    it('should record USER_UPDATED with field-level diff on update', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
        phone: '123456789',
        status: 'ACTIVE',
        isLocked: false,
        passwordHash: 'old-hash',
        role: { id: 'r-1', name: 'Employee' },
      });
      (mockPrisma.user as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Updated',
        phone: '987654321',
        status: 'ACTIVE',
        isLocked: false,
        passwordHash: 'new-hash',
        role: { id: 'r-1', name: 'Employee' },
      });

      const res = await auditedService.update('usr-1', {
        displayName: 'John Updated',
        phone: '987654321',
      });

      expect(res.displayName).toBe('John Updated');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: 'usr-1',
          severity: 'Info',
          status: 'Success',
          oldValue: expect.objectContaining({
            displayName: 'John Doe',
            phone: '123456789',
          }),
          newValue: expect.objectContaining({
            displayName: 'John Updated',
            phone: '987654321',
          }),
        }),
      );
    });

    it('should record USER_STATUS_CHANGED on toggleStatus', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        status: 'ACTIVE',
        isLocked: false,
      });
      (mockPrisma.user as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        status: 'SUSPENDED',
        isLocked: true,
      });

      await auditedService.toggleStatus(
        'usr-1',
        'SUSPENDED' as import('@prisma/client').UserStatus,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_STATUS_CHANGED',
          entityType: 'User',
          entityId: 'usr-1',
          oldValue: { status: 'ACTIVE', isLocked: false },
          newValue: { status: 'SUSPENDED', isLocked: true },
        }),
      );
    });

    it('should record USER_DELETED on remove', async () => {
      (
        mockPrisma.user as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'john@example.com',
        status: 'ACTIVE',
      });
      (mockPrisma.user as { delete: ReturnType<typeof vi.fn> }).delete.mockResolvedValueOnce({
        id: 'usr-1',
      });

      await auditedService.remove('usr-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DELETED',
          entityType: 'User',
          entityId: 'usr-1',
        }),
      );
    });
  });
});

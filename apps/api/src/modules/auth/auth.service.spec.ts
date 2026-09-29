import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: {
    findByIdentifier: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
  };
  let mockJwtService: { sign: ReturnType<typeof vi.fn> };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockPrismaService: {
    directoryUser: { findFirst: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    refreshToken: { create: ReturnType<typeof vi.fn> };
    role: { findFirst: ReturnType<typeof vi.fn> };
    appUser: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockUsersService = {
      findByIdentifier: vi.fn(),
      findByEmail: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn(() => 'mock-jwt-token'),
      verify: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') {
          return 'test-jwt-refresh-secret-min-32-chars-long';
        }
        return undefined;
      }),
    };

    mockPrismaService = {
      directoryUser: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
      refreshToken: {
        create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'rt-1', isRevoked: true }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      role: {
        findFirst: vi.fn().mockResolvedValue({ id: 'role-1', name: 'Staff', permissions: [] }),
      },
      appUser: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-3',
          status: 'ACTIVE',
          role: { name: 'Employee' },
        }),
      },
    };

    const mockRedisService = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      mockUsersService as unknown as import('../users/users.service').UsersService,
      mockJwtService as unknown as import('@nestjs/jwt').JwtService,
      mockPrismaService as unknown as import('../../database/prisma.service').PrismaService,
      mockConfigService as unknown as import('@nestjs/config').ConfigService,
      mockRedisService as unknown as import('../../common/redis/redis.service').RedisService,
    );
  });

  describe('login', () => {
    it('should validate user credentials by email and return access token and user profile', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'user-1',
        username: 'alex.johnson',
        email: 'admin@uims.internal',
        firstName: 'Alex',
        lastName: 'Johnson',
        displayName: 'Alex Johnson',
        passwordHash,
        roleName: 'Super Admin',
      });

      const result = await service.login({
        email: 'admin@uims.internal',
        password: 'secret123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.name).toBe('Alex Johnson');
      expect(result.user.role).toBe('Super Admin');
    });

    it('should validate user credentials by AD username and return token', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'user-1',
        username: 'sarah.chen',
        email: 'sarah.chen@company.com',
        firstName: 'Sarah',
        lastName: 'Chen',
        displayName: 'Sarah Chen',
        passwordHash,
        roleName: 'IT Specialist',
      });

      const result = await service.login({
        email: 'sarah.chen',
        password: 'secret123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.username).toBe('sarah.chen');
      expect(result.user.name).toBe('Sarah Chen');
      expect(result.user.role).toBe('IT Specialist');
    });

    it('should throw UnauthorizedException if user has no assigned role', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'user-2',
        username: 'jane.doe',
        email: 'employee@uims.internal',
        firstName: 'Jane',
        lastName: 'Doe',
        passwordHash,
        roleName: null,
      });

      await expect(
        service.login({
          email: 'employee@uims.internal',
          password: 'secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'user-1',
        username: 'alex.johnson',
        email: 'admin@uims.internal',
        firstName: 'Alex',
        lastName: 'Johnson',
        passwordHash,
        roleName: 'Super Admin',
      });

      await expect(
        service.login({
          email: 'admin@uims.internal',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if user is not found in database', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@uims.internal',
          password: 'secretpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should strictly reject login if identifier belongs to a DirectoryUser and record audit log', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-user-101',
        email: 'employee@uims.internal',
        employeeCode: 'EMP101',
        displayName: 'John Employee',
      });

      await expect(
        service.login({
          email: 'employee@uims.internal',
          password: 'password123',
        }),
      ).rejects.toThrow(
        'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userName: 'employee@uims.internal',
          userEmail: 'employee@uims.internal',
          action: 'LOGIN_REJECTED_DIRECTORY_RECORD',
          severity: 'Warning',
          entity: 'Authentication',
          entityType: 'Security',
          status: 'Failed',
          details: expect.stringContaining(
            'strictly rejected: identity employee@uims.internal is a corporate directory record',
          ),
        }),
      });
    });

    it('should strictly reject login if identifier is an employee code belonging to a DirectoryUser', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-user-102',
        email: 'jane.smith@uims.internal',
        employeeCode: 'EMP102',
        displayName: 'Jane Smith',
      });

      await expect(
        service.login({
          email: 'EMP102',
          password: 'password123',
        }),
      ).rejects.toThrow(
        'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userName: 'emp102',
          userEmail: 'jane.smith@uims.internal',
          action: 'LOGIN_REJECTED_DIRECTORY_RECORD',
          severity: 'Warning',
          entity: 'Authentication',
          entityType: 'Security',
          status: 'Failed',
        }),
      });
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if user has no assigned role on refresh', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        status: 'ACTIVE',
        role: null,
        roleName: null,
      });

      await expect(
        service.refresh({
          id: 'user-3',
          username: 'user3',
          email: 'user3@uims.internal',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh token and preserve user info when role is assigned', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        firstName: 'User',
        lastName: 'Three',
        displayName: 'User Three',
        status: 'ACTIVE',
        role: { id: 'role-emp', name: 'Employee' },
        roleName: 'Employee',
        roleId: 'role-emp',
      });

      const result = await service.refresh({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        role: 'Employee',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('Employee');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'user3@uims.internal',
        sub: 'user-3',
        role: 'Employee',
        permissions: [],
        username: 'user3',
        type: 'access',
      });
    });

    it('should successfully rotate tokens and update Redis session when valid refresh token is provided', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        displayName: 'User Three',
        status: 'ACTIVE',
        role: { id: 'role-emp', name: 'Employee' },
        roleName: 'Employee',
        roleId: 'role-emp',
      });

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-db-1',
        userId: 'user-3',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await service.refresh(
        { id: 'user-3', email: 'user3@uims.internal' },
        'valid-refresh-token-xyz',
      );

      expect(result.token).toBe('mock-jwt-token');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();

      // Verify old token was atomically revoked
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-db-1', isRevoked: false },
        data: { isRevoked: true },
      });

      // Verify new token was created
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });

    it('should preserve resolved permissions on refresh for authorized roles', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-it-1',
        username: 'sarah.it',
        email: 'sarah@uims.internal',
        displayName: 'Sarah Chen',
        status: 'ACTIVE',
        role: { id: 'role-it', name: 'IT Specialist' },
        roleName: 'IT Specialist',
        roleId: 'role-it',
      });

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: 'role-it',
        name: 'IT Specialist',
        permissions: [
          { permission: { subject: 'Asset', action: 'read' } },
          { permission: { subject: 'Asset', action: 'write' } },
        ],
      });

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-db-it',
        userId: 'user-it-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await service.refresh(
        { id: 'user-it-1', email: 'sarah@uims.internal' },
        'it-refresh-token',
      );

      expect(result.permissions).toEqual(['Asset:read', 'Asset:write']);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'IT Specialist',
          permissions: ['Asset:read', 'Asset:write'],
        }),
      );
    });

    it('should strictly throw UnauthorizedException when refresh token is not found in database (fail-closed)', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        status: 'ACTIVE',
        role: { id: 'role-emp', name: 'Employee' },
        roleName: 'Employee',
      });

      // Token not found in database
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh({ id: 'user-3', email: 'user3@uims.internal' }, 'unrecorded-token'),
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should detect concurrent race condition on token rotation, revoke all user sessions, and throw UnauthorizedException', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        status: 'ACTIVE',
        role: { id: 'role-emp', name: 'Employee' },
        roleName: 'Employee',
      });

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'race-token-id',
        userId: 'user-3',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Atomic update returns count: 0 because another concurrent request revoked it first
      mockPrismaService.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 }) // First updateMany (atomic check)
        .mockResolvedValueOnce({ count: 3 }); // Second updateMany (revoke all sessions)

      await expect(
        service.refresh({ id: 'user-3', email: 'user3@uims.internal' }, 'concurrent-race-token'),
      ).rejects.toThrow('Session has been revoked due to security violation');

      // Verify all sessions were revoked due to concurrent reuse violation
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-3', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should detect refresh token reuse, revoke all user sessions in DB, and throw UnauthorizedException', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        status: 'ACTIVE',
        role: { id: 'role-emp', name: 'Employee' },
        roleName: 'Employee',
      });

      // Simulated stolen/reused token that is already marked revoked
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'compromised-token-id',
        userId: 'user-3',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await expect(
        service.refresh({ id: 'user-3', email: 'user3@uims.internal' }, 'compromised-reused-token'),
      ).rejects.toThrow('Session has been revoked due to security violation');

      // Verify fail-closed security: all active sessions for this user were revoked
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-3', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException when refresh token in DB is expired', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
        status: 'ACTIVE',
        role: { id: 'role-emp', name: 'Employee' },
        roleName: 'Employee',
      });

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'expired-token-id',
        userId: 'user-3',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 10000), // Expired
      });

      await expect(
        service.refresh({ id: 'user-3', email: 'user3@uims.internal' }, 'expired-db-token'),
      ).rejects.toThrow('Refresh token has expired');
    });

    it('should strictly reject direct refresh invocation when token is of access type instead of refresh', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-3',
        type: 'access', // Maliciously sending access token
      });

      await expect(service.refresh('access-token-as-refresh')).rejects.toThrow(
        'Invalid token type for refresh',
      );
    });
  });

  describe('logout', () => {
    it('should revoke all active refresh tokens in DB and clear session', async () => {
      const result = await service.logout('user-3');

      expect(result.success).toBe(true);
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-3', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});

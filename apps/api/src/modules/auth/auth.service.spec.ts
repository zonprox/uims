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

    service = new AuthService(
      mockUsersService as unknown as import('../users/users.service').UsersService,
      mockJwtService as unknown as import('@nestjs/jwt').JwtService,
      mockPrismaService as unknown as import('../../database/prisma.service').PrismaService,
      mockConfigService as unknown as import('@nestjs/config').ConfigService,
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
  });
});

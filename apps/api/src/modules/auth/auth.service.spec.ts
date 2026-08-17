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

  beforeEach(() => {
    mockUsersService = {
      findByIdentifier: vi.fn(),
      findByEmail: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn(() => 'mock-jwt-token'),
    };

    service = new AuthService(
      mockUsersService as unknown as import('../users/users.service').UsersService,
      mockJwtService as unknown as import('@nestjs/jwt').JwtService,
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

    it('should default to least privileged Employee role if roleName is not set', async () => {
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

      const result = await service.login({
        email: 'employee@uims.internal',
        password: 'secret123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('Employee');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'employee@uims.internal',
        sub: 'user-2',
        role: 'Employee',
        permissions: [],
        username: 'jane.doe',
        type: 'access',
      });
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
  });

  describe('refresh', () => {
    it('should refresh token and preserve user info with least privileged default role', async () => {
      const result = await service.refresh({
        id: 'user-3',
        username: 'user3',
        email: 'user3@uims.internal',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('Employee');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'user3@uims.internal',
        sub: 'user-3',
        role: 'Employee',
        permissions: [],
        username: 'user3',
      });
    });
  });
});

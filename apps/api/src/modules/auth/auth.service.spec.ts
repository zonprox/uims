import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: { findByEmail: ReturnType<typeof vi.fn> };
  let mockJwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockUsersService = {
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
    it('should validate user credentials and return access token and user profile', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'admin@uims.internal',
        firstName: 'Alex',
        lastName: 'Johnson',
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

    it('should default to least privileged Employee role if roleName is not set', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-2',
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
      });
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
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
  });

  describe('refresh', () => {
    it('should refresh token and preserve user info with least privileged default role', async () => {
      const result = await service.refresh({
        id: 'user-3',
        email: 'user3@uims.internal',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('Employee');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'user3@uims.internal',
        sub: 'user-3',
        role: 'Employee',
      });
    });
  });
});

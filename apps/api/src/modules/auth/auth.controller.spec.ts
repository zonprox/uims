import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };

    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  describe('refresh', () => {
    it('should delegate refresh token and user info to authService', async () => {
      mockAuthService.refresh.mockResolvedValue({
        token: 'new-access-token-123',
        accessToken: 'new-access-token-123',
        refreshToken: 'new-rotated-refresh-token-456',
        permissions: ['*:*'],
        user: { id: 'u-1', email: 'admin@uims.internal', role: 'Super Admin' },
      });

      const result = await controller.refresh(
        { refreshToken: 'valid-refresh-token-xyz' },
        {
          user: { id: 'u-1', email: 'admin@uims.internal' },
          refreshToken: 'valid-refresh-token-xyz',
        },
        '192.168.1.100',
        'Mozilla/5.0 UIMS Client',
      );

      expect(result.token).toBe('new-access-token-123');
      expect(result.refreshToken).toBe('new-rotated-refresh-token-456');
      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        { id: 'u-1', email: 'admin@uims.internal' },
        'valid-refresh-token-xyz',
        '192.168.1.100',
        'Mozilla/5.0 UIMS Client',
      );
    });
  });

  describe('logout', () => {
    it('should delegate logout with userId to authService', async () => {
      mockAuthService.logout.mockResolvedValue({
        success: true,
        message: 'Successfully logged out',
      });

      const result = await controller.logout({
        user: { id: 'user-to-logout', email: 'user@uims.internal' },
      });

      expect(result.success).toBe(true);
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-to-logout');
    });
  });
});

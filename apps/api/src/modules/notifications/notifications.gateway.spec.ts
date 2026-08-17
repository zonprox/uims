import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsGateway } from './notifications.gateway';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let mockJwtService: Record<string, ReturnType<typeof vi.fn>>;
  let mockConfigService: Record<string, ReturnType<typeof vi.fn>>;
  let mockServer: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockJwtService = {
      verify: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('test-secret'),
    };
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    gateway = new NotificationsGateway(
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
    );
    gateway.server = mockServer as unknown as NotificationsGateway['server'];
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate client and join rooms when valid token is provided', async () => {
      const mockClient = {
        id: 'client-1',
        data: {},
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {},
        },
        join: vi.fn().mockResolvedValue(undefined),
        emit: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        role: 'Admin',
        email: 'admin@company.com',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:user-123');
      expect(mockClient.join).toHaveBeenCalledWith('role:Admin');
      expect(mockClient.join).toHaveBeenCalledWith('broadcast');
      expect(mockClient.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({ userId: 'user-123', role: 'Admin' }),
      );
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client when no token is present', async () => {
      const mockClient = {
        id: 'client-2',
        data: {},
        handshake: {
          auth: {},
          headers: {},
        },
        join: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', async () => {
      const mockClient = {
        id: 'client-3',
        data: {},
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
        },
        join: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('emission methods', () => {
    it('should send notification to user room', () => {
      gateway.sendToUser('user-1', { id: 'n1', title: 'Hello' });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', {
        id: 'n1',
        title: 'Hello',
      });
    });

    it('should send count to user room', () => {
      gateway.sendCountToUser('user-1', 5);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 5 });
    });

    it('should broadcast to all clients', () => {
      gateway.broadcast({ id: 'n2', title: 'Broadcast' });
      expect(mockServer.to).toHaveBeenCalledWith('broadcast');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', {
        id: 'n2',
        title: 'Broadcast',
      });
    });

    it('should emit notification read to user room', () => {
      gateway.emitNotificationRead('user-1', 'n1');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:read', { id: 'n1' });
    });

    it('should emit notifications cleared', () => {
      gateway.emitNotificationsCleared('user-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:cleared', { success: true });
    });
  });

  describe('handlePing', () => {
    it('should respond with pong and timestamp', () => {
      const res = gateway.handlePing();
      expect(res.pong).toBe('pong');
      expect(res.time).toBeDefined();
    });
  });
});

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

    it('should reject and disconnect client when token is passed via query string (query.token)', async () => {
      const mockClient = {
        id: 'client-query-token',
        data: {},
        handshake: {
          auth: {},
          headers: {},
          query: { token: 'query-token-value' },
        },
        join: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).not.toHaveBeenCalled();
    });

    it('should reject and disconnect client when query.token is present even if valid auth.token is also provided', async () => {
      const mockClient = {
        id: 'client-query-and-auth',
        data: {},
        handshake: {
          auth: { token: 'valid-auth-token' },
          headers: {},
          query: { token: 'sneaky-query-token' },
        },
        join: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should disconnect client when role is missing in token payload', async () => {
      const mockClient = {
        id: 'client-no-role',
        data: {},
        handshake: {
          auth: { token: 'token-without-role' },
          headers: {},
        },
        join: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      mockJwtService.verify.mockReturnValue({
        sub: 'user-no-role',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should disconnect client when role is empty string or whitespace', async () => {
      const mockClient = {
        id: 'client-whitespace-role',
        data: {},
        handshake: {
          auth: { token: 'token-whitespace-role' },
          headers: {},
        },
        join: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      mockJwtService.verify.mockReturnValue({
        sub: 'user-ws',
        role: '   ',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should disconnect client when userId (sub and id) is missing', async () => {
      const mockClient = {
        id: 'client-no-sub',
        data: {},
        handshake: {
          auth: { token: 'token-no-sub' },
          headers: {},
        },
        join: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as import('socket.io').Socket;

      mockJwtService.verify.mockReturnValue({
        role: 'Admin',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should disconnect client when JWT_SECRET is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        const mockClient = {
          id: 'client-no-secret',
          data: {},
          handshake: {
            auth: { token: 'some-token' },
            headers: {},
          },
          join: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as import('socket.io').Socket;

        await gateway.handleConnection(mockClient);

        expect(mockClient.disconnect).toHaveBeenCalledWith(true);
        expect(mockClient.join).not.toHaveBeenCalled();
      } finally {
        if (originalSecret) {
          process.env.JWT_SECRET = originalSecret;
        }
      }
    });
  });

  describe('afterInit', () => {
    it('should register middleware and authenticate valid socket', () => {
      let middlewareFn: (socket: unknown, next: (err?: Error) => void) => void = () => {};
      const fakeServer = {
        use: vi.fn().mockImplementation((fn) => {
          middlewareFn = fn;
        }),
      } as unknown as import('socket.io').Server;

      gateway.afterInit(fakeServer);
      expect(fakeServer.use).toHaveBeenCalled();

      const socket = {
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
        data: {},
      };
      mockJwtService.verify.mockReturnValue({
        sub: 'user-789',
        role: 'Technician',
      });

      const next = vi.fn();
      middlewareFn(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.data).toEqual({
        userId: 'user-789',
        role: 'Technician',
        email: undefined,
      });
    });

    it('should reject socket with Error in middleware if no token', () => {
      let middlewareFn: (socket: unknown, next: (err?: Error) => void) => void = () => {};
      const fakeServer = {
        use: vi.fn().mockImplementation((fn) => {
          middlewareFn = fn;
        }),
      } as unknown as import('socket.io').Server;

      gateway.afterInit(fakeServer);

      const socket = {
        handshake: {
          auth: {},
          headers: {},
        },
        data: {},
      };

      const next = vi.fn();
      middlewareFn(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject socket with Error in middleware if query.token is present', () => {
      let middlewareFn: (socket: unknown, next: (err?: Error) => void) => void = () => {};
      const fakeServer = {
        use: vi.fn().mockImplementation((fn) => {
          middlewareFn = fn;
        }),
      } as unknown as import('socket.io').Server;

      gateway.afterInit(fakeServer);

      const socket = {
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
          query: { token: 'forbidden-query-token' },
        },
        data: {},
      };

      const next = vi.fn();
      middlewareFn(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Token transport via URL query parameters is forbidden'),
        }),
      );
    });

    it('should reject socket in middleware when role is missing from token payload', () => {
      let middlewareFn: (socket: unknown, next: (err?: Error) => void) => void = () => {};
      const fakeServer = {
        use: vi.fn().mockImplementation((fn) => {
          middlewareFn = fn;
        }),
      } as unknown as import('socket.io').Server;

      gateway.afterInit(fakeServer);

      const socket = {
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
        data: {},
      };
      mockJwtService.verify.mockReturnValue({
        sub: 'user-no-role',
      });

      const next = vi.fn();
      middlewareFn(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Missing role in token payload'),
        }),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should broadcast server_shutdown, disconnect all sockets, and close server', async () => {
      const mockSocket1 = { disconnect: vi.fn() };
      const mockSocket2 = { disconnect: vi.fn() };
      const mockSockets = [mockSocket1, mockSocket2];

      const closeFn = vi.fn((cb?: () => void) => {
        cb?.();
      });

      const shutdownServer = {
        emit: vi.fn(),
        fetchSockets: vi.fn().mockResolvedValue(mockSockets),
        close: closeFn,
      };

      gateway.server = shutdownServer as unknown as import('socket.io').Server;

      await gateway.onModuleDestroy();

      expect(shutdownServer.emit).toHaveBeenCalledWith(
        'server_shutdown',
        expect.objectContaining({
          message: expect.stringContaining('shutting down'),
          timestamp: expect.any(String),
        }),
      );
      expect(shutdownServer.fetchSockets).toHaveBeenCalledTimes(1);
      expect(mockSocket1.disconnect).toHaveBeenCalledWith(true);
      expect(mockSocket2.disconnect).toHaveBeenCalledWith(true);
      expect(closeFn).toHaveBeenCalledTimes(1);
    });

    it('should complete gracefully when server is undefined', async () => {
      gateway.server = undefined as unknown as import('socket.io').Server;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('should complete gracefully when fetchSockets throws an error', async () => {
      const closeFn = vi.fn((cb?: () => void) => {
        cb?.();
      });

      const shutdownServer = {
        emit: vi.fn(),
        fetchSockets: vi.fn().mockRejectedValue(new Error('Network error during fetchSockets')),
        close: closeFn,
      };

      gateway.server = shutdownServer as unknown as import('socket.io').Server;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
      expect(shutdownServer.emit).toHaveBeenCalledWith('server_shutdown', expect.any(Object));
      expect(closeFn).toHaveBeenCalledTimes(1);
    });

    it('should complete gracefully when server.close throws an error', async () => {
      const shutdownServer = {
        emit: vi.fn(),
        fetchSockets: vi.fn().mockResolvedValue([]),
        close: vi.fn(() => {
          throw new Error('Close failed');
        }),
      };

      gateway.server = shutdownServer as unknown as import('socket.io').Server;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
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

    it('should send notification to role room', () => {
      gateway.sendToRole('Admin', { id: 'n2', title: 'Role Notice' });
      expect(mockServer.to).toHaveBeenCalledWith('role:Admin');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', {
        id: 'n2',
        title: 'Role Notice',
      });
    });

    it('should send count to role room', () => {
      gateway.sendCountToRole('Admin', 3);
      expect(mockServer.to).toHaveBeenCalledWith('role:Admin');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 3 });
    });

    it('should emit notification read to user room', () => {
      gateway.emitNotificationRead('user-1', 'n1');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:read', { id: 'n1' });
    });

    it('should emit notifications cleared to user room when userId provided', () => {
      gateway.emitNotificationsCleared('user-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:cleared', { success: true });
    });

    it('should emit notifications cleared to all clients when no userId provided', () => {
      gateway.emitNotificationsCleared();
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

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsGateway } from '../../src/modules/notifications/notifications.gateway';

/**
 * Milestone 1 Challenger 2 — Empirical Adversarial Challenge Suite
 * Focus: NotificationsGateway WebSocket Authentication Hardening, Query Token Rejection,
 * Strict Non-Empty Role Claim Verification (Zero Fallback), Token Tampering,
 * and OnModuleDestroy Connection Draining Resilience.
 */
describe('M1 Challenger 2 — WebSocket Gateway Adversarial Challenge', () => {
  const TEST_JWT_SECRET = 'uims-test-adversarial-secret-key-2026-very-secure';
  let jwtService: JwtService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let gateway: NotificationsGateway;
  let mockServer: {
    to: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    fetchSockets: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    use: ReturnType<typeof vi.fn>;
  };

  interface MockSocketOptions {
    id?: string;
    auth?: Record<string, unknown>;
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }

  interface MockSocketInstance {
    id: string;
    data: Record<string, unknown>;
    handshake: {
      auth: Record<string, unknown>;
      headers: Record<string, string>;
      query: Record<string, unknown>;
    };
    join: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }

  function createMockSocket(options: MockSocketOptions = {}): MockSocketInstance {
    return {
      id: options.id || `socket-${Math.random().toString(36).substring(2, 9)}`,
      data: options.data || {},
      handshake: {
        auth: options.auth || {},
        headers: options.headers || {},
        query: options.query || {},
      },
      join: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  function buildStormSocket(index: number): MockSocketInstance {
    const scenario = index % 4;
    switch (scenario) {
      case 0: {
        // Valid connection
        const token = jwtService.sign(
          { sub: `user-storm-${index}`, role: 'Technician' },
          { secret: TEST_JWT_SECRET },
        );
        return createMockSocket({ id: `sock-valid-${index}`, auth: { token } });
      }
      case 1: {
        // Query injection attack
        const token = jwtService.sign(
          { sub: `user-storm-${index}`, role: 'Admin' },
          { secret: TEST_JWT_SECRET },
        );
        return createMockSocket({
          id: `sock-query-${index}`,
          auth: { token },
          query: { token: 'injected' },
        });
      }
      case 2: {
        // Missing role claim
        const token = jwtService.sign({ sub: `user-storm-${index}` }, { secret: TEST_JWT_SECRET });
        return createMockSocket({ id: `sock-norole-${index}`, auth: { token } });
      }
      default: {
        // Tampered signature / wrong secret
        const token = jwtService.sign(
          { sub: `user-storm-${index}`, role: 'Employee' },
          { secret: 'wrong-rogue-secret' },
        );
        return createMockSocket({ id: `sock-tampered-${index}`, auth: { token } });
      }
    }
  }

  beforeEach(() => {
    jwtService = new JwtService({ secret: TEST_JWT_SECRET });
    mockConfigService = {
      get: vi.fn((key: string): string | undefined => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        return undefined;
      }),
    };

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      fetchSockets: vi.fn().mockResolvedValue([]),
      close: vi.fn((cb?: () => void) => {
        cb?.();
      }),
      use: vi.fn(),
    };

    gateway = new NotificationsGateway(jwtService, mockConfigService as unknown as ConfigService);
    gateway.server = mockServer as unknown as Server;
  });

  // =========================================================================
  // CHALLENGE DIMENSION 1: QUERY-STRING TOKEN INJECTION ATTACK VECTORS
  // =========================================================================
  describe('Dimension 1: Query-String Token Injection Defense', () => {
    it('1.1 MUST reject and disconnect when token is passed exclusively in handshake.query.token', async () => {
      const token = jwtService.sign(
        { sub: 'user-query-1', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        query: { token },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('1.2 MUST reject and disconnect when token is passed in query.token even if valid token is in auth.token', async () => {
      const validAuthToken = jwtService.sign(
        { sub: 'user-auth-legit', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const queryToken = 'sneaky-query-injection-token';
      const socket = createMockSocket({
        auth: { token: validAuthToken },
        query: { token: queryToken },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      // Must fail closed immediately on query check before using auth.token
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('1.3 MUST reject and disconnect when query.token is present alongside valid Authorization header Bearer token', async () => {
      const validHeaderToken = jwtService.sign(
        { sub: 'user-header-legit', role: 'Manager' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Bearer ${validHeaderToken}` },
        query: { token: 'injected-url-token' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.4 MUST reject non-string query token injections (arrays, objects, numbers, booleans)', async () => {
      const nonStringTokens = [
        ['evil-token-1', 'evil-token-2'],
        { nested: 'attack-token' },
        123456,
        true,
      ];

      for (const badToken of nonStringTokens) {
        const socket = createMockSocket({
          query: { token: badToken },
        });

        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('1.5 MUST reject whitespace query tokens without evaluating auth', async () => {
      const socket = createMockSocket({
        query: { token: '    ' },
        auth: {
          token: jwtService.sign({ sub: 'user-ws', role: 'Admin' }, { secret: TEST_JWT_SECRET }),
        },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.6 Middleware (afterInit) MUST intercept query token injection with an Error passed to next()', () => {
      let middlewareHandler: (socket: Socket, next: (err?: Error) => void) => void = () => {};
      const fakeServer = {
        use: vi.fn().mockImplementation((fn) => {
          middlewareHandler = fn;
        }),
      } as unknown as Server;

      gateway.afterInit(fakeServer);
      expect(fakeServer.use).toHaveBeenCalled();

      const injectedSocket = createMockSocket({
        auth: {
          token: jwtService.sign({ sub: 'user-mid', role: 'Admin' }, { secret: TEST_JWT_SECRET }),
        },
        query: { token: 'injected-query-token' },
      });

      const nextFn = vi.fn();
      middlewareHandler(injectedSocket as unknown as Socket, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
      const calledError = nextFn.mock.calls[0][0] as Error;
      expect(calledError.message).toContain(
        'Token transport via URL query parameters is forbidden',
      );
    });

    it('1.7 Legitimate non-token query parameters MUST NOT cause false rejections', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-legit-query', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        auth: { token: validToken },
        query: { EIO: '4', transport: 'websocket', customTraceId: 'trace-xyz-123' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-legit-query');
      expect(socket.join).toHaveBeenCalledWith('role:Admin');
    });
  });

  // =========================================================================
  // CHALLENGE DIMENSION 2: ROLE CLAIM TAMPERING & STRICT NON-EMPTY VALIDATION
  // =========================================================================
  describe('Dimension 2: Role Claim Tampering & Zero Fallback Invariant', () => {
    it('2.1 MUST reject token completely missing role claim (ZERO fallback to "Employee")', async () => {
      const token = jwtService.sign(
        { sub: 'user-missing-role', email: 'missing@company.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.2 MUST reject token with empty string role claim ("")', async () => {
      const token = jwtService.sign(
        { sub: 'user-empty-role', role: '' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.3 MUST reject token with whitespace-only role claims ("   ", "\\t\\n")', async () => {
      const whitespaceRoles = ['   ', '\t', '\n\r  ', '  \t  '];

      for (const badRole of whitespaceRoles) {
        const token = jwtService.sign(
          { sub: 'user-ws-role', role: badRole },
          { secret: TEST_JWT_SECRET },
        );
        const socket = createMockSocket({ auth: { token } });

        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('2.4 MUST reject token with non-string role types (number, boolean, array, object, null)', async () => {
      const invalidRolePayloads = [
        { sub: 'user-1', role: 12345 },
        { sub: 'user-2', role: true },
        { sub: 'user-3', role: ['Admin', 'Technician'] },
        { sub: 'user-4', role: { name: 'Admin' } },
        { sub: 'user-5', role: null },
      ];

      for (const payload of invalidRolePayloads) {
        const token = jwtService.sign(payload, { secret: TEST_JWT_SECRET });
        const socket = createMockSocket({ auth: { token } });

        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('2.5 MUST reject token with missing sub and id (unidentifiable user identity)', async () => {
      const token = jwtService.sign(
        { role: 'Admin', email: 'ghost@company.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.6 MUST reject token with empty or whitespace sub/id ("" or "   ")', async () => {
      const token1 = jwtService.sign({ sub: '', role: 'Admin' }, { secret: TEST_JWT_SECRET });
      const token2 = jwtService.sign({ id: '   ', role: 'Admin' }, { secret: TEST_JWT_SECRET });

      for (const token of [token1, token2]) {
        const socket = createMockSocket({ auth: { token } });
        await gateway.handleConnection(socket as unknown as Socket);
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('2.7 MUST trim whitespace around valid userId and role and join exact sanitized rooms', async () => {
      const token = jwtService.sign(
        { sub: '  user-trim-id  ', role: '  Super Admin  ' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-trim-id');
      expect(socket.join).toHaveBeenCalledWith('role:Super Admin');
      expect(socket.data).toEqual({
        userId: 'user-trim-id',
        role: 'Super Admin',
        email: undefined,
      });
    });
  });

  // =========================================================================
  // CHALLENGE DIMENSION 3: TOKEN SIGNATURE TAMPERING & CRYPTOGRAPHIC INTEGRITY
  // =========================================================================
  describe('Dimension 3: Token Signature Tampering & Cryptographic Integrity', () => {
    it('3.1 MUST reject token when signature is altered or corrupted', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-victim', role: 'Employee' },
        { secret: TEST_JWT_SECRET },
      );
      const parts = validToken.split('.');
      // Tamper signature segment
      const tamperedSignature = `${parts[2].substring(0, parts[2].length - 4)}XXXX`;
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      const socket = createMockSocket({ auth: { token: tamperedToken } });
      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('3.2 MUST reject token when payload is tampered to escalate privileges without re-signing', async () => {
      const legitToken = jwtService.sign(
        { sub: 'user-regular', role: 'Employee' },
        { secret: TEST_JWT_SECRET },
      );
      const [header, , signature] = legitToken.split('.');

      // Attacker crafts escalated payload Base64
      const evilPayloadObj = { sub: 'user-regular', role: 'Super Admin' };
      const evilPayloadB64 = Buffer.from(JSON.stringify(evilPayloadObj)).toString('base64url');
      const forgedToken = `${header}.${evilPayloadB64}.${signature}`;

      const socket = createMockSocket({ auth: { token: forgedToken } });
      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('3.3 MUST reject token signed with an untrusted or rogue secret', async () => {
      const rogueJwtService = new JwtService({ secret: 'evil-attacker-secret-key-666' });
      const rogueToken = rogueJwtService.sign(
        { sub: 'attacker-1', role: 'Super Admin' },
        { secret: 'evil-attacker-secret-key-666' },
      );

      const socket = createMockSocket({ auth: { token: rogueToken } });
      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('3.4 MUST reject expired tokens immediately', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'user-expired', role: 'Admin' },
        { secret: TEST_JWT_SECRET, expiresIn: '-1h' },
      );

      const socket = createMockSocket({ auth: { token: expiredToken } });
      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('3.5 MUST reject malformed / truncated token strings', async () => {
      const junkTokens = [
        'not.a.valid.jwt.at.all',
        'only-one-part',
        'partone.parttwo',
        '',
        'Bearer ',
      ];

      for (const junk of junkTokens) {
        const socket = createMockSocket({ auth: { token: junk } });
        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('3.6 MUST fail closed when server JWT_SECRET is unconfigured or empty', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const originalEnvSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        const validToken = jwtService.sign(
          { sub: 'user-unreachable', role: 'Admin' },
          { secret: TEST_JWT_SECRET },
        );
        const socket = createMockSocket({ auth: { token: validToken } });

        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      } finally {
        if (originalEnvSecret !== undefined) {
          process.env.JWT_SECRET = originalEnvSecret;
        }
      }
    });

    it('3.7 MUST accept valid token from Authorization: Bearer <token> header', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-bearer', role: 'Auditor', email: 'auditor@company.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Bearer ${validToken}` },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-bearer');
      expect(socket.join).toHaveBeenCalledWith('role:Auditor');
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          status: 'ready',
          userId: 'user-bearer',
          role: 'Auditor',
        }),
      );
    });

    it('3.8 MUST reject Authorization header with non-Bearer scheme (e.g. Basic or Token)', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-basic', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Basic ${validToken}` },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CHALLENGE DIMENSION 4: ONMODULEDESTROY LIFECYCLE DRAINING RESILIENCE
  // =========================================================================
  describe('Dimension 4: OnModuleDestroy Lifecycle Draining Resilience', () => {
    it('4.1 MUST broadcast server_shutdown, forcibly disconnect all active sockets, and close server', async () => {
      const socket1 = { disconnect: vi.fn() };
      const socket2 = { disconnect: vi.fn() };
      const socket3 = { disconnect: vi.fn() };
      const activeSockets = [socket1, socket2, socket3];

      mockServer.fetchSockets.mockResolvedValue(activeSockets);
      const closeSpy = vi.fn((cb?: () => void) => cb?.());
      mockServer.close = closeSpy;

      await gateway.onModuleDestroy();

      // 1. Broadcast shutdown event
      expect(mockServer.emit).toHaveBeenCalledWith(
        'server_shutdown',
        expect.objectContaining({
          message: expect.stringContaining('Server is shutting down'),
          timestamp: expect.any(String),
        }),
      );

      // 2. Disconnect active sockets with disconnect(true)
      expect(mockServer.fetchSockets).toHaveBeenCalledTimes(1);
      expect(socket1.disconnect).toHaveBeenCalledWith(true);
      expect(socket2.disconnect).toHaveBeenCalledWith(true);
      expect(socket3.disconnect).toHaveBeenCalledWith(true);

      // 3. Close server cleanly
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('4.2 MUST return gracefully without error when server is null or undefined', async () => {
      gateway.server = undefined as unknown as Server;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();

      gateway.server = null as unknown as Server;
      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('4.3 MUST continue draining and close server even if server.emit throws an error', async () => {
      mockServer.emit.mockImplementation(() => {
        throw new Error('Socket.io emit pipe broken');
      });

      const socket1 = { disconnect: vi.fn() };
      mockServer.fetchSockets.mockResolvedValue([socket1]);
      const closeSpy = vi.fn((cb?: () => void) => cb?.());
      mockServer.close = closeSpy;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();

      expect(socket1.disconnect).toHaveBeenCalledWith(true);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('4.4 MUST continue server closure even if server.fetchSockets rejects with an error', async () => {
      mockServer.fetchSockets.mockRejectedValue(
        new Error('Redis adapter IPC error during fetchSockets'),
      );
      const closeSpy = vi.fn((cb?: () => void) => cb?.());
      mockServer.close = closeSpy;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();

      expect(mockServer.emit).toHaveBeenCalledWith('server_shutdown', expect.any(Object));
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('4.5 MUST handle gracefully when server.fetchSockets is not a function', async () => {
      const serverWithoutFetch = {
        emit: vi.fn(),
        close: vi.fn((cb?: () => void) => cb?.()),
      };
      gateway.server = serverWithoutFetch as unknown as Server;

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
      expect(serverWithoutFetch.emit).toHaveBeenCalledWith('server_shutdown', expect.any(Object));
      expect(serverWithoutFetch.close).toHaveBeenCalledTimes(1);
    });

    it('4.6 MUST handle gracefully when an individual socket.disconnect throws an error', async () => {
      const faultySocket = {
        disconnect: vi.fn(() => {
          throw new Error('Socket already dead or pipeline error');
        }),
      };
      const normalSocket = { disconnect: vi.fn() };

      mockServer.fetchSockets.mockResolvedValue([faultySocket, normalSocket]);
      const closeSpy = vi.fn((cb?: () => void) => cb?.());
      mockServer.close = closeSpy;

      // When faultySocket throws inside the loop, the catch block catches it and proceeds to step 3 (close)
      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('4.7 MUST handle gracefully when server.close throws synchronously', async () => {
      mockServer.fetchSockets.mockResolvedValue([]);
      mockServer.close.mockImplementation(() => {
        throw new Error('Synchronous close failure in socket.io engine');
      });

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('4.8 MUST handle server.close returning a Promise cleanly', async () => {
      mockServer.fetchSockets.mockResolvedValue([]);
      let promiseResolved = false;
      mockServer.close.mockImplementation(() => {
        return new Promise<void>((resolve) => {
          promiseResolved = true;
          resolve();
        });
      });

      await expect(gateway.onModuleDestroy()).resolves.toBeUndefined();
      expect(promiseResolved).toBe(true);
    });

    it('4.9 MUST resolve via timeout fallback if server.close callback hangs indefinitely', async () => {
      vi.useFakeTimers();
      try {
        mockServer.fetchSockets.mockResolvedValue([]);
        // close never calls callback and returns undefined
        mockServer.close.mockImplementation(() => {
          return undefined;
        });

        const destroyPromise = gateway.onModuleDestroy();

        // Advance timers past 5000ms guard timeout
        await vi.advanceTimersByTimeAsync(5000);

        await expect(destroyPromise).resolves.toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // =========================================================================
  // CHALLENGE DIMENSION 5: HIGH CONCURRENCY & RECONNECTION STORM STRESS
  // =========================================================================
  describe('Dimension 5: Concurrency & Reconnection Storm Stress', () => {
    it('5.1 MUST handle 200 concurrent connection requests with 100% deterministic security outcomes', async () => {
      const TOTAL_CLIENTS = 200;
      const sockets: Array<MockSocketInstance> = [];
      const connectPromises: Array<Promise<void>> = [];

      for (let i = 0; i < TOTAL_CLIENTS; i++) {
        const socket = buildStormSocket(i);
        sockets.push(socket);
        connectPromises.push(gateway.handleConnection(socket as unknown as Socket));
      }

      await Promise.all(connectPromises);

      // Verify every single client deterministically
      for (let i = 0; i < TOTAL_CLIENTS; i++) {
        const scenario = i % 4;
        const s = sockets[i];

        if (scenario === 0) {
          // Valid: connected, joined rooms, no disconnect
          expect(s.disconnect).not.toHaveBeenCalled();
          expect(s.join).toHaveBeenCalledWith(`user:user-storm-${i}`);
          expect(s.join).toHaveBeenCalledWith('role:Technician');
          expect(s.emit).toHaveBeenCalledWith(
            'connected',
            expect.objectContaining({ userId: `user-storm-${i}`, role: 'Technician' }),
          );
        } else {
          // Attack / Malformed / Tampered: forcibly disconnected
          expect(s.disconnect).toHaveBeenCalledWith(true);
          expect(s.join).not.toHaveBeenCalled();
        }
      }
    });

    it('5.2 Sockets with pre-populated valid data skip re-authentication without bypassing room joining', async () => {
      const socket = createMockSocket({
        data: {
          userId: 'cached-user-999',
          role: 'Manager',
        },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:cached-user-999');
      expect(socket.join).toHaveBeenCalledWith('role:Manager');
    });

    it('5.3 Sockets with incomplete pre-populated data (missing role) re-trigger full authentication and fail closed', async () => {
      const socket = createMockSocket({
        data: {
          userId: 'cached-user-incomplete',
          // role missing!
        },
        // no auth token
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });
});

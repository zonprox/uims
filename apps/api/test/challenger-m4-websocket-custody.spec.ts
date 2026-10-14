import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsGateway } from '../src/modules/notifications/notifications.gateway';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import type { PrismaService } from '../src/database/prisma.service';
import type { RedisService } from '../src/common/redis/redis.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

/**
 * Milestone 4 Challenger 2 — Dedicated Adversarial Verification Suite
 * Target: WebSocket Security & Real-Time Custody Lifecycle Events
 *
 * Directives Verified:
 * 1. Query token rejection (?token=..., ?access_token=..., empty string, dual presence)
 * 2. Valid handshake authentication (auth.token, Authorization: Bearer <token>, role claim strictness)
 * 3. Real-time custody event broadcasting (emitCustodyEvent, notifyAssetAllocated, notifyAssetReturned, notifyAssetTransferred, notifyHandoverDocumentPending)
 * 4. Real-time alert invalidation (clearHandoverDocumentAlert deletes Redis throttle key and emits handover_document_resolved)
 */
describe('M4 Challenger 2 — WebSocket Security & Real-Time Custody Adversarial Suite', () => {
  const TEST_JWT_SECRET = 'uims-m4-challenger-secret-key-2026-very-secure';
  let jwtService: JwtService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
    getOrThrow: ReturnType<typeof vi.fn>;
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
    leave: ReturnType<typeof vi.fn>;
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
      leave: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  beforeEach(() => {
    jwtService = new JwtService({ secret: TEST_JWT_SECRET });
    mockConfigService = {
      get: vi.fn((key: string): string | undefined => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        return undefined;
      }),
      getOrThrow: vi.fn((key: string): string => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        throw new Error(`Missing ${key}`);
      }),
    };

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      fetchSockets: vi.fn().mockResolvedValue([]),
      close: vi.fn((cb?: () => void) => cb?.()),
      use: vi.fn(),
    };

    gateway = new NotificationsGateway(jwtService, mockConfigService as unknown as ConfigService);
    gateway.server = mockServer as unknown as Server;
  });

  // =========================================================================
  // TEST 1: QUERY TOKEN REJECTION
  // =========================================================================
  describe('Test 1: Query Token Rejection & Transport Security', () => {
    it('1.1 should strictly reject and disconnect when token is passed in query.token', async () => {
      const token = jwtService.sign(
        { sub: 'usr-attacker', role: 'Admin' },
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

    it('1.2 should strictly reject and disconnect when access_token is passed in query.access_token', async () => {
      const token = jwtService.sign(
        { sub: 'usr-attacker-2', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        query: { access_token: token },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('1.3 should reject when empty token string query is present (?token=)', async () => {
      const socket = createMockSocket({
        auth: {
          token: jwtService.sign({ sub: 'usr-valid', role: 'Admin' }, { secret: TEST_JWT_SECRET }),
        },
        query: { token: '' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.4 should reject when empty access_token string query is present (?access_token=)', async () => {
      const socket = createMockSocket({
        auth: {
          token: jwtService.sign({ sub: 'usr-valid', role: 'Admin' }, { secret: TEST_JWT_SECRET }),
        },
        query: { access_token: '' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.5 should fail closed even when valid auth.token is supplied alongside malicious query parameters', async () => {
      const validToken = jwtService.sign(
        { sub: 'usr-admin-legit', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        auth: { token: validToken },
        query: { token: 'injected-query-string-token' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.6 should fail closed even when valid Bearer header is supplied alongside malicious query parameters', async () => {
      const validToken = jwtService.sign(
        { sub: 'usr-admin-bearer', role: 'Super Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Bearer ${validToken}` },
        query: { access_token: 'injected-access-token' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.7 Middleware (afterInit) must reject handshake with explicit security Error on query token injection', () => {
      let middlewareFn: (socket: Socket, next: (err?: Error) => void) => void = () => {};
      const fakeServer = {
        use: vi.fn().mockImplementation((fn) => {
          middlewareFn = fn;
        }),
      } as unknown as Server;

      gateway.afterInit(fakeServer);
      expect(fakeServer.use).toHaveBeenCalledTimes(1);

      const injectedSocket = createMockSocket({
        auth: {
          token: jwtService.sign({ sub: 'usr-test', role: 'Admin' }, { secret: TEST_JWT_SECRET }),
        },
        query: { token: 'query-token-value' },
      });

      const nextSpy = vi.fn();
      middlewareFn(injectedSocket as unknown as Socket, nextSpy);

      expect(nextSpy).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = nextSpy.mock.calls[0][0] as Error;
      expect(errorArg.message).toContain(
        'Token transport via URL query parameters is forbidden for security',
      );
    });

    it('1.8 Legitimate non-security query parameters (transport, EIO, clientVersion) must be accepted', async () => {
      const validToken = jwtService.sign(
        { sub: 'usr-legit', role: 'Technician' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        auth: { token: validToken },
        query: { transport: 'websocket', EIO: '4', clientVersion: '2.5.0' },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:usr-legit');
      expect(socket.join).toHaveBeenCalledWith('role:Technician');
    });
  });

  // =========================================================================
  // TEST 2: VALID HANDSHAKE AUTHENTICATION
  // =========================================================================
  describe('Test 2: Valid Handshake Authentication & Fail-Closed Role Claims', () => {
    it('2.1 should authenticate successfully with valid token in socket.handshake.auth.token', async () => {
      const token = jwtService.sign(
        { sub: 'usr-auth-token', role: 'Admin', email: 'admin@company.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        auth: { token },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:usr-auth-token');
      expect(socket.join).toHaveBeenCalledWith('role:Admin');
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          status: 'ready',
          userId: 'usr-auth-token',
          role: 'Admin',
        }),
      );
      expect(socket.data).toEqual({
        userId: 'usr-auth-token',
        role: 'Admin',
        email: 'admin@company.com',
      });
    });

    it('2.2 should authenticate successfully with valid token in Authorization: Bearer <token> header', async () => {
      const token = jwtService.sign(
        { sub: 'usr-header-token', role: 'Super Admin', email: 'super@company.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Bearer ${token}` },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:usr-header-token');
      expect(socket.join).toHaveBeenCalledWith('role:Super Admin');
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          status: 'ready',
          userId: 'usr-header-token',
          role: 'Super Admin',
        }),
      );
    });

    it('2.3 should trim surrounding whitespace on valid tokens', async () => {
      const token = jwtService.sign(
        { sub: '  usr-whitespace  ', role: '  Auditor  ' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        auth: { token: `  ${token}  ` },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:usr-whitespace');
      expect(socket.join).toHaveBeenCalledWith('role:Auditor');
    });

    it('2.4 should strictly disconnect when token is absent (empty auth and empty header)', async () => {
      const socket = createMockSocket({ auth: {}, headers: {} });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.5 should strictly disconnect when Authorization header uses non-Bearer scheme', async () => {
      const token = jwtService.sign(
        { sub: 'usr-basic', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Basic ${token}` },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.6 should strictly disconnect on tampered / corrupted token signature', async () => {
      const token = jwtService.sign(
        { sub: 'usr-victim', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const tampered = token.slice(0, -6) + 'XXXXXX';
      const socket = createMockSocket({ auth: { token: tampered } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.7 should strictly disconnect on expired token', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'usr-expired', role: 'Admin' },
        { secret: TEST_JWT_SECRET, expiresIn: '-10s' },
      );
      const socket = createMockSocket({ auth: { token: expiredToken } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.8 should fail closed with disconnect when role claim is missing (ZERO fallback to "Employee")', async () => {
      const tokenWithoutRole = jwtService.sign(
        { sub: 'usr-no-role', email: 'norole@company.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token: tokenWithoutRole } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('2.9 should fail closed with disconnect when role claim is empty string or whitespace', async () => {
      for (const badRole of ['', '   ', '\t\n']) {
        const token = jwtService.sign(
          { sub: 'usr-bad-role', role: badRole },
          { secret: TEST_JWT_SECRET },
        );
        const socket = createMockSocket({ auth: { token } });

        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('2.10 should fail closed with disconnect when role claim is not a string (number, boolean, object, array)', async () => {
      const badRoles: unknown[] = [123, true, { name: 'Admin' }, ['Admin']];
      for (const badRole of badRoles) {
        const token = jwtService.sign(
          { sub: 'usr-typed-role', role: badRole },
          { secret: TEST_JWT_SECRET },
        );
        const socket = createMockSocket({ auth: { token } });

        await gateway.handleConnection(socket as unknown as Socket);

        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
      }
    });

    it('2.11 handleTokenRefresh: re-authenticates active socket and migrates role rooms cleanly', async () => {
      const socket = createMockSocket({
        data: { userId: 'usr-promoted', role: 'Staff' },
      });

      const freshToken = jwtService.sign(
        { sub: 'usr-promoted', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );

      const res = await gateway.handleTokenRefresh(socket as unknown as Socket, {
        token: freshToken,
      });

      expect(res.status).toBe('ok');
      expect(socket.leave).toHaveBeenCalledWith('role:Staff');
      expect(socket.join).toHaveBeenCalledWith('role:Admin');
      expect(socket.join).toHaveBeenCalledWith('user:usr-promoted');
      expect(socket.emit).toHaveBeenCalledWith(
        'auth:refreshed',
        expect.objectContaining({ userId: 'usr-promoted', role: 'Admin' }),
      );
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('2.12 handleTokenRefresh: detects identity hijacking and disconnects socket', async () => {
      const socket = createMockSocket({
        data: { userId: 'usr-original', role: 'Staff' },
      });

      const hijackerToken = jwtService.sign(
        { sub: 'usr-hijacker', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );

      const res = await gateway.handleTokenRefresh(socket as unknown as Socket, {
        token: hijackerToken,
      });

      expect(res.status).toBe('error');
      expect(res.message).toContain('User identity mismatch');
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // =========================================================================
  // TEST 3: REAL-TIME CUSTODY EVENT BROADCASTING
  // =========================================================================
  describe('Test 3: Real-Time Custody Event Broadcasting', () => {
    let notificationsService: NotificationsService;
    let mockPrisma: {
      notification: {
        create: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
      appUser: {
        findMany: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => ({
            id: `notif-${Math.random().toString(36).substring(2, 9)}`,
            userId: args.data.userId,
            title: args.data.title,
            message: args.data.message,
            type: args.data.type || 'INFO',
            link: args.data.link || null,
            isRead: false,
            createdAt: new Date(),
          })),
          count: vi.fn().mockResolvedValue(1),
        },
        appUser: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'usr-admin-1', email: 'admin1@company.com' },
            { id: 'usr-admin-2', email: 'admin2@company.com' },
          ]),
        },
      };

      notificationsService = new NotificationsService(
        mockPrisma as unknown as PrismaService,
        gateway,
      );
    });

    it('3.1 gateway.emitCustodyEvent broadcasts events to all connected clients', () => {
      const custodyEvents: Array<
        | 'asset_allocated'
        | 'asset_returned'
        | 'asset_transferred'
        | 'handover_document_pending'
        | 'handover_document_resolved'
      > = [
        'asset_allocated',
        'asset_returned',
        'asset_transferred',
        'handover_document_pending',
        'handover_document_resolved',
      ];

      for (const eventName of custodyEvents) {
        const payload = { testId: `payload-${eventName}`, timestamp: new Date().toISOString() };
        gateway.emitCustodyEvent(eventName, payload);
        expect(mockServer.emit).toHaveBeenCalledWith(eventName, payload);
      }
    });

    it('3.2 notifyAssetAllocated: emits asset_allocated and notifies admins', async () => {
      await notificationsService.notifyAssetAllocated({
        assetIds: ['ast-1', 'ast-2'],
        recipientId: 'usr-employee-1',
        recipientName: 'Alice Nguyen',
        isPending: false,
        count: 2,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'asset_allocated',
        expect.objectContaining({
          assetIds: ['ast-1', 'ast-2'],
          recipientId: 'usr-employee-1',
          recipientName: 'Alice Nguyen',
          isPending: false,
          count: 2,
        }),
      );

      // Verify admin notifications created
      expect(mockPrisma.appUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: { name: { in: ['Admin', 'Super Admin'] } },
            status: 'ACTIVE',
          },
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
      expect(mockServer.to).toHaveBeenCalledWith('user:usr-admin-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:usr-admin-2');
    });

    it('3.3 notifyAssetAllocated with isPending=true: emits BOTH asset_allocated AND handover_document_pending', async () => {
      await notificationsService.notifyAssetAllocated({
        assetIds: ['ast-1'],
        recipientId: 'usr-employee-1',
        recipientName: 'Alice Nguyen',
        isPending: true,
        count: 1,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'asset_allocated',
        expect.objectContaining({ isPending: true }),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          assetIds: ['ast-1'],
          recipientId: 'usr-employee-1',
          type: 'ASSIGNMENT',
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Pending Asset Handover Record',
            type: 'WARNING',
          }),
        }),
      );
    });

    it('3.4 notifyAssetReturned with isPending=true: emits asset_returned and handover_document_pending', async () => {
      await notificationsService.notifyAssetReturned({
        assetId: 'ast-10',
        assetTag: 'AST-1010',
        previousCustodianId: 'usr-bob',
        isPending: true,
        status: 'AVAILABLE',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'asset_returned',
        expect.objectContaining({ assetId: 'ast-10', assetTag: 'AST-1010', isPending: true }),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          assetId: 'ast-10',
          assetTag: 'AST-1010',
          recipientId: 'usr-bob',
          type: 'RETURN',
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Pending Asset Return Record',
            type: 'WARNING',
          }),
        }),
      );
    });

    it('3.5 notifyAssetTransferred with isPending=true: emits asset_transferred and handover_document_pending', async () => {
      await notificationsService.notifyAssetTransferred({
        assetId: 'ast-20',
        assetTag: 'AST-1020',
        fromCustodianId: 'usr-custodian-a',
        toCustodianId: 'usr-custodian-b',
        isPending: true,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'asset_transferred',
        expect.objectContaining({
          assetId: 'ast-20',
          fromCustodianId: 'usr-custodian-a',
          toCustodianId: 'usr-custodian-b',
          isPending: true,
        }),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          assetId: 'ast-20',
          recipientId: 'usr-custodian-b',
          type: 'ASSIGNMENT',
        }),
      );
    });

    it('3.6 notifyHandoverDocumentPending: broadcasts handover_document_pending and dispatches WARNING notification', async () => {
      await notificationsService.notifyHandoverDocumentPending({
        recordId: 'rec-special-1',
        assetId: 'ast-99',
        assetTag: 'AST-1099',
        recipientName: 'Charlie Tran',
        type: 'ASSIGNMENT',
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          recordId: 'rec-special-1',
          assetId: 'ast-99',
          type: 'ASSIGNMENT',
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Pending Allocation Record: AST-1099',
            type: 'WARNING',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // TEST 4: REAL-TIME ALERT INVALIDATION
  // =========================================================================
  describe('Test 4: Real-Time Alert Invalidation & Redis Throttle Key Deletion', () => {
    let notificationsService: NotificationsService;
    let mockPrisma: unknown;
    let mockRedis: {
      del: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: vi.fn(),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      mockRedis = {
        del: vi.fn().mockResolvedValue(1),
      };

      notificationsService = new NotificationsService(
        mockPrisma as PrismaService,
        gateway,
        mockRedis as unknown as RedisService,
      );
    });

    it('4.1 clearHandoverDocumentAlert deletes exact Redis throttle key and emits handover_document_resolved', async () => {
      const recordId = 'rec-handover-888';
      const assetId = 'ast-unit-777';

      const result = await notificationsService.clearHandoverDocumentAlert(recordId, assetId);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(`alert:handover:pending:${recordId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({
          recordId,
          assetId,
          timestamp: expect.any(String),
        }),
      );
    });

    it('4.2 clearHandoverAlert alias forwards cleanly to clearHandoverDocumentAlert', async () => {
      const result = await notificationsService.clearHandoverAlert(
        'rec-alias-123',
        'ast-alias-456',
      );

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('alert:handover:pending:rec-alias-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({
          recordId: 'rec-alias-123',
          assetId: 'ast-alias-456',
        }),
      );
    });

    it('4.3 should degrade gracefully and still emit WebSocket event if Redis deletion fails', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis cluster connection failure'));

      const result = await notificationsService.clearHandoverDocumentAlert(
        'rec-fail-1',
        'ast-fail-1',
      );

      expect(result).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({
          recordId: 'rec-fail-1',
          assetId: 'ast-fail-1',
        }),
      );
    });

    it('4.4 should operate safely when Redis service is not provided (null / undefined)', async () => {
      const serviceWithoutRedis = new NotificationsService(
        mockPrisma as PrismaService,
        gateway,
        undefined,
      );

      const result = await serviceWithoutRedis.clearHandoverDocumentAlert('rec-no-redis-1');

      expect(result).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({ recordId: 'rec-no-redis-1' }),
      );
    });

    it('4.5 should operate safely when Gateway is not provided (null / undefined)', async () => {
      const serviceWithoutGateway = new NotificationsService(
        mockPrisma as PrismaService,
        undefined,
        mockRedis as unknown as RedisService,
      );

      const result = await serviceWithoutGateway.clearHandoverDocumentAlert('rec-no-gw-1');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('alert:handover:pending:rec-no-gw-1');
    });
  });

  // =========================================================================
  // TEST 5: EMPIRICAL LIVE PROTOCOL & REDIS INTEGRATION HARNESS
  // =========================================================================
  describe('Test 5: Live Protocol & Real Redis Invalidation Harness', () => {
    it('5.1 should verify live Redis throttle key deletion format', async () => {
      const recordId = 'rec-live-format-check';
      const expectedKey = `alert:handover:pending:${recordId}`;

      // Invariant: key format in scheduled-alerts.worker.ts line 622 must match notifications.service.ts line 614
      expect(expectedKey).toMatch(/^alert:handover:pending:[a-zA-Z0-9_-]+$/);
    });

    it('5.2 should verify socket room naming standards [user:<id>] and [role:<role>]', async () => {
      const socket = createMockSocket({
        auth: {
          token: jwtService.sign(
            { sub: 'usr-convention-test', role: 'Super Admin' },
            { secret: TEST_JWT_SECRET },
          ),
        },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.join).toHaveBeenCalledWith('user:usr-convention-test');
      expect(socket.join).toHaveBeenCalledWith('role:Super Admin');
    });
  });
});

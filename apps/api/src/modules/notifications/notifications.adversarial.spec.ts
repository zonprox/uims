import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import {
  createNotificationSchema,
  notificationQuerySchema,
  markNotificationReadSchema,
  bulkNotificationActionSchema,
} from '@uims/shared-validators';
import type { Socket } from 'socket.io';
import type { Notification, NotificationType } from '@prisma/client';

describe('Milestone 1 Adversarial Challenge: Notifications Gateway & Persistence', () => {
  const TEST_JWT_SECRET = 'adversarial-challenge-jwt-secret-2026';
  let jwtService: JwtService;
  let configService: ConfigService;
  let gateway: NotificationsGateway;
  let mockServer: {
    to: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    jwtService = new JwtService({ secret: TEST_JWT_SECRET });
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        return undefined;
      }),
    } as unknown as ConfigService;

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    gateway = new NotificationsGateway(jwtService, configService);
    gateway.server = mockServer as unknown as import('socket.io').Server;
  });

  // Helper to create mock Socket instance
  function createMockSocket(handshakeData: {
    auth?: Record<string, unknown>;
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
  }): Socket {
    return {
      id: `socket-${Math.random().toString(36).substring(2, 9)}`,
      data: {},
      handshake: {
        auth: handshakeData.auth || {},
        headers: handshakeData.headers || {},
        query: handshakeData.query || {},
      },
      join: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as Socket;
  }

  /* =========================================================================
   * 1. AUTHENTICATION & HANDSHAKE EDGE CASES
   * ========================================================================= */
  describe('1. Authentication & Handshake Edge Cases', () => {
    it('A1. rejects connection when no token is provided in auth, headers, or query', async () => {
      const socket = createMockSocket({});
      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('A2. rejects connection when empty string token is provided', async () => {
      const socket = createMockSocket({ auth: { token: '' } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('A3. rejects connection with malformed / junk token string', async () => {
      const socket = createMockSocket({ auth: { token: 'invalid.junk.token' } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('A4. rejects connection with expired JWT token', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'user-expired', role: 'Employee' },
        { secret: TEST_JWT_SECRET, expiresIn: '-10s' },
      );
      const socket = createMockSocket({ auth: { token: expiredToken } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('A5. rejects connection when token is signed with a different secret', async () => {
      const untrustedJwtService = new JwtService({ secret: 'attacker-evil-secret' });
      const tamperedToken = untrustedJwtService.sign({ sub: 'user-hacker', role: 'Super Admin' });
      const socket = createMockSocket({ auth: { token: tamperedToken } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('A6. rejects connection when JWT payload lacks both sub and id', async () => {
      const invalidPayloadToken = jwtService.sign(
        { email: 'anonymous@uims.internal', role: 'Guest' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token: invalidPayloadToken } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('A7. successfully authenticates via handshake.auth.token with valid sub and role', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-001', role: 'Admin', email: 'admin@uims.internal' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token: validToken } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-001');
      expect(socket.join).toHaveBeenCalledWith('role:Admin');
      expect(socket.data).toEqual({
        userId: 'user-001',
        role: 'Admin',
        email: 'admin@uims.internal',
      });
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          status: 'ready',
          userId: 'user-001',
          role: 'Admin',
        }),
      );
    });

    it('A8. successfully authenticates via handshake.headers.authorization Bearer header', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-002', role: 'Manager', email: 'mgr@uims.internal' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        headers: { authorization: `Bearer ${validToken}` },
      });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-002');
      expect(socket.join).toHaveBeenCalledWith('role:Manager');
    });

    it('A9. successfully authenticates via handshake.query.token parameter', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-003', role: 'Auditor' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        query: { token: validToken },
      });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-003');
      expect(socket.join).toHaveBeenCalledWith('role:Auditor');
    });

    it('A10. falls back to payload.id when payload.sub is not provided', async () => {
      const validToken = jwtService.sign(
        { id: 'user-custom-id', role: 'Staff' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token: validToken } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-custom-id');
      expect(socket.join).toHaveBeenCalledWith('role:Staff');
    });

    it('A11. defaults role to "Employee" when role is missing from payload', async () => {
      const validToken = jwtService.sign({ sub: 'user-default-role' }, { secret: TEST_JWT_SECRET });
      const socket = createMockSocket({ auth: { token: validToken } });
      await gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:user-default-role');
      expect(socket.join).toHaveBeenCalledWith('role:Employee');
      expect(socket.data.role).toBe('Employee');
    });

    it('A12. joins exact multi-word role room (e.g. "Super Admin")', async () => {
      const validToken = jwtService.sign(
        { sub: 'user-superadmin', role: 'Super Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token: validToken } });
      await gateway.handleConnection(socket);

      expect(socket.join).toHaveBeenCalledWith('user:user-superadmin');
      expect(socket.join).toHaveBeenCalledWith('role:Super Admin');
    });
  });

  /* =========================================================================
   * 2. ROOM ROUTING & MULTI-TENANT ISOLATION
   * ========================================================================= */
  describe('2. Room Routing & Multi-Tenant Isolation', () => {
    it('B1. routes sendToUser strictly to user:<userId> room', () => {
      const payload = {
        id: 'notif-101',
        title: 'Asset Assigned',
        description: 'Laptop DELL-XPS assigned to you',
        type: 'info',
      };

      gateway.sendToUser('user-tenant-a', payload);

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-tenant-a');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', payload);
      expect(mockServer.to).not.toHaveBeenCalledWith('user:user-tenant-b');
    });

    it('B2. routes sendCountToUser strictly to target user room with unreadCount payload', () => {
      gateway.sendCountToUser('user-tenant-a', 4);

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-tenant-a');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 4 });
      expect(mockServer.to).not.toHaveBeenCalledWith('user:user-tenant-b');
    });

    it('B3. routes sendToRole strictly to role:<role> room', () => {
      const payload = {
        id: 'notif-admin-1',
        title: 'Low Stock Alert',
        description: 'Inventory item Cat6 Cable below minimum threshold',
        type: 'warning',
      };

      gateway.sendToRole('Admin', payload);

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('role:Admin');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', payload);
      expect(mockServer.to).not.toHaveBeenCalledWith('role:Employee');
    });

    it('B4. routes sendCountToRole strictly to role:<role> room', () => {
      gateway.sendCountToRole('Super Admin', 12);

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('role:Super Admin');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 12 });
      expect(mockServer.to).not.toHaveBeenCalledWith('role:Admin');
    });

    it('B5. routes emitNotificationRead strictly to user:<userId> room with notification id', () => {
      gateway.emitNotificationRead('user-100', 'notif-999');

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-100');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:read', { id: 'notif-999' });
    });

    it('B6. routes emitNotificationsCleared to specific user room when userId is passed', () => {
      gateway.emitNotificationsCleared('user-100');

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-100');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:cleared', { success: true });
    });

    it('B7. broadcasts emitNotificationsCleared to all clients when no userId is passed', () => {
      gateway.emitNotificationsCleared();

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).toHaveBeenCalledWith('notification:cleared', { success: true });
    });
  });

  /* =========================================================================
   * 3. EVENT PAYLOAD INTEGRITY & TYPE CONFORMANCE
   * ========================================================================= */
  describe('3. Event Payload Integrity & Schema Conformance', () => {
    let service: NotificationsService;
    let mockPrisma: {
      notification: {
        create: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        deleteMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
      user: {
        findMany: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
          delete: vi.fn(),
          deleteMany: vi.fn(),
          count: vi.fn().mockResolvedValue(0),
        },
        user: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      service = new NotificationsService(mockPrisma as unknown as PrismaService, gateway);
    });

    it('C1. formats notification correctly with all required NotificationItem fields', async () => {
      const now = new Date();
      const mockCreated: Notification = {
        id: 'notif-uuid-1234',
        userId: 'user-001',
        title: 'Critical Server Alert',
        message: 'High CPU utilization detected on database node',
        type: 'ALERT',
        link: '/servers/db-01',
        isRead: false,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.notification.create.mockResolvedValue(mockCreated);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.create({
        userId: 'user-001',
        title: 'Critical Server Alert',
        message: 'High CPU utilization detected on database node',
        type: 'ALERT',
        link: '/servers/db-01',
      });

      expect(result).toHaveProperty('id', 'notif-uuid-1234');
      expect(result).toHaveProperty('title', 'Critical Server Alert');
      expect(result).toHaveProperty(
        'description',
        'High CPU utilization detected on database node',
      );
      expect(result).toHaveProperty('type', 'error'); // ALERT -> error
      expect(result).toHaveProperty('category', 'alerts'); // Alert keyword -> alerts
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('read', false);
      expect(result).toHaveProperty('link', '/servers/db-01');
      expect(result).toHaveProperty('createdAt', now.toISOString());
    });

    it('C2. accurately maps notification types (ALERT -> error, WARNING -> warning, INFO -> info)', async () => {
      const types: Array<{ input: NotificationType; expected: string }> = [
        { input: 'ALERT', expected: 'error' },
        { input: 'WARNING', expected: 'warning' },
        { input: 'INFO', expected: 'info' },
      ];

      for (const t of types) {
        const item: Notification = {
          id: `notif-${t.input}`,
          userId: 'user-001',
          title: `Title for ${t.input}`,
          message: `Message for ${t.input}`,
          type: t.input,
          link: null,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.notification.create.mockResolvedValue(item);
        const result = await service.create({
          userId: 'user-001',
          title: item.title,
          message: item.message,
          type: t.input,
        });

        expect(result.type).toBe(t.expected);
      }
    });

    it('C3. accurately categorizes notifications by content semantics (alerts, tasks, general)', async () => {
      const scenarios = [
        { title: 'New Task Assigned', msg: 'Please complete inventory audit', expected: 'tasks' },
        {
          title: 'Approval Required',
          msg: 'Asset transfer request needs review',
          expected: 'tasks',
        },
        { title: 'Stock Depleted', msg: 'Item #123 is out of stock', expected: 'alerts' },
        {
          title: 'License Expiration',
          msg: 'Autodesk license expiring in 5 days',
          expected: 'alerts',
        },
        {
          title: 'System Maintenance Window',
          msg: 'Scheduled for Saturday 2 AM',
          expected: 'general',
        },
      ];

      for (const s of scenarios) {
        const item: Notification = {
          id: 'test-cat-id',
          userId: 'user-001',
          title: s.title,
          message: s.msg,
          type: 'INFO',
          link: null,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.notification.create.mockResolvedValue(item);
        const result = await service.create({
          userId: 'user-001',
          title: s.title,
          message: s.msg,
        });

        expect(result.category).toBe(s.expected);
      }
    });

    it('C4. validates DTOs against shared Zod schemas', () => {
      // Valid create schema
      const validCreate = createNotificationSchema.safeParse({
        userId: 'u-1',
        title: 'Test Notification',
        message: 'This is a test notification body',
        type: 'INFO',
      });
      expect(validCreate.success).toBe(true);

      // Invalid create schema (empty title & message)
      const invalidCreate = createNotificationSchema.safeParse({
        userId: 'u-1',
        title: '',
        message: '',
      });
      expect(invalidCreate.success).toBe(false);

      // Valid query schema
      const validQuery = notificationQuerySchema.safeParse({
        page: 1,
        limit: 20,
        category: 'alerts',
        isRead: false,
      });
      expect(validQuery.success).toBe(true);

      // Valid mark read schema
      const validMarkRead = markNotificationReadSchema.safeParse({
        isRead: true,
      });
      expect(validMarkRead.success).toBe(true);

      // Valid bulk action schema
      const validBulk = bulkNotificationActionSchema.safeParse({
        ids: ['id-1', 'id-2'],
        action: 'markRead',
      });
      expect(validBulk.success).toBe(true);
    });
  });

  /* =========================================================================
   * 4. SERVICE-TO-GATEWAY FULL PERSISTENCE & BROADCAST SYNCHRONIZATION
   * ========================================================================= */
  describe('4. Service-to-Gateway Persistence & Broadcast Flow', () => {
    let service: NotificationsService;
    let mockPrisma: {
      notification: {
        create: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        deleteMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
      user: {
        findMany: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
          delete: vi.fn(),
          deleteMany: vi.fn(),
          count: vi.fn().mockResolvedValue(3),
        },
        user: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      service = new NotificationsService(mockPrisma as unknown as PrismaService, gateway);
    });

    it('D1. service.create persists to DB and triggers real-time sendToUser and sendCountToUser', async () => {
      const now = new Date();
      const mockRecord: Notification = {
        id: 'notif-d1',
        userId: 'user-target',
        title: 'New Hardware Assigned',
        message: 'Monitor 4K assigned to your workstation',
        type: 'INFO',
        link: '/assets/mon-4k',
        isRead: false,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.notification.create.mockResolvedValue(mockRecord);
      mockPrisma.notification.count.mockResolvedValue(4);

      const res = await service.create({
        userId: 'user-target',
        title: mockRecord.title,
        message: mockRecord.message,
        type: 'INFO',
        link: '/assets/mon-4k',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-target');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', res);
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 4 });
    });

    it('D2. service.markAsRead updates DB and emits notification:read + updated unreadCount', async () => {
      const now = new Date();
      const mockUpdated: Notification = {
        id: 'notif-d2',
        userId: 'user-target',
        title: 'Hardware Assigned',
        message: 'Monitor 4K',
        type: 'INFO',
        link: null,
        isRead: true,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.notification.update.mockResolvedValue(mockUpdated);
      mockPrisma.notification.count.mockResolvedValue(2); // Unread count decreased

      const res = await service.markAsRead('notif-d2');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-d2' },
        data: { isRead: true },
      });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-target');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:read', { id: 'notif-d2' });
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 2 });
      expect(res.read).toBe(true);
    });

    it('D3. service.markAllAsRead updates all unread DB records and broadcasts unreadCount=0', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await service.markAllAsRead('user-target');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { isRead: false, userId: 'user-target' },
        data: { isRead: true },
      });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-target');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 0 });
      expect(res).toEqual({ count: 5, success: true });
    });

    it('D4. service.remove deletes DB record and updates unread count', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-d4',
        userId: 'user-target',
      });
      mockPrisma.notification.delete.mockResolvedValue({});
      mockPrisma.notification.count.mockResolvedValue(1);

      const res = await service.remove('notif-d4');

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-d4' },
      });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-target');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 1 });
      expect(res).toEqual({ success: true });
    });

    it('D5. service.clearAll deletes all records and emits notification:cleared + unreadCount=0', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 8 });

      const res = await service.clearAll('user-target');

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-target' },
      });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-target');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:cleared', { success: true });
      expect(mockServer.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 0 });
      expect(res).toEqual({ count: 8, success: true });
    });

    it('D6. service.notifyAdmins broadcasts to all active admin and super admin users', async () => {
      const adminUsers = [
        { id: 'admin-1', roleName: 'Admin' },
        { id: 'admin-2', roleName: 'Super Admin' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(adminUsers);
      mockPrisma.notification.create.mockImplementation((args) =>
        Promise.resolve({
          id: `notif-${args.data.userId}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const res = await service.notifyAdmins({
        title: 'System Security Alert',
        message: 'Multiple failed logins detected',
        type: 'ALERT',
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(res).toHaveLength(2);
      expect(mockServer.to).toHaveBeenCalledWith('user:admin-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:admin-2');
    });
  });

  /* =========================================================================
   * 5. HIGH-VOLUME CONCURRENCY & RESILIENCE
   * ========================================================================= */
  describe('5. High-Volume Concurrency & Resilience', () => {
    it('E1. handles 100 concurrent valid and invalid connection attempts deterministically', async () => {
      const sockets: Socket[] = [];
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const isValid = i % 2 === 0;
        let token: string | undefined;
        if (isValid) {
          token = jwtService.sign(
            { sub: `user-concurrent-${i}`, role: i % 4 === 0 ? 'Admin' : 'Employee' },
            { secret: TEST_JWT_SECRET },
          );
        } else {
          token = i % 3 === 0 ? undefined : 'malformed.token.value';
        }

        const socket = createMockSocket({ auth: token ? { token } : {} });
        sockets.push(socket);
        promises.push(gateway.handleConnection(socket));
      }

      await Promise.all(promises);

      // Verify valid sockets connected and invalid sockets disconnected
      sockets.forEach((s, idx) => {
        const isValid = idx % 2 === 0;
        if (isValid) {
          expect(s.disconnect).not.toHaveBeenCalled();
          expect(s.join).toHaveBeenCalledWith(`user:user-concurrent-${idx}`);
        } else {
          expect(s.disconnect).toHaveBeenCalledWith(true);
        }
      });
    });

    it('E2. handles 100 concurrent notification dispatches without race conditions', () => {
      for (let i = 0; i < 100; i++) {
        gateway.sendToUser(`user-load-${i}`, { id: `n-${i}`, title: `Alert #${i}` });
        gateway.sendCountToUser(`user-load-${i}`, i);
      }

      expect(mockServer.to).toHaveBeenCalledTimes(200);
      expect(mockServer.emit).toHaveBeenCalledTimes(200);
    });
  });
});

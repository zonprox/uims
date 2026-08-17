import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

export interface AuthenticatedSocketData {
  userId: string;
  role: string;
  email?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers?.authorization;
      const rawToken =
        client.handshake.auth?.token ||
        (typeof client.handshake.query?.token === 'string'
          ? client.handshake.query.token
          : undefined) ||
        (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

      if (!rawToken) {
        this.logger.debug(`Socket client ${client.id} rejected: No JWT token provided.`);
        client.disconnect(true);
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'uims-jwt-secret-change-in-production';

      const payload = this.jwtService.verify<{
        sub?: string;
        id?: string;
        role?: string;
        email?: string;
      }>(rawToken, { secret });

      const userId = payload.sub || payload.id;
      if (!userId) {
        this.logger.debug(`Socket client ${client.id} rejected: Invalid token payload.`);
        client.disconnect(true);
        return;
      }

      const role = payload.role || 'Employee';
      const socketData: AuthenticatedSocketData = {
        userId,
        role,
        email: payload.email,
      };

      client.data = socketData;

      // Join user specific room, role room, and broadcast room
      await client.join(`user:${userId}`);
      await client.join(`role:${role}`);
      await client.join('broadcast');

      this.logger.log(
        `Socket client ${client.id} connected: user=${userId}, role=${role}, joined [user:${userId}, role:${role}, broadcast]`,
      );

      client.emit('connected', {
        status: 'ready',
        userId,
        role,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.debug(
        `Socket client ${client.id} authentication failed: ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket client ${client.id} disconnected.`);
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: unknown) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification:new', notification);
    }
  }

  /**
   * Send unread count update to a specific user
   */
  sendCountToUser(userId: string, unreadCount: number) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification:count', { unreadCount });
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  sendToRole(role: string, notification: unknown) {
    if (this.server) {
      this.server.to(`role:${role}`).emit('notification:new', notification);
    }
  }

  /**
   * Send unread count update to all users with a specific role
   */
  sendCountToRole(role: string, unreadCount: number) {
    if (this.server) {
      this.server.to(`role:${role}`).emit('notification:count', { unreadCount });
    }
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(notification: unknown) {
    if (this.server) {
      this.server.to('broadcast').emit('notification:new', notification);
    }
  }

  /**
   * Emit notification read event
   */
  emitNotificationRead(userId: string, notificationId: string) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification:read', { id: notificationId });
    }
  }

  /**
   * Emit all notifications cleared event
   */
  emitNotificationsCleared(userId?: string) {
    if (this.server) {
      if (userId) {
        this.server.to(`user:${userId}`).emit('notification:cleared', { success: true });
      } else {
        this.server.to('broadcast').emit('notification:cleared', { success: true });
      }
    }
  }

  @SubscribeMessage('ping')
  handlePing(): { pong: string; time: string } {
    return { pong: 'pong', time: new Date().toISOString() };
  }
}

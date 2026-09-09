import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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

function resolveAllowedOrigins(): string[] {
  const rawOrigins = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
  const defaultDevOrigins = [
    'http://localhost:5679',
    'https://localhost:5679',
    'http://localhost:3000',
    'http://localhost:3002',
  ];
  return rawOrigins
    ? rawOrigins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : process.env.NODE_ENV === 'production'
      ? []
      : defaultDevOrigins;
}

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        return callback(null, true);
      }
      const allowed = resolveAllowedOrigins();
      if (
        allowed.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && origin.endsWith('.trycloudflare.com'))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' is not allowed by CORS policy`), false);
    },
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const authHeader = socket.handshake.headers?.authorization;
        const rawToken =
          socket.handshake.auth?.token ||
          (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

        if (!rawToken) {
          return next(new Error('Authentication error: No token provided'));
        }

        const secret = this.configService?.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret) {
          return next(new Error('Authentication error: Server misconfiguration'));
        }

        const payload = this.jwtService.verify<{
          sub?: string;
          id?: string;
          role?: string;
          email?: string;
        }>(rawToken, { secret });

        const userId = payload.sub || payload.id;
        if (!userId) {
          return next(new Error('Authentication error: Invalid payload'));
        }

        const role = payload.role;
        if (!role || typeof role !== 'string') {
          return next(new Error('Authentication error: Missing role in token payload'));
        }

        socket.data = {
          userId,
          role,
          email: payload.email,
        };
        next();
      } catch (err) {
        return next(new Error(`Authentication error: ${(err as Error).message}`));
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      const existingData = client.data as AuthenticatedSocketData | undefined;
      let userId = existingData?.userId;
      let role = existingData?.role;

      if (!userId || !role) {
        const authHeader = client.handshake.headers?.authorization;
        const rawToken =
          client.handshake.auth?.token ||
          (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

        if (!rawToken) {
          this.logger.debug(`Socket client ${client.id} rejected: No JWT token provided.`);
          client.disconnect(true);
          return;
        }

        const secret = this.configService?.get<string>('JWT_SECRET') || process.env.JWT_SECRET;

        if (!secret) {
          this.logger.error('JWT_SECRET is required for socket authentication');
          client.disconnect(true);
          return;
        }

        const payload = this.jwtService.verify<{
          sub?: string;
          id?: string;
          role?: string;
          email?: string;
        }>(rawToken, { secret });

        userId = payload.sub || payload.id;
        if (!userId) {
          this.logger.debug(`Socket client ${client.id} rejected: Invalid token payload.`);
          client.disconnect(true);
          return;
        }

        role = payload.role;
        if (!role || typeof role !== 'string') {
          this.logger.debug(`Socket client ${client.id} rejected: Missing role in token payload.`);
          client.disconnect(true);
          return;
        }

        const socketData: AuthenticatedSocketData = {
          userId,
          role,
          email: payload.email,
        };
        client.data = socketData;
      }

      // Join user specific room and role room
      await client.join(`user:${userId}`);
      await client.join(`role:${role}`);

      this.logger.log(
        `Socket client ${client.id} connected: user=${userId}, role=${role}, joined [user:${userId}, role:${role}]`,
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
        this.server.emit('notification:cleared', { success: true });
      }
    }
  }

  @SubscribeMessage('ping')
  handlePing(): { pong: string; time: string } {
    return { pong: 'pong', time: new Date().toISOString() };
  }
}

import { Logger, OnModuleDestroy } from '@nestjs/common';
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
import { getWebSocketCorsOptions } from '../../config/cors.config';

export interface AuthenticatedSocketData {
  userId: string;
  role: string;
  email?: string;
}

@WebSocketGateway({
  cors: getWebSocketCorsOptions(),
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authoritative socket authentication helper.
   * Enforces fail-closed token verification, explicitly forbids URL query tokens,
   * and mandates a non-empty string role claim (zero default fallback).
   */
  private authenticateSocket(socket: Socket): AuthenticatedSocketData {
    // 1. Explicitly forbid and reject tokens transmitted via URL query parameters
    const query = socket.handshake.query as Record<string, unknown> | undefined;
    if (
      query &&
      'token' in query &&
      query.token !== undefined &&
      (typeof query.token !== 'string' || query.token.length > 0)
    ) {
      throw new Error('Token transport via URL query parameters is forbidden for security');
    }

    // 2. Extract token strictly from handshake auth object or Authorization header
    const authHeader = socket.handshake.headers?.authorization;
    const rawToken =
      (typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : undefined) ||
      (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : undefined);

    const token = rawToken?.trim();
    if (!token) {
      throw new Error('No token provided');
    }

    // 3. Verify server secret configuration
    const secret =
      typeof this.configService?.getOrThrow === 'function'
        ? this.configService.getOrThrow<string>('JWT_SECRET')
        : this.configService?.get<string>('JWT_SECRET');
    if (!secret) {
      this.logger.error('JWT_SECRET is not configured for WebSocket gateway');
      throw new Error('Server misconfiguration');
    }

    // 4. Verify token signature, expiration, and payload
    const payload = this.jwtService.verify<{
      sub?: string;
      id?: string;
      role?: string;
      email?: string;
    }>(token, { secret });

    // 5. Validate user identity from payload (sub or id fallback)
    const userId = payload.sub || payload.id;
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid token payload');
    }

    // 6. Enforce strict role claim (ZERO default role fallback)
    const role = payload.role;
    if (!role || typeof role !== 'string' || role.trim().length === 0) {
      throw new Error('Missing role in token payload');
    }

    return {
      userId: userId.trim(),
      role: role.trim(),
      email: typeof payload.email === 'string' ? payload.email.trim() : undefined,
    };
  }

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const socketData = this.authenticateSocket(socket);
        socket.data = socketData;
        next();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return next(new Error(`Authentication error: ${message}`));
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      const existingData = client.data as AuthenticatedSocketData | undefined;
      let data: AuthenticatedSocketData;

      if (existingData?.userId && existingData?.role) {
        data = existingData;
      } else {
        data = this.authenticateSocket(client);
        client.data = data;
      }

      // Join user specific room and role room
      await client.join(`user:${data.userId}`);
      await client.join(`role:${data.role}`);

      this.logger.log(
        `Socket client ${client.id} connected: user=${data.userId}, role=${data.role}, joined [user:${data.userId}, role:${data.role}]`,
      );

      client.emit('connected', {
        status: 'ready',
        userId: data.userId,
        role: data.role,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Socket client ${client.id} authentication failed: ${message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket client ${client.id} disconnected.`);
  }

  /**
   * Gracefully drain WebSocket connections when application is shutting down.
   * Broadcasts shutdown event, disconnects all active sockets, and closes the server cleanly.
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.server) {
      return;
    }

    this.logger.log('Gracefully draining WebSocket connections for module destruction...');

    // 1. Broadcast shutdown notification to all connected clients
    try {
      this.server.emit('server_shutdown', {
        message: 'Server is shutting down. Please reconnect shortly.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to broadcast server_shutdown event: ${message}`);
    }

    // 2. Fetch and disconnect all active socket instances
    try {
      if (typeof this.server.fetchSockets === 'function') {
        const sockets = await this.server.fetchSockets();
        for (const socket of sockets) {
          socket.disconnect(true);
        }
        this.logger.log(`Disconnected ${sockets.length} active WebSocket socket(s).`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error draining active WebSocket sockets: ${message}`);
    }

    // 3. Close the underlying Socket.io server
    try {
      if (typeof this.server.close === 'function') {
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              this.logger.log('WebSocket server closed cleanly.');
              resolve();
            }
          };

          const closeResult = this.server.close(done) as unknown;
          if (closeResult && typeof (closeResult as Promise<unknown>).then === 'function') {
            (closeResult as Promise<unknown>).then(done, done);
          }

          // Guard against hanging shutdown in unhandled environments
          setTimeout(done, 5000).unref?.();
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error closing WebSocket server: ${message}`);
    }
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

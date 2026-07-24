import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { getRedisClient } from '../config/redis.config';
import { sanitizeChatText } from './chat-sanitize';
import { UsersService } from '../users/users.service';

type AuthedSocket = Socket & {
  data: {
    userId?: string;
    displayName?: string;
  };
};

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      '*',
    ],
    credentials: true,
  },
  path: '/socket.io',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  /** Simple per-socket message throttle (messages per 10s). */
  private readonly msgBuckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'JWT required for chat' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email?: string }>(token, {
        secret: process.env.JWT_SECRET ?? 'dev_access_secret',
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid user' });
        client.disconnect(true);
        return;
      }
      client.data.userId = user.id;
      client.data.displayName = user.displayName;
      client.join(`user:${user.id}`);
    } catch (err) {
      this.logger.warn(`socket auth failed: ${err instanceof Error ? err.message : err}`);
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      client.disconnect(true);
      return;
    }

    try {
      const redis = await getRedisClient();
      await redis.sAdd('presence:global', client.id);
      this.server.emit('presence', {
        onlineCount: await redis.sCard('presence:global'),
      });
    } catch {
      /* redis optional for presence */
    }

    client.emit('authenticated', {
      userId: client.data.userId,
      displayName: client.data.displayName,
    });
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    this.msgBuckets.delete(client.id);
    try {
      const redis = await getRedisClient();
      await redis.sRem('presence:global', client.id);
      this.server.emit('presence', {
        onlineCount: await redis.sCard('presence:global'),
      });
    } catch {
      /* ignore */
    }
  }

  @SubscribeMessage('message')
  async onMessage(
    @MessageBody() payload: { text: string; threadId?: string },
    @ConnectedSocket() client: AuthedSocket,
  ): Promise<void> {
    if (!client.data.userId) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }

    if (!this.allowMessage(client.id)) {
      client.emit('error', { code: 'RATE_LIMIT', message: 'Slow down' });
      return;
    }

    const text = sanitizeChatText(payload?.text ?? '');
    if (!text) return;

    this.server.emit('message', {
      sender: client.data.displayName ?? client.data.userId,
      senderId: client.data.userId,
      text,
      threadId: payload.threadId ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;
    const q = client.handshake.query?.token;
    if (typeof q === 'string' && q) return q;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return null;
  }

  private allowMessage(socketId: string): boolean {
    const now = Date.now();
    const windowMs = 10_000;
    const max = 20;
    let b = this.msgBuckets.get(socketId);
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + windowMs };
      this.msgBuckets.set(socketId, b);
    }
    b.count += 1;
    return b.count <= max;
  }
}

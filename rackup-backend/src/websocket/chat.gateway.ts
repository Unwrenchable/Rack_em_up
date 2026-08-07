import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
import { SocialRealtimeService } from './social-realtime.service';
import { ChatService } from '../chat/chat.service';
import { FriendsService } from '../friends/friends.service';
import { realaiModerate } from '../ai/realai-coach.client';

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
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly msgBuckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly realtime: SocialRealtimeService,
    private readonly chat: ChatService,
    private readonly friends: FriendsService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.setServer(server);
    this.logger.log('Social realtime server registered');
  }

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
      await this.realtime.setUserOnline(user.id, client.id);

      // Notify friends they came online
      const friendIds = await this.friends.getAcceptedFriendIds(user.id);
      for (const fid of friendIds) {
        this.realtime.emitToUser(fid, 'friend:presence', {
          userId: user.id,
          online: true,
          displayName: user.displayName,
        });
      }
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
      /* redis optional */
    }

    client.emit('authenticated', {
      userId: client.data.userId,
      displayName: client.data.displayName,
    });
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    this.msgBuckets.delete(client.id);
    const userId = client.data.userId;
    if (userId) {
      await this.realtime.setUserOffline(userId, client.id);
      const stillOn = await this.realtime.isOnline(userId);
      if (!stillOn) {
        const friendIds = await this.friends.getAcceptedFriendIds(userId);
        for (const fid of friendIds) {
          this.realtime.emitToUser(fid, 'friend:presence', {
            userId,
            online: false,
          });
        }
      }
    }
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

  /** Legacy lobby broadcast (kept for ChatPage) */
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

    // Prefer persistent thread if threadId provided
    if (payload?.threadId) {
      try {
        const msg = await this.chat.sendText(
          client.data.userId,
          payload.threadId,
          payload.text ?? '',
        );
        client.emit('thread:message_ack', msg);
      } catch (e) {
        client.emit('error', {
          code: 'THREAD_SEND_FAILED',
          message: e instanceof Error ? e.message : 'send failed',
        });
      }
      return;
    }

    const text = sanitizeChatText(payload?.text ?? '');
    if (!text) return;

    // RealAI moderation before lobby broadcast (contract §4.4)
    const mod = await realaiModerate({
      player: {
        player_id: client.data.userId,
        display_name: client.data.displayName,
      },
      text,
      context: { channel: 'global_chat' },
    });
    if (mod.action === 'block_and_escalate' || mod.action === 'hold_for_review') {
      client.emit('error', {
        code: 'MODERATION_BLOCK',
        message: mod.guidance ?? 'Message held by moderation',
        action: mod.action,
      });
      return;
    }

    this.server.emit('message', {
      sender: client.data.displayName ?? client.data.userId,
      senderId: client.data.userId,
      text,
      threadId: null,
      moderation: { action: mod.action, severity: mod.severity },
      createdAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join_thread')
  async onJoinThread(
    @MessageBody() body: { threadId?: string },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (!client.data.userId || !body?.threadId) {
      return { ok: false };
    }
    try {
      await this.chat.assertMember(client.data.userId, body.threadId);
      await client.join(`thread:${body.threadId}`);
      return { ok: true, threadId: body.threadId };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('leave_thread')
  async onLeaveThread(
    @MessageBody() body: { threadId?: string },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (body?.threadId) await client.leave(`thread:${body.threadId}`);
    return { ok: true };
  }

  @SubscribeMessage('thread_message')
  async onThreadMessage(
    @MessageBody()
    body: {
      threadId?: string;
      type?: string;
      body?: string;
      payload?: Record<string, unknown>;
    },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (!client.data.userId || !body?.threadId) {
      client.emit('error', { code: 'BAD_REQUEST', message: 'threadId required' });
      return;
    }
    if (!this.allowMessage(client.id)) {
      client.emit('error', { code: 'RATE_LIMIT', message: 'Slow down' });
      return;
    }
    try {
      const type = (body.type as any) ?? 'TEXT';
      if (type === 'TEXT') {
        const msg = await this.chat.sendText(client.data.userId, body.threadId, body.body ?? '');
        return msg;
      }
      return await this.chat.send(
        client.data.userId,
        body.threadId,
        type,
        body.body ?? null,
        body.payload ?? null,
      );
    } catch (e) {
      client.emit('error', {
        code: 'THREAD_SEND_FAILED',
        message: e instanceof Error ? e.message : 'send failed',
      });
    }
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

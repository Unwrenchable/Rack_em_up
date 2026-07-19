import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getRedisClient } from '../config/redis.config';
import { sanitizeChatText } from './chat-sanitize';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
})

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket): Promise<void> {
    const redis = await getRedisClient();
    await redis.sAdd('presence:global', client.id);
    this.server.emit('presence', {
      onlineCount: await redis.sCard('presence:global'),
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const redis = await getRedisClient();
    await redis.sRem('presence:global', client.id);
    this.server.emit('presence', {
      onlineCount: await redis.sCard('presence:global'),
    });
  }

  @SubscribeMessage('message')
  async onMessage(
    @MessageBody() payload: { text: string; threadId?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const text = sanitizeChatText(payload.text);
    if (!text) {
      return;
    }

    this.server.emit('message', {
      sender: client.id,
      text,
      threadId: payload.threadId ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}

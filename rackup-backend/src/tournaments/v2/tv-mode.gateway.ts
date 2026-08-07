import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * TV / spectator board for tournaments.
 * Clients: socket.emit('join_tv', { tournamentId })
 * Events: tournament_tv (full snapshot), score_update (incremental)
 */
@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/tv',
})
export class TvModeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(TvModeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`TV client connected ${client.id}`);
  }

  @SubscribeMessage('join_tv')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tournamentId?: string },
  ) {
    const id = body?.tournamentId;
    if (!id) return { ok: false, error: 'tournamentId required' };
    const room = this.room(id);
    void client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('leave_tv')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tournamentId?: string },
  ) {
    const id = body?.tournamentId;
    if (id) void client.leave(this.room(id));
    return { ok: true };
  }

  /** Broadcast full TV payload for a tournament (/tv namespace). */
  emitTvSnapshot(tournamentId: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.room(tournamentId)).emit('tournament_tv', payload);
  }

  emitScore(tournamentId: string, score: unknown) {
    if (!this.server) return;
    this.server.to(this.room(tournamentId)).emit('score_update', score);
  }

  private room(tournamentId: string): string {
    return `tv:tournament:${tournamentId}`;
  }
}

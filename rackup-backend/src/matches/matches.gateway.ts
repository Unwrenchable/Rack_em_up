import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { ScoreUpdateEvent } from '../scorekeeping/scorekeeping.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/socket.io',
})
export class MatchesGateway {
  @WebSocketServer()
  server!: Server;

  emitMatchCreated(match: any) {
    this.server
      .to(match.playerAId)
      .to(match.playerBId)
      .emit('match_created', match);
  }

  emitMatchStarted(match: any) {
    this.server
      .to(match.playerAId)
      .to(match.playerBId)
      .emit('match_started', match);
  }

  emitMatchCancelled(match: any) {
    this.server
      .to(match.playerAId)
      .to(match.playerBId)
      .emit('match_cancelled', match);
  }

  emitMatchCompleted(match: any) {
    this.server
      .to(match.playerAId)
      .to(match.playerBId)
      .emit('match_completed', match);
  }

  /**
   * Live score / report event for UI (no full poll required).
   * Rooms: player ids, match id, parent entity (tournament/season).
   */
  emitScoreUpdate(event: ScoreUpdateEvent) {
    if (!this.server) return;

    const payload = {
      type: 'score_update',
      ...event,
    };

    const rooms = new Set<string>();
    if (event.playerAId) rooms.add(event.playerAId);
    if (event.playerBId) rooms.add(event.playerBId);
    if (event.matchId) rooms.add(`match:${event.matchId}`);
    if (event.entityId) rooms.add(`entity:${event.entityId}`);
    if (event.domain === 'tournament_v2' && event.entityId) {
      rooms.add(`tournament:${event.entityId}`);
    }
    if (event.domain === 'league_v2' && event.entityId) {
      rooms.add(`league:${event.entityId}`);
    }

    for (const room of rooms) {
      this.server.to(room).emit('score_update', payload);
    }
    // Broadcast for simple clients that only listen globally
    this.server.emit('score_update', payload);
  }
}

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MatchesGateway {
  @WebSocketServer()
  server: Server;

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
}

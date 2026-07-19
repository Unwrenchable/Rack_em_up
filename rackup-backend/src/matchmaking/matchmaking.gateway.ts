import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MatchmakingGateway {
  @WebSocketServer()
  server!: Server;


  emitMatchFound(userId: string, payload: any) {
    this.server.to(userId).emit('match_found', payload);
  }

  emitRequestCreated(userId: string, payload: any) {
    this.server.to(userId).emit('matchmaking_request_created', payload);
  }

  emitRequestCancelled(userId: string, payload: any) {
    this.server.to(userId).emit('matchmaking_request_cancelled', payload);
  }

  @SubscribeMessage('join_user_room')
  handleJoinRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.userId);
    return { joined: data.userId };
  }
}

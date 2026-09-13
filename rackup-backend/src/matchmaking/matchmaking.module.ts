import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchmakingRequest } from './matchmaking.entity';
import { MatchmakingRequestV2 } from './v2/entities/matchmaking-request-v2.entity';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { MatchesModule } from '../matches/matches.module';
import { MatchmakingGateway } from './matchmaking.gateway';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchmakingRequest, MatchmakingRequestV2]),
    MatchesModule,
    ChatModule,
    UsersModule,
  ],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService,
    MatchmakingGateway,
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}

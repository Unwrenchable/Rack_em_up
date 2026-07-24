import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchmakingRequest } from './matchmaking.entity';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { MatchesModule } from '../matches/matches.module';
import { MatchmakingGateway } from './matchmaking.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchmakingRequest]),
    MatchesModule,
  ],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService,
    MatchmakingGateway,
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}

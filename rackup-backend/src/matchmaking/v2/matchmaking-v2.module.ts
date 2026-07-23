import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchmakingRequestV2 } from './entities/matchmaking-request-v2.entity';
import { MatchmakingSessionV2 } from './entities/matchmaking-session-v2.entity';
import { MatchmakingV2Controller } from './matchmaking-v2.controller';
import { MatchmakingV2Service } from './matchmaking-v2.service';
import { MatchesModule } from '../../matches/matches.module';
import { User } from '../../users/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchmakingRequestV2, MatchmakingSessionV2, User]),
    MatchesModule,
  ],
  controllers: [MatchmakingV2Controller],
  providers: [MatchmakingV2Service],
  exports: [MatchmakingV2Service],
})
export class MatchmakingV2Module {}



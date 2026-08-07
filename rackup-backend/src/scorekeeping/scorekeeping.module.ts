import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScorekeepingService } from './scorekeeping.service';
import { ScorekeepingServiceV2 } from './scorekeeping-v2.service';
import { MatchTimelineService } from './match-timeline.service';
import { MatchTimelineEntity } from './match-timeline.entity';
import { ScorekeepingController } from './scorekeeping.controller';
import { GameRulesService } from './game-rules.service';
import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';
import { RealaiV2Module } from '../realai/v2/realai-v2.module';
import { MatchesModule } from '../matches/matches.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([MatchTimelineEntity]),
    MemoriesModule,
    UsersModule,
    RealaiV2Module,
    forwardRef(() => MatchesModule),
  ],
  controllers: [ScorekeepingController],
  providers: [
    ScorekeepingService,
    ScorekeepingServiceV2,
    MatchTimelineService,
    GameRulesService,
  ],
  exports: [
    ScorekeepingService,
    ScorekeepingServiceV2,
    MatchTimelineService,
    GameRulesService,
  ],
})
export class ScorekeepingModule {}

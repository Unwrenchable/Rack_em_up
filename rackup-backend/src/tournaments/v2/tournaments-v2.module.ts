import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TournamentsV2Controller } from './tournaments-v2.controller';
import { TournamentsV2Service } from './tournaments-v2.service';
import { BracketGenerationService } from './bracket-generation.service';
import { TvModeGateway } from './tv-mode.gateway';

import { TournamentV2 } from './entities/tournament-v2.entity';
import { TournamentMatchV2 } from './entities/tournament-match-v2.entity';
import { BracketNode } from './entities/bracket-node.entity';
import { BracketRound } from './entities/bracket-round.entity';
import { User } from '../../users/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TournamentV2,
      TournamentMatchV2,
      BracketNode,
      BracketRound,
      User,
    ]),
  ],
  controllers: [TournamentsV2Controller],
  providers: [TournamentsV2Service, BracketGenerationService, TvModeGateway],
  exports: [TournamentsV2Service, TvModeGateway],
})
export class TournamentsV2Module {}

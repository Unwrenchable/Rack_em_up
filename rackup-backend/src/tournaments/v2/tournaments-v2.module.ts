import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TournamentsV2Controller } from './tournaments-v2.controller';
import { TournamentsV2Service } from './tournaments-v2.service';
import { BracketGenerationService } from './bracket-generation.service';

import { TournamentV2 } from './entities/tournament-v2.entity';
import { TournamentMatchV2 } from './entities/tournament-match-v2.entity';
import { BracketNode } from './entities/bracket-node.entity';
import { BracketRound } from './entities/bracket-round.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentV2, TournamentMatchV2, BracketNode, BracketRound]),
  ],
  controllers: [TournamentsV2Controller],
  providers: [TournamentsV2Service, BracketGenerationService],
  exports: [TournamentsV2Service],
})
export class TournamentsV2Module {}


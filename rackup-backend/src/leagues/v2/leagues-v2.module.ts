import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeaguesV2Controller } from './leagues-v2.controller';
import { LeaguesV2Service } from './leagues-v2.service';

import { LeagueSeason } from './entities/league-season.entity';
import { LeagueStanding } from './entities/league-standing.entity';
import { LeagueScheduledMatch } from './entities/league-scheduled-match.entity';
import { ExternalRatingSource } from './entities/external-rating-source.entity';
import { PlayerExternalRating } from './entities/player-external-rating.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeagueSeason,
      LeagueStanding,
      LeagueScheduledMatch,
      ExternalRatingSource,
      PlayerExternalRating,
    ]),
  ],
  controllers: [LeaguesV2Controller],
  providers: [LeaguesV2Service],
  exports: [LeaguesV2Service],
})
export class LeaguesV2Module {}

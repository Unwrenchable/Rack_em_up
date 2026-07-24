import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { Tournament } from './tournaments.entity';
import { TournamentMatch } from './tournament_matches.entity';
import { TournamentRegistration } from './tournament_registrations.entity';
import { TournamentRepository } from './repositories/tournament.repository';
import { TournamentMatchRepository } from './repositories/tournament-match.repository';

import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentMatch,
      TournamentRegistration,
    ]),
    MemoriesModule,
    UsersModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentRepository, TournamentMatchRepository],
  exports: [TournamentsService],
})
export class TournamentsModule {}

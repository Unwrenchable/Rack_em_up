import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './tournaments.entity';
import { TournamentMatch } from './tournament_matches.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, TournamentMatch]),
    MemoriesModule,
    UsersModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}

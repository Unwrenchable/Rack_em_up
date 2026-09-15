import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { LeaderboardController } from './leaderboard.controller';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { RatingService } from './rating.service';
import { StatsService } from './stats.service';
import { PoolMatch } from '../matches/pool-match.entity';
import { RatingsModule } from '../ratings/ratings.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, PoolMatch]), RatingsModule],
  providers: [UsersService, RatingService, StatsService],
  controllers: [UsersController, LeaderboardController],
  exports: [UsersService, RatingService, StatsService],
})
export class UsersModule {}

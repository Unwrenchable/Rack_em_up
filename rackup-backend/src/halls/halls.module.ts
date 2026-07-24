import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hall } from './hall.entity';
import { HallCheckin } from './hall-checkin.entity';
import { HallsController } from './halls.controller';
import { HallsService } from './halls.service';
import { User } from '../users/users.entity';
import { MoneyMatch } from '../money-matches/money-matches.entity';
import { PoolMatch } from '../matches/pool-match.entity';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hall, HallCheckin, User, MoneyMatch, PoolMatch]),
  ],
  controllers: [HallsController],
  providers: [HallsService, RolesGuard],
  exports: [HallsService],
})
export class HallsModule {}
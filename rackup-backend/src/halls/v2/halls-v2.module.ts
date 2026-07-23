import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HallCheckIn } from './entities/hall-checkin.entity';
import { HallEvent } from './entities/hall-event.entity';
import { HallPhoto } from './entities/hall-photo.entity';
import { HallAdmin } from './entities/hall-admin.entity';
import { HallLeaderboardEntry } from './entities/hall-leaderboard-entry.entity';

import { HallsV2Controller } from './halls-v2.controller';
import { HallsV2Service } from './halls-v2.service';
import { HallSeedService } from './seed/hall-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([HallCheckIn, HallEvent, HallPhoto, HallAdmin, HallLeaderboardEntry])],
  controllers: [HallsV2Controller],
  providers: [HallsV2Service, HallSeedService],
  exports: [HallsV2Service],
})
export class HallsV2Module {}


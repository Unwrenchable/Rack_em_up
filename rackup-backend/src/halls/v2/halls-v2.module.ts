import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Hall } from '../hall.entity'; // ← add this
import { HallCheckIn } from './entities/hall-checkin.entity';
import { HallEvent } from './entities/hall-event.entity';
import { HallPhoto } from './entities/hall-photo.entity';
import { HallAdmin } from './entities/hall-admin.entity';
import { HallLeaderboardEntry } from './entities/hall-leaderboard-entry.entity';

import { HallsV2Controller } from './halls-v2.controller';
import { HallsV2Service } from './halls-v2.service';
import { HallSeedService } from './seed/hall-seed.service';
import { ShotsModule } from '../../shots/shots.module';
import { HallPhotoStorageService } from './hall-photo-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hall,
      HallCheckIn,
      HallEvent,
      HallPhoto,
      HallAdmin,
      HallLeaderboardEntry,
    ]),
    ShotsModule,
  ],
  controllers: [HallsV2Controller],
  providers: [HallsV2Service, HallSeedService, HallPhotoStorageService],
  exports: [HallsV2Service],
})
export class HallsV2Module {}


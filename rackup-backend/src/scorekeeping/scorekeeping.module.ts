import { Global, Module } from '@nestjs/common';
import { ScorekeepingService } from './scorekeeping.service';

@Global()
@Module({
  providers: [ScorekeepingService],
  exports: [ScorekeepingService],
})
export class ScorekeepingModule {}

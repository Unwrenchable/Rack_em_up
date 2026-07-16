import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingRequest } from './matchmaking.entity';
import { MatchmakingService } from './matchmaking.service';

@Module({
  imports: [TypeOrmModule.forFeature([MatchmakingRequest, User])],
  controllers: [MatchmakingController],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}

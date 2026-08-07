import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolMatch } from './pool-match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchesGateway } from './matches.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([PoolMatch])],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesGateway],
  exports: [MatchesService, MatchesGateway],
})
export class MatchesModule {}

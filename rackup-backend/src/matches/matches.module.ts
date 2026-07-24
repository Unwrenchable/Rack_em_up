import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolMatch } from './pool-match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';
import { MatchesGateway } from './matches.gateway';
import { RealaiV2Module } from '../realai/v2/realai-v2.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PoolMatch]),
    MemoriesModule,
    UsersModule,
    RealaiV2Module,
  ],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    MatchesGateway,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}

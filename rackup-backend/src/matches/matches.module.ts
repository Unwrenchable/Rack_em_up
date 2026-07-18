import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolMatch } from './pool-match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';
import { MatchesGateway } from './matches.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([PoolMatch]),
    MemoriesModule,
    UsersModule,
  ],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    MatchesGateway,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}

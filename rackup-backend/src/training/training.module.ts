import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchMemory } from '../memories/match-memory.entity';
import { User } from '../users/users.entity';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [TypeOrmModule.forFeature([MatchMemory, User])],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
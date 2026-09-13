import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchMemory } from '../memories/match-memory.entity';
import { User } from '../users/users.entity';
import { ObjectStorageModule } from '../common/object-storage.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [TypeOrmModule.forFeature([MatchMemory, User]), ObjectStorageModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
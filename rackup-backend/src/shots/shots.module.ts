import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShotsController } from './shots.controller';
import { ShotsService } from './shots.service';
import { SotdCompletion } from './sotd-completion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SotdCompletion])],
  controllers: [ShotsController],
  providers: [ShotsService],
  exports: [ShotsService],
})
export class ShotsModule {}

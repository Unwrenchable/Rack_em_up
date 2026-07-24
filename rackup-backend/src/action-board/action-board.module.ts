import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionPost } from './action-post.entity';
import { ActionBoardController } from './action-board.controller';
import { ActionBoardService } from './action-board.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActionPost])],
  controllers: [ActionBoardController],
  providers: [ActionBoardService],
})
export class ActionBoardModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { RatingService } from './rating.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, RatingService],
  controllers: [UsersController],
  exports: [UsersService, RatingService, TypeOrmModule],
})
export class UsersModule {}

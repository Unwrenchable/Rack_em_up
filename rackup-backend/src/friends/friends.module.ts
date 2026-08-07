import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './friendship.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, User])],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}

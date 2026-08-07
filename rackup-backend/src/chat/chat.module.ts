import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatThread } from './entities/chat-thread.entity';
import { ChatThreadMember } from './entities/chat-thread-member.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { FriendsModule } from '../friends/friends.module';
import { User } from '../users/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatThread, ChatThreadMember, ChatMessage, User]),
    FriendsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

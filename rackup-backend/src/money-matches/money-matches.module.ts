import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoneyMatch } from './money-matches.entity';
import { MoneyMatchesController } from './money-matches.controller';
import { MoneyMatchesService } from './money-matches.service';
import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MoneyMatch]),
    MemoriesModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [MoneyMatchesController],
  providers: [MoneyMatchesService],
  exports: [MoneyMatchesService],
})
export class MoneyMatchesModule {}

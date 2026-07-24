import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoneyMatch } from './money-matches.entity';
import { MoneyMatchesController } from './money-matches.controller';
import { MoneyMatchesService } from './money-matches.service';
import { MemoriesModule } from '../memories/memories.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealaiV2Module } from '../realai/v2/realai-v2.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MoneyMatch]),
    MemoriesModule,
    UsersModule,
    NotificationsModule,
    RealaiV2Module,
  ],
  controllers: [MoneyMatchesController],
  providers: [MoneyMatchesService],
  exports: [MoneyMatchesService],
})
export class MoneyMatchesModule {}

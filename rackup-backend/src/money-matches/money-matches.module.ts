import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoneyMatch } from './money-matches.entity';
import { MoneyMatchAudit } from './money-match-audit.entity';
import { MoneyMatchesController } from './money-matches.controller';
import { MoneyMatchesService } from './money-matches.service';
import { EscrowService } from './escrow.service';
import { MoneyAuditService } from './money-audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MoneyMatch, MoneyMatchAudit, User]),
    NotificationsModule,
  ],
  controllers: [MoneyMatchesController],
  providers: [MoneyMatchesService, EscrowService, MoneyAuditService],
  exports: [MoneyMatchesService, EscrowService, MoneyAuditService],
})
export class MoneyMatchesModule {}


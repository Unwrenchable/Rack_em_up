import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RocLeague } from './entities/roc-league.entity';
import { RocSession } from './entities/roc-session.entity';
import { RocEntry } from './entities/roc-entry.entity';
import { RocPayment } from './entities/roc-payment.entity';
import { RocLedgerAccount } from './entities/roc-ledger-account.entity';
import { RocLedgerEntry } from './entities/roc-ledger-entry.entity';
import { RocPayout } from './entities/roc-payout.entity';
import { RocPlayerBalance } from './entities/roc-player-balance.entity';
import { RocSessionStanding } from './entities/roc-session-standing.entity';
import { RocLedgerService } from './roc-ledger.service';
import { RocStripeService } from './roc-stripe.service';
import { RocPaymentService } from './roc-payment.service';
import { RocPayoutService } from './roc-payout.service';
import { RocBalanceService } from './roc-balance.service';
import { RocLeagueService } from './roc-league.service';
import { RocLedgerAuditService } from './roc-ledger-audit.service';
import { RocController } from './roc.controller';
import { RocWebhookController } from './roc-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RocLeague,
      RocSession,
      RocEntry,
      RocPayment,
      RocLedgerAccount,
      RocLedgerEntry,
      RocPayout,
      RocPlayerBalance,
      RocSessionStanding,
    ]),
  ],
  controllers: [RocController, RocWebhookController],
  providers: [
    RocLedgerService,
    RocStripeService,
    RocPaymentService,
    RocPayoutService,
    RocBalanceService,
    RocLeagueService,
    RocLedgerAuditService,
  ],
  exports: [
    RocLedgerService,
    RocPaymentService,
    RocPayoutService,
    RocBalanceService,
    RocLeagueService,
    RocLedgerAuditService,
  ],
})
export class RocModule {}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RocPlayerBalance,
  type RocPreferredPayoutMethod,
} from './entities/roc-player-balance.entity';
import { RocPayment } from './entities/roc-payment.entity';
import { RocPayout } from './entities/roc-payout.entity';
import { RocLedgerEntry } from './entities/roc-ledger-entry.entity';
import { cents, centsStr, formatUsd } from './roc-money.util';

@Injectable()
export class RocBalanceService {
  constructor(
    @InjectRepository(RocPlayerBalance)
    private readonly balances: Repository<RocPlayerBalance>,
    @InjectRepository(RocPayment)
    private readonly payments: Repository<RocPayment>,
    @InjectRepository(RocPayout)
    private readonly payouts: Repository<RocPayout>,
    @InjectRepository(RocLedgerEntry)
    private readonly ledger: Repository<RocLedgerEntry>,
  ) {}

  async getOrCreate(userId: string): Promise<RocPlayerBalance> {
    let row = await this.balances.findOne({ where: { userId } });
    if (!row) {
      row = await this.balances.save(
        this.balances.create({
          userId,
          availableUsdCents: '0',
          pendingUsdCents: '0',
          lifetimePaidOutUsdCents: '0',
          lifetimeEarnedUsdCents: '0',
          preferredPayoutMethod: 'stripe_bank',
          stripeCustomerId: null,
          stripeConnectAccountId: null,
          usdcWalletAddress: null,
        }),
      );
    }
    return row;
  }

  async creditAvailable(userId: string, amountUsdCents: number): Promise<RocPlayerBalance> {
    const row = await this.getOrCreate(userId);
    const amt = cents(amountUsdCents);
    row.availableUsdCents = centsStr(cents(row.availableUsdCents) + amt);
    row.lifetimeEarnedUsdCents = centsStr(cents(row.lifetimeEarnedUsdCents) + amt);
    return this.balances.save(row);
  }

  async setPending(userId: string, pendingUsdCents: number): Promise<RocPlayerBalance> {
    const row = await this.getOrCreate(userId);
    row.pendingUsdCents = centsStr(pendingUsdCents);
    return this.balances.save(row);
  }

  async recordExternalPaidOut(
    userId: string,
    amountUsdCents: number,
  ): Promise<RocPlayerBalance> {
    const row = await this.getOrCreate(userId);
    const amt = cents(amountUsdCents);
    row.availableUsdCents = centsStr(Math.max(0, cents(row.availableUsdCents) - amt));
    row.lifetimePaidOutUsdCents = centsStr(cents(row.lifetimePaidOutUsdCents) + amt);
    return this.balances.save(row);
  }

  async updatePreferences(
    userId: string,
    patch: {
      preferredPayoutMethod?: RocPreferredPayoutMethod;
      usdcWalletAddress?: string | null;
      stripeConnectAccountId?: string | null;
    },
  ): Promise<RocPlayerBalance> {
    const row = await this.getOrCreate(userId);
    if (patch.preferredPayoutMethod) {
      row.preferredPayoutMethod = patch.preferredPayoutMethod;
    }
    if (patch.usdcWalletAddress !== undefined) {
      row.usdcWalletAddress = patch.usdcWalletAddress;
    }
    if (patch.stripeConnectAccountId !== undefined) {
      row.stripeConnectAccountId = patch.stripeConnectAccountId;
    }
    return this.balances.save(row);
  }

  /**
   * Profile money block + transaction history (payments in, payouts out).
   */
  async profileMoney(userId: string) {
    const bal = await this.getOrCreate(userId);
    const [payIns, payOuts, ledgerBits] = await Promise.all([
      this.payments.find({
        where: { payerUserId: userId },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.payouts.find({
        where: { payeeUserId: userId },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.ledger.find({
        where: [{ payerUserId: userId }, { payeeUserId: userId }],
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);

    const history = [
      ...payIns.map((p) => ({
        id: p.id,
        kind: 'payment_in' as const,
        amountUsdCents: cents(p.amountUsdCents),
        amountUsd: formatUsd(p.amountUsdCents),
        method: p.method,
        status: p.status,
        sessionId: p.sessionId,
        entryId: p.entryId,
        rocLeagueId: p.rocLeagueId,
        stripeRef: p.stripePaymentIntentId,
        at: p.confirmedAt ?? p.createdAt,
      })),
      ...payOuts.map((p) => ({
        id: p.id,
        kind: 'payout_out' as const,
        amountUsdCents: cents(p.grossUsdCents),
        amountUsd: formatUsd(p.grossUsdCents),
        method: p.payoutRail,
        status: p.status,
        sessionId: p.sessionId,
        place: p.place,
        rocLeagueId: p.rocLeagueId,
        stripeRef: p.stripeTransferId,
        at: p.paidAt ?? p.createdAt,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      availableUsdCents: cents(bal.availableUsdCents),
      availableUsd: formatUsd(bal.availableUsdCents),
      pendingUsdCents: cents(bal.pendingUsdCents),
      pendingUsd: formatUsd(bal.pendingUsdCents),
      lifetimePaidOutUsdCents: cents(bal.lifetimePaidOutUsdCents),
      lifetimePaidOutUsd: formatUsd(bal.lifetimePaidOutUsdCents),
      lifetimeEarnedUsdCents: cents(bal.lifetimeEarnedUsdCents),
      lifetimeEarnedUsd: formatUsd(bal.lifetimeEarnedUsdCents),
      preferredPayoutMethod: bal.preferredPayoutMethod,
      usdcWalletAddress: bal.usdcWalletAddress,
      stripeConnectAccountId: bal.stripeConnectAccountId,
      currency: 'USD' as const,
      history,
      ledgerSample: ledgerBits.slice(0, 20).map((e) => ({
        id: e.id,
        type: e.entryType,
        direction: e.direction,
        amountUsd: formatUsd(e.amountUsdCents),
        status: e.status,
        sessionId: e.sessionId,
        memo: e.memo,
        method: e.method,
        at: e.createdAt,
      })),
    };
  }
}

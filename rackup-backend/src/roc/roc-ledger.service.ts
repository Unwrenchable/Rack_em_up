import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { RocLedgerAccount, type RocLedgerAccountKind } from './entities/roc-ledger-account.entity';
import {
  RocLedgerEntry,
  type RocLedgerEntryType,
  type RocLedgerStatus,
} from './entities/roc-ledger-entry.entity';
import type { RocSplitBps } from './entities/roc-league.entity';
import { cents, centsStr, splitAmountUsd } from './roc-money.util';

@Injectable()
export class RocLedgerService {
  private readonly logger = new Logger(RocLedgerService.name);

  constructor(
    @InjectRepository(RocLedgerAccount)
    private readonly accounts: Repository<RocLedgerAccount>,
    @InjectRepository(RocLedgerEntry)
    private readonly entries: Repository<RocLedgerEntry>,
  ) {}

  async ensureSystemAccounts(rocLeagueId: string): Promise<{
    playersFund: RocLedgerAccount;
    operator: RocLedgerAccount;
    platform: RocLedgerAccount;
    payoutClearing: RocLedgerAccount;
  }> {
    const kinds: Array<{ kind: RocLedgerAccountKind; name: string }> = [
      { kind: 'PLAYERS_FUND', name: 'Players Fund' },
      { kind: 'OPERATOR_REVENUE', name: 'ROC Operator' },
      { kind: 'PLATFORM_REVENUE', name: 'RackUp Platform' },
      { kind: 'PAYOUT_CLEARING', name: 'Payout Clearing' },
    ];
    const out: Record<string, RocLedgerAccount> = {};
    for (const k of kinds) {
      let acc = await this.accounts
        .createQueryBuilder('a')
        .where('a.roc_league_id = :lid', { lid: rocLeagueId })
        .andWhere('a.kind = :kind', { kind: k.kind })
        .andWhere('a.user_id IS NULL')
        .getOne();
      if (!acc) {
        acc = await this.accounts.save(
          this.accounts.create({
            rocLeagueId,
            kind: k.kind,
            name: k.name,
            userId: null,
            currency: 'USD',
            isSystem: true,
          }),
        );
      }
      out[k.kind] = acc;
    }
    return {
      playersFund: out.PLAYERS_FUND,
      operator: out.OPERATOR_REVENUE,
      platform: out.PLATFORM_REVENUE,
      payoutClearing: out.PAYOUT_CLEARING,
    };
  }

  async ensurePlayerWalletAccount(
    rocLeagueId: string,
    userId: string,
  ): Promise<RocLedgerAccount> {
    let acc = await this.accounts.findOne({
      where: { rocLeagueId, kind: 'PLAYER_WALLET', userId },
    });
    if (!acc) {
      acc = await this.accounts.save(
        this.accounts.create({
          rocLeagueId,
          kind: 'PLAYER_WALLET',
          name: `Player wallet ${userId.slice(0, 8)}`,
          userId,
          currency: 'USD',
          isSystem: false,
        }),
      );
    }
    return acc;
  }

  async accountBalanceCents(accountId: string): Promise<number> {
    const rows = await this.entries.find({ where: { accountId } });
    let bal = 0;
    for (const r of rows) {
      if (r.status === 'void' || r.status === 'refunded') continue;
      const a = cents(r.amountUsdCents);
      bal += r.direction === 'CREDIT' ? a : -a;
    }
    return bal;
  }

  private async post(entry: Partial<RocLedgerEntry>): Promise<RocLedgerEntry> {
    const existing = await this.entries.findOne({
      where: { idempotencyKey: entry.idempotencyKey! },
    });
    if (existing) return existing;

    const bal = await this.accountBalanceCents(entry.accountId!);
    const amt = cents(entry.amountUsdCents ?? 0);
    const after =
      entry.direction === 'CREDIT' ? bal + amt : bal - amt;

    return this.entries.save(
      this.entries.create({
        ...entry,
        amountUsdCents: centsStr(amt),
        balanceAfterCents: centsStr(after),
        status: (entry.status ?? 'confirmed') as RocLedgerStatus,
        createdBy: entry.createdBy ?? 'SYSTEM',
      } as RocLedgerEntry),
    );
  }

  /**
   * Webhook-only credit path: post 3-way split to Players Fund / Operator / Platform.
   * Single USD ledger — card and USDC both land here.
   */
  async creditPaymentSplit(input: {
    rocLeagueId: string;
    paymentId: string;
    amountUsdCents: number;
    split: RocSplitBps;
    payerUserId: string;
    sessionId?: string | null;
    entryId?: string | null;
    method: string;
    stripePaymentIntentId?: string | null;
    entryType?: RocLedgerEntryType;
  }): Promise<{
    groupId: string;
    players_fund_cents: number;
    operator_cents: number;
    platform_cents: number;
    entries: RocLedgerEntry[];
  }> {
    const accounts = await this.ensureSystemAccounts(input.rocLeagueId);
    const parts = splitAmountUsd(input.amountUsdCents, input.split);
    const groupId = randomUUID();
    const baseType = input.entryType ?? 'SESSION_ENTRY_IN';
    const method = input.method;
    const pi = input.stripePaymentIntentId ?? null;

    const lines: Array<{
      account: RocLedgerAccount;
      cents: number;
      type: RocLedgerEntryType;
      memo: string;
      key: string;
    }> = [
      {
        account: accounts.playersFund,
        cents: parts.players_fund_cents,
        type: 'SPLIT_PLAYERS_FUND',
        memo: `Players Fund 45% of ${input.amountUsdCents}¢ (${method})`,
        key: `pay:${input.paymentId}:pf`,
      },
      {
        account: accounts.operator,
        cents: parts.operator_cents,
        type: 'SPLIT_OPERATOR',
        memo: `ROC Operator 35% of ${input.amountUsdCents}¢ (${method})`,
        key: `pay:${input.paymentId}:op`,
      },
      {
        account: accounts.platform,
        cents: parts.platform_cents,
        type: 'SPLIT_PLATFORM',
        memo: `RackUp 20% of ${input.amountUsdCents}¢ (${method})`,
        key: `pay:${input.paymentId}:pl`,
      },
    ];

    const posted: RocLedgerEntry[] = [];
    for (const line of lines) {
      if (line.cents <= 0) continue;
      const e = await this.post({
        rocLeagueId: input.rocLeagueId,
        accountId: line.account.id,
        direction: 'CREDIT',
        amountUsdCents: centsStr(line.cents),
        entryType: line.type,
        status: 'confirmed',
        sessionId: input.sessionId ?? null,
        entryId: input.entryId ?? null,
        paymentId: input.paymentId,
        payerUserId: input.payerUserId,
        method,
        stripePaymentIntentId: pi,
        relatedGroupId: groupId,
        idempotencyKey: line.key,
        memo: line.memo,
        metadataJson: {
          base_entry_type: baseType,
          bps: parts.bps,
          amount_usd_cents: input.amountUsdCents,
        },
      });
      posted.push(e);
    }

    this.logger.log(
      `ledger credit payment=${input.paymentId} group=${groupId} ` +
        `pf=${parts.players_fund_cents} op=${parts.operator_cents} pl=${parts.platform_cents}`,
    );

    return {
      groupId,
      players_fund_cents: parts.players_fund_cents,
      operator_cents: parts.operator_cents,
      platform_cents: parts.platform_cents,
      entries: posted,
    };
  }

  async sessionPlayersFundCents(rocLeagueId: string, sessionId: string): Promise<number> {
    const accounts = await this.ensureSystemAccounts(rocLeagueId);
    const rows = await this.entries.find({
      where: {
        rocLeagueId,
        accountId: accounts.playersFund.id,
        sessionId,
      },
    });
    let bal = 0;
    for (const r of rows) {
      if (r.status === 'void' || r.status === 'refunded') continue;
      const a = cents(r.amountUsdCents);
      bal += r.direction === 'CREDIT' ? a : -a;
    }
    return Math.max(0, bal);
  }

  async moneyBar(rocLeagueId: string): Promise<{
    playersFundUsdCents: number;
    operatorUsdCents: number;
    platformUsdCents: number;
    currency: 'USD';
    splitDefault: RocSplitBps;
  }> {
    const accounts = await this.ensureSystemAccounts(rocLeagueId);
    const [pf, op, pl] = await Promise.all([
      this.accountBalanceCents(accounts.playersFund.id),
      this.accountBalanceCents(accounts.operator.id),
      this.accountBalanceCents(accounts.platform.id),
    ]);
    return {
      playersFundUsdCents: pf,
      operatorUsdCents: op,
      platformUsdCents: pl,
      currency: 'USD',
      splitDefault: {
        players_fund_bps: 4500,
        operator_bps: 3500,
        platform_bps: 2000,
      },
    };
  }

  async listEntries(
    rocLeagueId: string,
    filter?: { sessionId?: string; limit?: number },
  ): Promise<RocLedgerEntry[]> {
    const qb = this.entries
      .createQueryBuilder('e')
      .where('e.roc_league_id = :lid', { lid: rocLeagueId })
      .orderBy('e.created_at', 'DESC')
      .take(Math.min(200, filter?.limit ?? 100));
    if (filter?.sessionId) {
      qb.andWhere('e.session_id = :sid', { sid: filter.sessionId });
    }
    return qb.getMany();
  }

  async debitPlayersFundForPayout(input: {
    rocLeagueId: string;
    sessionId: string;
    payoutId: string;
    amountUsdCents: number;
    payeeUserId: string;
    method: string;
    transferId?: string | null;
  }): Promise<RocLedgerEntry> {
    const accounts = await this.ensureSystemAccounts(input.rocLeagueId);
    const amt = cents(input.amountUsdCents);
    return this.post({
      rocLeagueId: input.rocLeagueId,
      accountId: accounts.playersFund.id,
      direction: 'DEBIT',
      amountUsdCents: centsStr(amt),
      entryType: 'PAYOUT_OUT',
      status: 'paid',
      sessionId: input.sessionId,
      payoutId: input.payoutId,
      payeeUserId: input.payeeUserId,
      method: input.method,
      stripeTransferId: input.transferId ?? null,
      idempotencyKey: `payout:${input.payoutId}:pf_debit`,
      memo: `Session payout to player ${input.payeeUserId.slice(0, 8)}`,
    });
  }

  async creditPlayerWallet(input: {
    rocLeagueId: string;
    sessionId: string;
    payoutId: string;
    amountUsdCents: number;
    payeeUserId: string;
    method: string;
    transferId?: string | null;
  }): Promise<RocLedgerEntry> {
    const wallet = await this.ensurePlayerWalletAccount(
      input.rocLeagueId,
      input.payeeUserId,
    );
    const amt = cents(input.amountUsdCents);
    return this.post({
      rocLeagueId: input.rocLeagueId,
      accountId: wallet.id,
      direction: 'CREDIT',
      amountUsdCents: centsStr(amt),
      entryType: 'PAYOUT_TO_WALLET',
      status: 'paid',
      sessionId: input.sessionId,
      payoutId: input.payoutId,
      payeeUserId: input.payeeUserId,
      method: input.method,
      stripeTransferId: input.transferId ?? null,
      idempotencyKey: `payout:${input.payoutId}:wallet`,
      memo: `Winnings credited to profile wallet`,
    });
  }

  async requireLeagueAccounts(rocLeagueId: string) {
    const acc = await this.ensureSystemAccounts(rocLeagueId);
    if (!acc.playersFund) throw new NotFoundException('Ledger not initialized');
    return acc;
  }
}

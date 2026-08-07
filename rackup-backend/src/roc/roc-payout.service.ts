import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RocSession, type RocPayoutStructure } from './entities/roc-session.entity';
import { RocPayout } from './entities/roc-payout.entity';
import { RocSessionStanding } from './entities/roc-session-standing.entity';
import { RocLedgerService } from './roc-ledger.service';
import { RocBalanceService } from './roc-balance.service';
import { RocStripeService } from './roc-stripe.service';
import { RocLedgerAuditService } from './roc-ledger-audit.service';
import { cents, centsStr, formatUsd } from './roc-money.util';

const DEFAULT_PAYOUT_STRUCTURE: RocPayoutStructure = {
  mode: 'PERCENT_OF_FUND',
  places: [
    { place: 1, bps: 5000 },
    { place: 2, bps: 3000 },
    { place: 3, bps: 2000 },
  ],
  shortfall_policy: 'SCALE',
};

/**
 * End-of-session automatic payout.
 * Ledger-driven; ratings/Glicko never touch this path.
 */
@Injectable()
export class RocPayoutService {
  private readonly logger = new Logger(RocPayoutService.name);

  constructor(
    @InjectRepository(RocSession)
    private readonly sessions: Repository<RocSession>,
    @InjectRepository(RocPayout)
    private readonly payouts: Repository<RocPayout>,
    @InjectRepository(RocSessionStanding)
    private readonly standings: Repository<RocSessionStanding>,
    private readonly ledger: RocLedgerService,
    private readonly balances: RocBalanceService,
    private readonly stripe: RocStripeService,
    private readonly audit: RocLedgerAuditService,
  ) {}

  async projections(sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const fund = await this.ledger.sessionPlayersFundCents(
      session.rocLeagueId,
      sessionId,
    );
    const structure =
      session.payoutStructureSnapshot ?? DEFAULT_PAYOUT_STRUCTURE;
    const rows = await this.standings.find({
      where: { sessionId },
      order: { points: 'DESC', wins: 'DESC' },
    });

    const places = this.computePlaceAmounts(fund, structure);
    const projected = places.map((p) => {
      const standing = rows.find((r) => r.place === p.place) ?? rows[p.place - 1];
      return {
        place: p.place,
        amountUsdCents: p.amountUsdCents,
        amountUsd: formatUsd(p.amountUsdCents),
        userId: standing?.userId ?? null,
        status: session.status === 'CLOSED' ? 'final' : 'projected',
      };
    });

    return {
      sessionId,
      status: session.status,
      playersFundUsdCents: fund,
      playersFundUsd: formatUsd(fund),
      currency: 'USD',
      split: session.splitSnapshot,
      projected,
    };
  }

  /**
   * Auto payout job at session close.
   * 1 freeze standings
   * 2 RealAI ledger_audit + payout_sanity (read-only gate)
   * 3 if blockers → AUDIT_HOLD (no money moved)
   * 4 if warnings → require operator override unless acknowledgeWarnings
   * 5 if pass (or override) → execute transfers + ledger + balances
   *
   * Profile winnings only change after successful payout execution (step 5).
   */
  async closeSessionAndPayout(input: {
    sessionId: string;
    actorUserId: string;
    force?: boolean;
    /** Operator acknowledged RealAI warnings and releases payout */
    acknowledgeWarnings?: boolean;
    overrideNote?: string;
    /** Skip re-audit and use last stored result (only with acknowledge/force) */
    skipReaudit?: boolean;
  }) {
    const session = await this.sessions.findOne({ where: { id: input.sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'CLOSED') {
      return { ok: true, alreadyClosed: true, sessionId: session.id };
    }
    if (session.status === 'PAYING_OUT' && !input.force) {
      throw new BadRequestException('Payout already in progress');
    }

    // ── RealAI audit gate (never authorizes money; RackUp decides) ─────────
    let auditBundle =
      input.skipReaudit && session.auditResultJson
        ? null
        : await this.audit.runSessionAudit(session.id);

    // Reload after audit write
    const sessionAfter = await this.sessions.findOne({
      where: { id: input.sessionId },
    });
    if (!sessionAfter) throw new NotFoundException('Session not found');

    const uiStatus = auditBundle?.uiStatus ?? sessionAfter.auditStatus ?? 'none';
    const plain =
      auditBundle?.plain_language ??
      ((sessionAfter.auditResultJson?.plain_language as string[]) ?? []);

    if (uiStatus === 'blocked') {
      sessionAfter.status = 'AUDIT_HOLD';
      await this.sessions.save(sessionAfter);
      return {
        ok: false,
        held: true,
        reason: 'audit_blocked',
        sessionId: sessionAfter.id,
        status: sessionAfter.status,
        audit: this.audit.getStoredAudit(sessionAfter),
        plain_language: plain,
        message:
          'RealAI ledger audit found blockers. Payout held. Investigate and re-run audit. RealAI never moves money.',
      };
    }

    if (uiStatus === 'warnings' && !input.acknowledgeWarnings && !sessionAfter.auditOperatorOverride) {
      sessionAfter.status = 'AUDIT_HOLD';
      await this.sessions.save(sessionAfter);
      return {
        ok: false,
        held: true,
        reason: 'audit_warnings',
        sessionId: sessionAfter.id,
        status: sessionAfter.status,
        audit: this.audit.getStoredAudit(sessionAfter),
        plain_language: plain,
        message:
          'RealAI audit returned warnings. Operator must confirm release (acknowledgeWarnings) before payout.',
      };
    }

    if (input.acknowledgeWarnings && uiStatus === 'warnings') {
      sessionAfter.auditOperatorOverride = true;
      sessionAfter.auditOverrideBy = input.actorUserId;
      sessionAfter.auditOverrideNote =
        input.overrideNote ?? 'Operator acknowledged audit warnings';
      await this.sessions.save(sessionAfter);
    }

    sessionAfter.status = 'PAYING_OUT';
    await this.sessions.save(sessionAfter);

    // Assign places from points if missing
    const rows = await this.standings.find({
      where: { sessionId: sessionAfter.id },
      order: { points: 'DESC', wins: 'DESC' },
    });
    rows.forEach((r, i) => {
      if (r.place == null) r.place = i + 1;
    });
    await this.standings.save(rows);

    const fund = await this.ledger.sessionPlayersFundCents(
      sessionAfter.rocLeagueId,
      sessionAfter.id,
    );
    const structure =
      sessionAfter.payoutStructureSnapshot ?? DEFAULT_PAYOUT_STRUCTURE;
    const placeAmounts = this.computePlaceAmounts(fund, structure);

    const results: Array<Record<string, unknown>> = [];

    for (const pa of placeAmounts) {
      if (pa.amountUsdCents <= 0) continue;
      const standing = rows.find((r) => r.place === pa.place);
      if (!standing) continue;

      const idempotencyKey = `session:${sessionAfter.id}:place:${pa.place}:user:${standing.userId}`;
      let payout = await this.payouts.findOne({ where: { idempotencyKey } });
      if (payout?.status === 'paid') {
        results.push({ place: pa.place, status: 'already_paid', payoutId: payout.id });
        continue;
      }

      const bal = await this.balances.getOrCreate(standing.userId);
      const rail =
        bal.preferredPayoutMethod === 'usdc' && bal.usdcWalletAddress
          ? 'usdc'
          : bal.stripeConnectAccountId
            ? 'stripe_bank'
            : 'wallet_credit';

      if (!payout) {
        payout = await this.payouts.save(
          this.payouts.create({
            rocLeagueId: sessionAfter.rocLeagueId,
            sessionId: sessionAfter.id,
            place: pa.place,
            payeeUserId: standing.userId,
            competitorType: 'USER',
            competitorId: standing.userId,
            grossUsdCents: centsStr(pa.amountUsdCents),
            status: 'finalized',
            payoutRail: rail,
            idempotencyKey,
            stripeTransferId: null,
            usdcTxRef: null,
            failureReason: null,
            paidAt: null,
            metadataJson: {
              fund_at_close: fund,
              audit_id: sessionAfter.auditId,
              audit_status: sessionAfter.auditStatus,
            },
          }),
        );
      }

      payout.status = 'transferring';
      await this.payouts.save(payout);

      const transfer = await this.stripe.createTransfer({
        amountUsdCents: pa.amountUsdCents,
        payeeUserId: standing.userId,
        payoutId: payout.id,
        connectAccountId: bal.stripeConnectAccountId,
        description: `ROC session ${sessionAfter.name} place ${pa.place}`,
        rail: rail === 'usdc' ? 'usdc' : rail === 'stripe_bank' ? 'stripe_bank' : 'wallet_credit',
      });

      if (transfer.status === 'failed') {
        payout.status = 'failed';
        payout.failureReason = 'transfer_failed';
        await this.payouts.save(payout);
        results.push({ place: pa.place, status: 'failed', payoutId: payout.id });
        continue;
      }

      // Ledger: debit Players Fund + credit player wallet (same USD ledger)
      await this.ledger.debitPlayersFundForPayout({
        rocLeagueId: sessionAfter.rocLeagueId,
        sessionId: sessionAfter.id,
        payoutId: payout.id,
        amountUsdCents: pa.amountUsdCents,
        payeeUserId: standing.userId,
        method: rail,
        transferId: transfer.transferId,
      });
      await this.ledger.creditPlayerWallet({
        rocLeagueId: sessionAfter.rocLeagueId,
        sessionId: sessionAfter.id,
        payoutId: payout.id,
        amountUsdCents: pa.amountUsdCents,
        payeeUserId: standing.userId,
        method: rail,
        transferId: transfer.transferId,
      });

      // Profile available balance — only after successful payout execution
      await this.balances.creditAvailable(standing.userId, pa.amountUsdCents);
      if (rail === 'stripe_bank' || rail === 'usdc') {
        await this.balances.recordExternalPaidOut(standing.userId, pa.amountUsdCents);
      }

      payout.status = 'paid';
      payout.paidAt = new Date();
      payout.stripeTransferId =
        rail === 'stripe_bank' || rail === 'wallet_credit' ? transfer.transferId : null;
      payout.usdcTxRef = rail === 'usdc' ? transfer.transferId : null;
      payout.payoutRail = rail;
      await this.payouts.save(payout);

      standing.payoutCents = centsStr(pa.amountUsdCents);
      await this.standings.save(standing);

      results.push({
        place: pa.place,
        status: 'paid',
        payoutId: payout.id,
        userId: standing.userId,
        amountUsd: formatUsd(pa.amountUsdCents),
        rail,
        transferId: transfer.transferId,
      });
    }

    sessionAfter.status = 'CLOSED';
    sessionAfter.closedAt = new Date();
    sessionAfter.closeSummaryJson = {
      fund_usd_cents: fund,
      fund_usd: formatUsd(fund),
      payouts: results,
      closed_by: input.actorUserId,
      closed_at: sessionAfter.closedAt.toISOString(),
      audit_id: sessionAfter.auditId,
      audit_status: sessionAfter.auditStatus,
      audit_operator_override: sessionAfter.auditOperatorOverride,
    };
    await this.sessions.save(sessionAfter);

    this.logger.log(
      `session closed ${sessionAfter.id} fund=${fund} payouts=${results.length} audit=${sessionAfter.auditStatus}`,
    );

    return {
      ok: true,
      sessionId: sessionAfter.id,
      playersFundUsdCents: fund,
      playersFundUsd: formatUsd(fund),
      payouts: results,
      audit: this.audit.getStoredAudit(sessionAfter),
    };
  }

  private computePlaceAmounts(
    fund: number,
    structure: RocPayoutStructure,
  ): Array<{ place: number; amountUsdCents: number }> {
    const F = Math.max(0, cents(fund));
    if (structure.mode === 'FIXED_CENTS') {
      const fixed = structure.places.map((p) => ({
        place: p.place,
        amountUsdCents: cents(p.amount_cents ?? 0),
      }));
      const sum = fixed.reduce((s, x) => s + x.amountUsdCents, 0);
      if (sum <= F || structure.shortfall_policy === 'HOLD') {
        if (sum > F && structure.shortfall_policy === 'HOLD') {
          return fixed.map((x) => ({ ...x, amountUsdCents: 0 }));
        }
        return fixed;
      }
      // SCALE
      return fixed.map((x) => ({
        place: x.place,
        amountUsdCents: sum > 0 ? Math.floor((x.amountUsdCents * F) / sum) : 0,
      }));
    }

    // PERCENT_OF_FUND
    const out: Array<{ place: number; amountUsdCents: number }> = [];
    let allocated = 0;
    const sorted = [...structure.places].sort((a, b) => a.place - b.place);
    sorted.forEach((p, i) => {
      const bps = p.bps ?? 0;
      let amt = Math.floor((F * bps) / 10000);
      if (i === sorted.length - 1) {
        amt = Math.max(0, F - allocated); // remainder to last place
      }
      allocated += amt;
      out.push({ place: p.place, amountUsdCents: amt });
    });
    return out;
  }
}

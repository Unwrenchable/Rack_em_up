import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { RocSession, type RocAuditUiStatus } from './entities/roc-session.entity';
import { RocPayment } from './entities/roc-payment.entity';
import { RocSessionStanding } from './entities/roc-session-standing.entity';
import { RocLeague } from './entities/roc-league.entity';
import { RocLedgerService } from './roc-ledger.service';
import {
  realaiLedgerAudit,
  realaiPayoutSanity,
  type LedgerAuditResult,
} from '../ai/realai-coach.client';
import { cents, formatUsd, normalizeSplit } from './roc-money.util';

export type RocAuditBundle = {
  auditId: string;
  uiStatus: RocAuditUiStatus;
  canAutoPayout: boolean;
  requiresOperatorConfirm: boolean;
  blocked: boolean;
  plain_language: string[];
  ledger_audit: LedgerAuditResult;
  payout_sanity: LedgerAuditResult;
  snapshot: Record<string, unknown>;
  auditedAt: string;
};

/**
 * Builds session money snapshot and calls RealAI ledger_audit + payout_sanity.
 * RealAI is read-only — never moves money or authorizes Stripe.
 */
@Injectable()
export class RocLedgerAuditService {
  private readonly logger = new Logger(RocLedgerAuditService.name);

  constructor(
    @InjectRepository(RocSession)
    private readonly sessions: Repository<RocSession>,
    @InjectRepository(RocPayment)
    private readonly payments: Repository<RocPayment>,
    @InjectRepository(RocSessionStanding)
    private readonly standings: Repository<RocSessionStanding>,
    @InjectRepository(RocLeague)
    private readonly leagues: Repository<RocLeague>,
    private readonly ledger: RocLedgerService,
  ) {}

  /**
   * Freeze standings places (if needed), build snapshot, call RealAI, persist on session.
   */
  async runSessionAudit(sessionId: string): Promise<RocAuditBundle> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const rows = await this.standings.find({
      where: { sessionId },
      order: { points: 'DESC', wins: 'DESC' },
    });
    rows.forEach((r, i) => {
      if (r.place == null) r.place = i + 1;
    });
    if (rows.length) await this.standings.save(rows);

    const league = await this.leagues.findOne({
      where: { id: session.rocLeagueId },
    });
    const split = normalizeSplit(
      session.splitSnapshot ?? league?.defaultSplit ?? undefined,
    );
    const fund = await this.ledger.sessionPlayersFundCents(
      session.rocLeagueId,
      sessionId,
    );
    const structure =
      session.payoutStructureSnapshot ?? {
        mode: 'PERCENT_OF_FUND' as const,
        places: [
          { place: 1, bps: 5000 },
          { place: 2, bps: 3000 },
          { place: 3, bps: 2000 },
        ],
      };

    const placeAmounts = this.computePlaceAmounts(fund, structure);
    const payout_lines = placeAmounts
      .map((p) => {
        const st = rows.find((r) => r.place === p.place);
        if (!st || p.amountUsdCents <= 0) return null;
        return {
          competitor_type: 'USER',
          competitor_id: st.userId,
          player_id: st.userId,
          place: p.place,
          payout_cents: p.amountUsdCents,
          payout_status: 'PROJECTED',
        };
      })
      .filter(Boolean);

    const ledgerRows = await this.ledger.listEntries(session.rocLeagueId, {
      sessionId,
      limit: 500,
    });
    const sessionPayments = await this.payments.find({
      where: { sessionId, rocLeagueId: session.rocLeagueId },
    });

    const eligible_inflow_cents = sessionPayments
      .filter((p) => p.status === 'confirmed' || p.status === 'paid')
      .reduce((s, p) => s + cents(p.amountUsdCents), 0);

    const snapshot = {
      roc_league_id: session.rocLeagueId,
      session_id: session.id,
      season_id: session.seasonId,
      format: session.format ?? 'SINGLES',
      configured_split: {
        players_fund: split.players_fund_bps / 10000,
        operator: split.operator_bps / 10000,
        rackup: split.platform_bps / 10000,
        players_fund_bps: split.players_fund_bps,
        operator_bps: split.operator_bps,
        platform_bps: split.platform_bps,
      },
      eligible_inflow_cents,
      players_fund_cents: fund,
      ledger_entries: ledgerRows.map((e) => ({
        id: e.id,
        direction: e.direction,
        entry_type: e.entryType,
        amount_cents: cents(e.amountUsdCents),
        idempotency_key: e.idempotencyKey,
        payment_id: e.paymentId,
        status: e.status,
        method: e.method,
        competitor_type: 'USER',
        competitor_id: e.payerUserId ?? e.payeeUserId,
      })),
      payments: sessionPayments.map((p) => ({
        id: p.id,
        status:
          p.status === 'confirmed' || p.status === 'paid'
            ? 'SUCCEEDED'
            : p.status.toUpperCase(),
        amount_cents: cents(p.amountUsdCents),
        method: p.method,
        provider_ref: p.stripePaymentIntentId,
      })),
      payout_lines,
      standings: rows.map((r) => ({
        player_id: r.userId,
        competitor_type: 'USER',
        competitor_id: r.userId,
        final_place: r.place,
        points: r.points,
        wins: r.wins,
      })),
      payout_structure: {
        places: Object.fromEntries(
          placeAmounts.map((p) => [String(p.place), p.amountUsdCents]),
        ),
        mode: structure.mode,
      },
    };

    const ledger_audit = await realaiLedgerAudit(snapshot);
    const payout_sanity = await realaiPayoutSanity({
      format: session.format ?? 'SINGLES',
      session_id: session.id,
      players_fund_cents: fund,
      payout_structure: snapshot.payout_structure,
      standings: snapshot.standings,
      payout_lines,
    });

    const blocker_count =
      (ledger_audit.summary.blocker_count ?? 0) +
      (payout_sanity.summary.blocker_count ?? 0);
    const warning_count =
      (ledger_audit.summary.warning_count ?? 0) +
      (payout_sanity.summary.warning_count ?? 0);

    let uiStatus: RocAuditUiStatus = 'pass';
    if (blocker_count > 0) uiStatus = 'blocked';
    else if (warning_count > 0) uiStatus = 'warnings';

    // payout_sanity release_safe false with high confidence failure → treat as blocked if blockers
    if (
      payout_sanity.gate.release_safe === false &&
      (payout_sanity.summary.blocker_count ?? 0) > 0
    ) {
      uiStatus = 'blocked';
    }

    const plain = [
      ...ledger_audit.plain_language,
      ...payout_sanity.plain_language,
      ...(payout_sanity.fix_before_release ?? []).map(
        (f) => `Fix before release: ${f}`,
      ),
    ];

    const auditId = randomUUID();
    const auditedAt = new Date().toISOString();
    const bundle: RocAuditBundle = {
      auditId,
      uiStatus,
      canAutoPayout: uiStatus === 'pass',
      requiresOperatorConfirm: uiStatus === 'warnings',
      blocked: uiStatus === 'blocked',
      plain_language: plain,
      ledger_audit,
      payout_sanity,
      snapshot: {
        players_fund_usd: formatUsd(fund),
        players_fund_cents: fund,
        eligible_inflow_cents,
        payout_lines,
        standings_count: rows.length,
      },
      auditedAt,
    };

    session.auditId = auditId;
    session.auditStatus = uiStatus;
    session.auditAt = new Date(auditedAt);
    session.auditResultJson = {
      auditId,
      uiStatus,
      plain_language: plain,
      ledger_audit: {
        status: ledger_audit.status,
        summary: ledger_audit.summary,
        blockers: ledger_audit.blockers,
        warnings: ledger_audit.warnings,
        findings: ledger_audit.findings,
        plain_language: ledger_audit.plain_language,
        split_check: ledger_audit.split_check,
        totals: ledger_audit.totals,
        offline: ledger_audit.offline,
        authorize_payout: false,
        owns_ledger: false,
      },
      payout_sanity: {
        status: payout_sanity.status,
        summary: payout_sanity.summary,
        blockers: payout_sanity.blockers,
        warnings: payout_sanity.warnings,
        plain_language: payout_sanity.plain_language,
        fix_before_release: payout_sanity.fix_before_release,
        confidence: payout_sanity.confidence,
        ranks_match_standings: payout_sanity.ranks_match_standings,
        offline: payout_sanity.offline,
        authorize_payout: false,
      },
      boundary: {
        realai: 'audit analysis only',
        rackup: 'Stripe, ledger writes, split execution, payout release',
        never: ['authorize_payout', 'call_stripe', 'invent_balances', 'move_money'],
      },
      snapshot: bundle.snapshot,
      auditedAt,
    };
    // Clear prior override when re-running audit
    session.auditOperatorOverride = false;
    session.auditOverrideBy = null;
    session.auditOverrideNote = null;
    await this.sessions.save(session);

    this.logger.log(
      `session audit ${sessionId} status=${uiStatus} blockers=${blocker_count} warnings=${warning_count}`,
    );

    return bundle;
  }

  getStoredAudit(session: RocSession) {
    return {
      auditId: session.auditId,
      auditStatus: session.auditStatus ?? 'none',
      auditAt: session.auditAt,
      auditResult: session.auditResultJson,
      operatorOverride: session.auditOperatorOverride,
      overrideBy: session.auditOverrideBy,
      overrideNote: session.auditOverrideNote,
      /** Operator UI chip */
      label:
        session.auditStatus === 'pass'
          ? 'Pass'
          : session.auditStatus === 'warnings'
            ? 'Warnings'
            : session.auditStatus === 'blocked'
              ? 'Blocked'
              : 'Not audited',
    };
  }

  private computePlaceAmounts(
    fund: number,
    structure: {
      mode: string;
      places: Array<{ place: number; bps?: number; amount_cents?: number }>;
      shortfall_policy?: string;
    },
  ): Array<{ place: number; amountUsdCents: number }> {
    const F = Math.max(0, cents(fund));
    if (structure.mode === 'FIXED_CENTS') {
      return structure.places.map((p) => ({
        place: p.place,
        amountUsdCents: cents(p.amount_cents ?? 0),
      }));
    }
    const out: Array<{ place: number; amountUsdCents: number }> = [];
    let allocated = 0;
    const sorted = [...structure.places].sort((a, b) => a.place - b.place);
    sorted.forEach((p, i) => {
      const bps = p.bps ?? 0;
      let amt = Math.floor((F * bps) / 10000);
      if (i === sorted.length - 1) amt = Math.max(0, F - allocated);
      allocated += amt;
      out.push({ place: p.place, amountUsdCents: amt });
    });
    return out;
  }
}

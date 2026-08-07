import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RocLeague,
  ROC_DEFAULT_SPLIT,
  type RocSplitBps,
} from './entities/roc-league.entity';
import { RocSession, type RocPayoutStructure } from './entities/roc-session.entity';
import { RocEntry } from './entities/roc-entry.entity';
import { RocSessionStanding } from './entities/roc-session-standing.entity';
import { RocLedgerService } from './roc-ledger.service';
import { centsStr, formatUsd, normalizeSplit } from './roc-money.util';

@Injectable()
export class RocLeagueService {
  constructor(
    @InjectRepository(RocLeague)
    private readonly leagues: Repository<RocLeague>,
    @InjectRepository(RocSession)
    private readonly sessions: Repository<RocSession>,
    @InjectRepository(RocEntry)
    private readonly entries: Repository<RocEntry>,
    @InjectRepository(RocSessionStanding)
    private readonly standings: Repository<RocSessionStanding>,
    private readonly ledger: RocLedgerService,
  ) {}

  async create(ownerUserId: string, body: {
    name: string;
    slug?: string;
    description?: string;
    region?: string;
    split?: Partial<RocSplitBps>;
  }) {
    const slug =
      body.slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);

    const existing = await this.leagues.findOne({ where: { slug } });
    if (existing) throw new BadRequestException('Slug already taken');

    const league = await this.leagues.save(
      this.leagues.create({
        name: body.name.trim(),
        slug,
        description: body.description ?? null,
        ownerUserId,
        region: body.region ?? null,
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        defaultSplit: normalizeSplit(body.split ?? ROC_DEFAULT_SPLIT),
        enabledFormats: ['SINGLES'],
        enabledGameStyles: ['nine_ball', 'eight_ball', 'ten_ball', 'one_pocket', 'pyramid'],
        currency: 'USD',
        homeHallId: null,
        stripeConnectAccountId: null,
      }),
    );

    await this.ledger.ensureSystemAccounts(league.id);
    return league;
  }

  async get(id: string) {
    const league = await this.leagues.findOne({ where: { id } });
    if (!league) throw new NotFoundException('ROC league not found');
    const bar = await this.ledger.moneyBar(id);
    return {
      ...league,
      moneyBar: {
        playersFundUsd: formatUsd(bar.playersFundUsdCents),
        operatorUsd: formatUsd(bar.operatorUsdCents),
        platformUsd: formatUsd(bar.platformUsdCents),
        ...bar,
        splitLabel: '45% Players Fund · 35% ROC Operator · 20% RackUp',
      },
    };
  }

  async listForUser(userId: string) {
    return this.leagues.find({
      where: [{ ownerUserId: userId }],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async assertOperator(leagueId: string, userId: string) {
    const league = await this.leagues.findOne({ where: { id: leagueId } });
    if (!league) throw new NotFoundException('ROC league not found');
    if (league.ownerUserId !== userId) {
      throw new ForbiddenException('ROC Operator only');
    }
    return league;
  }

  async createSession(
    operatorId: string,
    leagueId: string,
    body: {
      name: string;
      entryFeeUsdCents: number;
      gameStyle?: string;
      format?: string;
      payoutStructure?: RocPayoutStructure;
    },
  ) {
    const league = await this.assertOperator(leagueId, operatorId);
    const count = await this.sessions.count({ where: { rocLeagueId: leagueId } });
    const session = await this.sessions.save(
      this.sessions.create({
        rocLeagueId: leagueId,
        seasonId: null,
        name: body.name,
        sessionIndex: count + 1,
        status: 'SCHEDULED',
        gameStyle: body.gameStyle ?? 'nine_ball',
        format: body.format ?? 'SINGLES',
        entryFeeCents: centsStr(body.entryFeeUsdCents),
        splitSnapshot: null,
        payoutStructureSnapshot: body.payoutStructure ?? {
          mode: 'PERCENT_OF_FUND',
          places: [
            { place: 1, bps: 5000 },
            { place: 2, bps: 3000 },
            { place: 3, bps: 2000 },
          ],
          shortfall_policy: 'SCALE',
        },
        autoPayout: true,
        openedAt: null,
        closedAt: null,
        closeSummaryJson: null,
      }),
    );
    return session;
  }

  /** Freeze split snapshot and open registration. */
  async openSession(operatorId: string, sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    const league = await this.assertOperator(session.rocLeagueId, operatorId);

    session.splitSnapshot = normalizeSplit(league.defaultSplit);
    if (!session.payoutStructureSnapshot) {
      session.payoutStructureSnapshot = {
        mode: 'PERCENT_OF_FUND',
        places: [
          { place: 1, bps: 5000 },
          { place: 2, bps: 3000 },
          { place: 3, bps: 2000 },
        ],
      };
    }
    session.status = 'REGISTRATION';
    session.openedAt = new Date();
    return this.sessions.save(session);
  }

  async createSessionEntry(userId: string, sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (!['REGISTRATION', 'LIVE', 'SCHEDULED'].includes(session.status)) {
      throw new BadRequestException(`Cannot enter session status=${session.status}`);
    }

    const existing = await this.entries.findOne({
      where: { sessionId, userId, entryKind: 'SESSION_ENTRY' },
    });
    if (existing) return existing;

    const entry = await this.entries.save(
      this.entries.create({
        rocLeagueId: session.rocLeagueId,
        sessionId: session.id,
        seasonId: session.seasonId,
        userId,
        competitorType: 'USER',
        competitorId: userId,
        entryKind: 'SESSION_ENTRY',
        amountDueCents: session.entryFeeCents,
        amountPaidCents: '0',
        status: 'DUE',
        label: `${session.name} entry`,
      }),
    );

    // Ensure standing row for payout places
    const st = await this.standings.findOne({ where: { sessionId, userId } });
    if (!st) {
      await this.standings.save(
        this.standings.create({
          sessionId,
          userId,
          wins: 0,
          losses: 0,
          points: 0,
          place: null,
          payoutCents: '0',
        }),
      );
    }

    return entry;
  }

  async setStanding(
    operatorId: string,
    sessionId: string,
    body: { userId: string; wins?: number; losses?: number; points?: number; place?: number },
  ) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    await this.assertOperator(session.rocLeagueId, operatorId);

    let row = await this.standings.findOne({
      where: { sessionId, userId: body.userId },
    });
    if (!row) {
      row = this.standings.create({
        sessionId,
        userId: body.userId,
        wins: 0,
        losses: 0,
        points: 0,
        place: null,
        payoutCents: '0',
      });
    }
    if (body.wins != null) row.wins = body.wins;
    if (body.losses != null) row.losses = body.losses;
    if (body.points != null) row.points = body.points;
    if (body.place != null) row.place = body.place;
    return this.standings.save(row);
  }

  async operatorDashboard(operatorId: string, leagueId: string) {
    await this.assertOperator(leagueId, operatorId);
    const league = await this.get(leagueId);
    const sessions = await this.sessions.find({
      where: { rocLeagueId: leagueId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const ledger = await this.ledger.listEntries(leagueId, { limit: 40 });
    return {
      league,
      stickyMoneyBar: league.moneyBar,
      sessions,
      recentLedger: ledger.map((e) => ({
        id: e.id,
        type: e.entryType,
        direction: e.direction,
        amountUsd: formatUsd(e.amountUsdCents),
        status: e.status,
        method: e.method,
        sessionId: e.sessionId,
        memo: e.memo,
        stripePaymentIntentId: e.stripePaymentIntentId,
        at: e.createdAt,
      })),
    };
  }
}

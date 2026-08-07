import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { getRedisClient } from '../config/redis.config';
import {
  keyForHallV2,
  keyForLeagueV2,
  keyForMoneyAuditV2,
  keyForRealaiPendingJobs,
  keyForRealaiV2,
  keyForScorekeepingV2,
  keyForTournamentV2,
} from '../common/redis-keys';
import { MemoriesService } from '../memories/memories.service';
import { RatingService } from '../users/rating.service';
import { RealaiV2Service } from '../realai/v2/realai-v2.service';
import { MatchesGateway } from '../matches/matches.gateway';
import {
  MatchReportPayload,
  ProcessReportResult,
} from './match-report.types';
import { ScoreUpdateEvent } from './scorekeeping.service';
import { MatchTimelineService } from './match-timeline.service';

/**
 * Single entry point for post-report side effects after domain state is saved:
 * Elo, memories, timeline finalize, Redis events, RealAI summary job, socket emit, money audit.
 */
@Injectable()
export class ScorekeepingServiceV2 {
  private readonly logger = new Logger(ScorekeepingServiceV2.name);

  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly ratingService: RatingService,
    private readonly realaiV2: RealaiV2Service,
    private readonly timelines: MatchTimelineService,
    @Optional()
    @Inject(forwardRef(() => MatchesGateway))
    private readonly matchesGateway?: MatchesGateway,
  ) {}

  /**
   * Process a completed match report. Domain services must already have
   * persisted COMPLETED state and dual-confirm rules (money).
   */
  async processReport(payload: MatchReportPayload): Promise<ProcessReportResult> {
    const occurredAt = new Date().toISOString();
    const corr = payload.correlationId ? ` corr=${payload.correlationId}` : '';
    this.logger.log(
      `processReport domain=${payload.domain} match=${payload.matchId} ` +
        `score=${payload.aScore}-${payload.bScore}${corr}`,
    );

    let eloApplied = false;
    let memoriesCreated = false;
    let realaiJobId: string | null = null;
    let redisEventEmitted = false;
    let socketEmitted = false;
    let auditWritten = false;
    let timelineFinalized = false;
    let timelineEventCount = 0;
    let sotdCandidateCount = 0;

    // 0) Finalize deep scorekeeping timeline (racks/fouls/shots)
    try {
      const timeline = await this.timelines.finalizeOnReport({
        matchId: payload.matchId,
        domain: payload.domain,
        entityId: payload.entityId,
        hallId: payload.hallId,
        playerAId: payload.playerAId,
        playerBId: payload.playerBId,
        gameType: payload.gameType,
        aScore: payload.aScore,
        bScore: payload.bScore,
        winnerId: payload.winnerId,
      });
      timelineFinalized = true;
      timelineEventCount = timeline.events?.length ?? 0;
      sotdCandidateCount = timeline.sotdCandidates?.length ?? 0;
    } catch (e) {
      this.logger.warn(
        `timeline finalize failed match=${payload.matchId}: ${e instanceof Error ? e.message : e}`,
      );
    }

    // 1) Glicko-2 via RealAI rating_update (ROC_GLICKO2 contract).
    //    Order: league_validate (domain) → persist (already done) → rating_update writeback.
    //    Ledger / session payouts are independent and never mixed here.
    if (!payload.skipElo && payload.winnerId) {
      const loserId =
        payload.winnerId === payload.playerAId
          ? payload.playerBId
          : payload.playerAId;
      if (loserId && payload.playerAId && payload.playerBId) {
        try {
          const aIsWinner = payload.winnerId === payload.playerAId;
          await this.ratingService.applyMatchResult(payload.winnerId, loserId, {
            ratingWeight: payload.ratingWeight ?? 1,
            game: payload.gameType,
            gameStyle: payload.gameType,
            format: payload.format ?? 'SINGLES',
            tableSize: payload.tableSize,
            skillLevel: payload.skillLevel,
            winnerScore: aIsWinner ? payload.aScore : payload.bScore,
            loserScore: aIsWinner ? payload.bScore : payload.aScore,
            forfeit: payload.forfeit,
            matchId: payload.matchId,
            sessionId: payload.sessionId,
            rocLeagueId: payload.rocLeagueId,
          });
          eloApplied = true;
        } catch (e) {
          this.logger.warn(
            `Glicko rating_update failed match=${payload.matchId}: ${e instanceof Error ? e.message : e}`,
          );
        }
      }
    }

    // 2) Memories (standard + money by default)
    if (
      !payload.skipMemories &&
      (payload.domain === 'standard' || payload.domain === 'money') &&
      payload.playerAId &&
      payload.playerBId &&
      payload.aScore !== payload.bScore
    ) {
      try {
        const aWins = payload.aScore > payload.bScore;
        await this.memoriesService.createForMatchParticipants({
          matchId: payload.matchId,
          matchType: payload.domain === 'money' ? 'MONEY' : 'STANDARD',
          participantAId: payload.playerAId,
          participantBId: payload.playerBId,
          aIsWinner: aWins,
          bIsWinner: !aWins,
          game: payload.gameType ?? 'unknown',
          raceTo: payload.raceTo ?? Math.max(payload.aScore, payload.bScore),
          stakes: payload.stakes,
          scorelineA:
            payload.domain === 'money'
              ? { aScore: payload.aScore, bScore: payload.bScore }
              : { score: payload.aScore, opponentScore: payload.bScore },
          scorelineB:
            payload.domain === 'money'
              ? { aScore: payload.aScore, bScore: payload.bScore }
              : { score: payload.bScore, opponentScore: payload.aScore },
        });
        memoriesCreated = true;
      } catch (e) {
        this.logger.warn(
          `memories failed match=${payload.matchId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    // 3) Redis score event + cache invalidation
    const event: ScoreUpdateEvent = {
      domain: payload.domain,
      entityId: payload.entityId,
      matchId: payload.matchId,
      playerAId: payload.playerAId,
      playerBId: payload.playerBId,
      aScore: payload.aScore,
      bScore: payload.bScore,
      winnerId: payload.winnerId,
      hallId: payload.hallId,
      occurredAt,
    };
    redisEventEmitted = await this.emitRedisReport(event, payload.correlationId);

    // 4) RealAI summary job (enriched with timeline when available)
    try {
      const timeline = await this.timelines.getTimelineOrNull(payload.matchId);
      const context = this.timelines.buildRealAiContext(
        timeline,
        this.buildContext(payload),
      );
      const keyShots = this.timelines.buildKeyShots(timeline);
      const job = await this.realaiV2.submitSummaryJob({
        matchId: payload.matchId,
        context,
        keyShots: keyShots as any[],
        userId: payload.reportingPlayerId,
      });
      realaiJobId = job.jobId;
      await this.trackRealaiJob(job.jobId, job.status);
    } catch (e) {
      this.logger.warn(
        `RealAI summary job failed match=${payload.matchId}: ${e instanceof Error ? e.message : e}`,
      );
    }

    // 5) Socket live score
    socketEmitted = this.emitSocketScore(event);

    // 6) Money audit
    if (payload.domain === 'money') {
      auditWritten = await this.writeMoneyAudit({
        matchId: payload.matchId,
        action: 'report_completed',
        aScore: payload.aScore,
        bScore: payload.bScore,
        winnerId: payload.winnerId,
        reportingPlayerId: payload.reportingPlayerId,
        correlationId: payload.correlationId,
        occurredAt,
      });
    }

    // 7) Health snapshot
    await this.recordLastReport({
      ...event,
      realaiJobId,
      timelineEventCount,
      sotdCandidateCount,
      correlationId: payload.correlationId,
    });

    return {
      matchId: payload.matchId,
      domain: payload.domain,
      eloApplied,
      memoriesCreated,
      realaiJobId,
      redisEventEmitted,
      socketEmitted,
      auditWritten,
      timelineFinalized,
      timelineEventCount,
      sotdCandidateCount,
      occurredAt,
    };
  }

  /** Lightweight money-match audit (confirm / dispute / complete / report). */
  async writeMoneyAudit(entry: {
    matchId: string;
    action: string;
    [key: string]: unknown;
  }): Promise<boolean> {
    const row = {
      ...entry,
      at: entry.occurredAt ?? new Date().toISOString(),
    };
    try {
      const redis = await getRedisClient();
      const raw = JSON.stringify(row);
      await redis.lPush(keyForMoneyAuditV2(entry.matchId), raw);
      await redis.lTrim(keyForMoneyAuditV2(entry.matchId), 0, 99);
      await redis.lPush(keyForMoneyAuditV2(), raw);
      await redis.lTrim(keyForMoneyAuditV2(), 0, 499);
      return true;
    } catch (e) {
      this.logger.warn(
        `money audit write failed: ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  async getHealthSnapshot(): Promise<{
    lastReport: unknown | null;
    pendingRealAiJobs: number;
    recentEventCount: number;
  }> {
    let lastReport: unknown | null = null;
    let pendingRealAiJobs = 0;
    let recentEventCount = 0;

    try {
      const redis = await getRedisClient();
      const lastRaw = await redis.get(keyForScorekeepingV2('last_report'));
      if (lastRaw) lastReport = JSON.parse(lastRaw);

      pendingRealAiJobs = await redis.sCard(keyForRealaiPendingJobs());

      recentEventCount = await redis.lLen(keyForScorekeepingV2('events'));
    } catch {
      /* health best-effort */
    }

    return { lastReport, pendingRealAiJobs, recentEventCount };
  }

  private buildContext(payload: MatchReportPayload): string {
    const parts = [
      payload.domain,
      payload.gameType ? `game=${payload.gameType}` : null,
      `entity=${payload.entityId}`,
      `score=${payload.aScore}-${payload.bScore}`,
      payload.winnerId ? `winner=${payload.winnerId}` : null,
    ].filter(Boolean);
    return parts.join(' ');
  }

  private async emitRedisReport(
    event: ScoreUpdateEvent,
    correlationId?: string,
  ): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const raw = JSON.stringify({ ...event, correlationId });

      await redis.lPush(keyForScorekeepingV2('events'), raw);
      await redis.lTrim(keyForScorekeepingV2('events'), 0, 499);
      await redis.lPush(keyForScorekeepingV2('report'), raw);
      await redis.lTrim(keyForScorekeepingV2('report'), 0, 199);
      await redis.set(
        keyForScorekeepingV2(`last:${event.domain}:${event.matchId}`),
        raw,
        { EX: 60 * 60 * 24 },
      );

      if (event.domain === 'tournament_v2') {
        await redis.del(keyForTournamentV2(event.entityId, 'bracket'));
        await redis.del(keyForTournamentV2(event.entityId, 'standings'));
      }
      if (event.domain === 'league_v2') {
        await redis.del(keyForLeagueV2(event.entityId, 'standings'));
      }
      if (event.hallId) {
        await redis.del(keyForHallV2(event.hallId, 'feed'));
        await redis.del(keyForHallV2(event.hallId, 'leaderboard'));
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `emitRedisReport failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  private emitSocketScore(event: ScoreUpdateEvent): boolean {
    try {
      if (!this.matchesGateway) return false;
      this.matchesGateway.emitScoreUpdate(event);
      return true;
    } catch (e) {
      this.logger.warn(
        `socket score emit failed: ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  private async trackRealaiJob(
    jobId: string,
    status: string,
  ): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (status === 'queued') {
        await redis.sAdd(keyForRealaiPendingJobs(), jobId);
      } else {
        await redis.sRem(keyForRealaiPendingJobs(), jobId);
      }
      // Also mirror job status under a known pending key for health
      await redis.set(
        keyForRealaiV2(jobId, 'meta'),
        JSON.stringify({ jobId, status, at: new Date().toISOString() }),
        { EX: 60 * 60 * 24 },
      );
    } catch {
      /* ignore */
    }
  }

  private async recordLastReport(snapshot: Record<string, unknown>): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.set(keyForScorekeepingV2('last_report'), JSON.stringify(snapshot), {
        EX: 60 * 60 * 24 * 7,
      });
    } catch {
      /* ignore */
    }
  }
}

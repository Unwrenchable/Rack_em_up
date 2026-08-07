import { Injectable, Logger } from '@nestjs/common';
import { getRedisClient } from '../config/redis.config';
import {
  keyForHallV2,
  keyForLeagueV2,
  keyForScorekeepingV2,
  keyForTournamentV2,
} from '../common/redis-keys';

export type ScoreDomain = 'standard' | 'money' | 'tournament_v2' | 'league_v2';

export type ScoreUpdateEvent = {
  domain: ScoreDomain;
  entityId: string;
  matchId: string;
  playerAId: string;
  playerBId: string;
  aScore: number;
  bScore: number;
  winnerId: string | null;
  hallId?: string | null;
  occurredAt?: string;
};

/**
 * Legacy thin Redis event bus.
 * Prefer ScorekeepingServiceV2.processReport for full report lifecycle.
 * Kept for backward-compatible emit-only callers.
 */
@Injectable()
export class ScorekeepingService {
  private readonly logger = new Logger(ScorekeepingService.name);

  async emitScoreUpdate(event: ScoreUpdateEvent): Promise<ScoreUpdateEvent> {
    const payload: ScoreUpdateEvent = {
      ...event,
      occurredAt: event.occurredAt ?? new Date().toISOString(),
    };

    try {
      const redis = await getRedisClient();
      const raw = JSON.stringify(payload);

      await redis.lPush(keyForScorekeepingV2('events'), raw);
      await redis.lTrim(keyForScorekeepingV2('events'), 0, 499);
      await redis.set(keyForScorekeepingV2(`last:${payload.domain}:${payload.matchId}`), raw, {
        EX: 60 * 60 * 24,
      });

      if (payload.domain === 'tournament_v2') {
        await redis.del(keyForTournamentV2(payload.entityId, 'bracket'));
        await redis.del(keyForTournamentV2(payload.entityId, 'standings'));
      }
      if (payload.domain === 'league_v2') {
        await redis.del(keyForLeagueV2(payload.entityId, 'standings'));
      }
      if (payload.hallId) {
        await redis.del(keyForHallV2(payload.hallId, 'feed'));
        await redis.del(keyForHallV2(payload.hallId, 'leaderboard'));
      }
    } catch (err) {
      this.logger.warn(
        `emitScoreUpdate redis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    this.logger.log(
      `score ${payload.domain} match=${payload.matchId} ${payload.aScore}-${payload.bScore} winner=${payload.winnerId ?? 'none'}`,
    );

    return payload;
  }
}

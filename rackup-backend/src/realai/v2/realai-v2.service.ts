import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { getRealAiStatus } from '../../ai/realai.client';
import {
  invokeRackupCoach,
  invokeRackupCoachSafe,
  realaiCoach,
  realaiLeagueValidate,
  realaiMatchmaking,
  realaiModerate,
  realaiPyramidRules,
  realaiShotOfTheDay,
  realaiVideoAnalysis,
  type RackUpCoachRequest,
  type RackUpCoachResponse,
  type RackUpPlayerContext,
} from '../../ai/realai-coach.client';
import { getRedisClient } from '../../config/redis.config';
import { keyForRealaiPendingJobs, keyForRealaiV2 } from '../../common/redis-keys';

import { CoachDto } from './dto/coach.dto';
import { MatchSummaryDto } from './dto/match-summary.dto';
import { PlayerInsightsDto } from './dto/player-insights.dto';
import { ShotOfTheDayDto } from './dto/shot-of-the-day.dto';
import {
  getSotdMapById,
  listSotdMaps,
  sotdMapCount,
  SotdShotMap,
} from './sotd-shot-maps';

const SHOWN_SOTD_KEY = (userId: string) => `realai:v2:sotd:shown:${userId}`;

/**
 * RackUp ↔ RealAI intelligence bridge.
 * All player-level intelligence goes through POST /v1/plugins/rackup-coach
 * (see REALAI_RACKUP_WIRING_CONTRACT.md).
 */
@Injectable()
export class RealaiV2Service {
  private readonly logger = new Logger(RealaiV2Service.name);

  /** Raw coach plugin invoke (passthrough for advanced clients). */
  async invoke(
    body: RackUpCoachRequest,
  ): Promise<RackUpCoachResponse & { requestId: string }> {
    const requestId = randomUUID();
    try {
      const res = await invokeRackupCoach(body, { requestId, retries: 1 });
      return { ...res, requestId };
    } catch (e) {
      this.logger.warn(`invoke failed: ${e instanceof Error ? e.message : e}`);
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'RealAI unavailable',
      );
    }
  }

  /**
   * Queue a match-summary job in Redis and process via coach plugin.
   */
  async submitSummaryJob(
    payload: MatchSummaryDto & { userId?: string },
  ): Promise<{ jobId: string; status: 'queued' | 'completed' | 'failed'; result?: unknown }> {
    const jobId = randomUUID();
    const key = keyForRealaiV2(jobId, 'job');
    const envelope = {
      jobId,
      status: 'queued' as string,
      payload,
      createdAt: new Date().toISOString(),
      result: null as unknown,
    };

    try {
      const redis = await getRedisClient();
      await redis.set(key, JSON.stringify(envelope), { EX: 60 * 60 * 24 });
      await redis.sAdd(keyForRealaiPendingJobs(), jobId);
    } catch (err) {
      this.logger.warn(`submitSummaryJob redis write failed: ${err}`);
    }

    try {
      const result = await this.matchSummary(payload.userId ?? 'system', {
        matchId: payload.matchId,
        keyShots: payload.keyShots,
        context: payload.context,
      });
      envelope.status = 'completed';
      envelope.result = result;
      try {
        const redis = await getRedisClient();
        await redis.set(key, JSON.stringify(envelope), { EX: 60 * 60 * 24 });
        await redis.sRem(keyForRealaiPendingJobs(), jobId);
      } catch {
        /* ignore */
      }
      return { jobId, status: 'completed', result };
    } catch (err) {
      envelope.status = 'failed';
      envelope.result = { error: err instanceof Error ? err.message : String(err) };
      try {
        const redis = await getRedisClient();
        await redis.set(key, JSON.stringify(envelope), { EX: 60 * 60 });
        await redis.sRem(keyForRealaiPendingJobs(), jobId);
      } catch {
        /* ignore */
      }
      return { jobId, status: 'failed', result: envelope.result };
    }
  }

  async getSummaryJob(jobId: string) {
    try {
      const redis = await getRedisClient();
      const raw = await redis.get(keyForRealaiV2(jobId, 'job'));
      if (!raw) throw new NotFoundException('Summary job not found');
      return JSON.parse(raw);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new NotFoundException('Summary job not found');
    }
  }

  /**
   * Structured SOTD map geometry — catalog fallback for offline diagrams.
   * Coaching content should use shotOfTheDay() (ability shot_of_the_day).
   */
  async getSotdMap(id: string): Promise<SotdShotMap & { realaiReachable: boolean }> {
    const map = getSotdMapById(id);
    if (!map) throw new NotFoundException(`SOTD map not found: ${id}`);

    const status = await getRealAiStatus();
    return {
      ...map,
      source: 'catalog_fallback',
      realaiReachable: status.reachable,
    };
  }

  async getSotdMaps(): Promise<{
    total: number;
    realaiReachable: boolean;
    maps: SotdShotMap[];
  }> {
    const status = await getRealAiStatus();
    return {
      total: sotdMapCount(),
      realaiReachable: status.reachable,
      maps: listSotdMaps(),
    };
  }

  private playerFromDto(
    userId: string,
    extra?: Partial<RackUpPlayerContext> & Record<string, unknown>,
  ): RackUpPlayerContext {
    return {
      player_id: userId,
      rating_system: 'rackup',
      locale: 'en',
      ...(extra as Partial<RackUpPlayerContext>),
    };
  }

  /** ability: coach | pyramid */
  async coach(userId: string, dto: CoachDto & Record<string, unknown>) {
    const ability =
      dto.discipline === 'pyramid' || dto.mode === 'pyramid' ? 'pyramid' : 'coach';
    const player = this.playerFromDto(userId, {
      display_name: dto.displayName as string | undefined,
      rating: dto.rating as number | undefined,
      discipline: (dto.discipline as string) ?? 'pyramid',
      table_size: dto.tableSize as string | undefined,
      skill_level:
        (dto.skillLevel as string | undefined) ??
        (dto.skill_level as string | undefined),
      weaknesses: dto.weaknesses as string[] | undefined,
      strengths: dto.strengths as string[] | undefined,
    });

    try {
      const result = await realaiCoach({
        ability,
        goal: dto.goal ?? dto.notes,
        player,
        payload: {
          mode: (dto.mode as string) ?? 'full',
          minutes: (dto.minutes as number) ?? 60,
          match_id: dto.matchId,
          my_score: dto.myScore,
          opp_score: dto.oppScore,
          ...(dto.payload as Record<string, unknown> | undefined),
        },
      });
      return { ok: true, ability, result, provider: 'realai' };
    } catch (e) {
      this.logger.warn(`coach: ${e instanceof Error ? e.message : e}`);
      return {
        ok: false,
        reason: 'realai_unreachable',
        guidance: 'RealAI is unreachable; provide training tips manually.',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async matchSummary(userId: string, dto: MatchSummaryDto) {
    try {
      const result = await realaiCoach({
        ability: 'coach',
        goal: 'Post-match summary and key moments',
        player: this.playerFromDto(userId),
        payload: {
          mode: 'full',
          match_id: dto.matchId,
          key_shots: dto.keyShots,
          context: dto.context,
        },
      });
      return { ok: true, result, provider: 'realai' };
    } catch (e) {
      return {
        ok: false,
        reason: 'realai_unreachable',
        summary: 'RealAI is unreachable; unable to generate match summary.',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async playerInsights(userId: string, dto: PlayerInsightsDto) {
    const extra = dto as PlayerInsightsDto & { rating?: number };
    const res = await invokeRackupCoachSafe({
      ability: 'rating_intel',
      player: this.playerFromDto(userId, {
        rating: extra.rating,
      }),
      payload: { ...(dto as unknown as Record<string, unknown>) },
    });
    if (!res?.ok || !res.result) {
      return {
        ok: false,
        reason: 'realai_unreachable',
        insights: [],
      };
    }
    return { ok: true, result: res.result, provider: 'realai' };
  }

  /**
   * ability: shot_of_the_day — personalized daily shot + variety.
   * Persists primary.id into shown_shot_ids for the user.
   */
  async shotOfTheDay(userId: string, dto: ShotOfTheDayDto & Record<string, unknown>) {
    const shown = await this.getShownShotIds(userId);
    const extraShown = Array.isArray(dto.shown_shot_ids)
      ? (dto.shown_shot_ids as string[])
      : Array.isArray(dto.shownShotIds)
        ? (dto.shownShotIds as string[])
        : [];
    const shown_shot_ids = [...new Set([...shown, ...extraShown])].slice(-30);

    try {
      const result = await realaiShotOfTheDay({
        player: this.playerFromDto(userId, {
          rating: dto.rating as number | undefined,
          discipline: (dto.game as string) ?? (dto.discipline as string) ?? 'pyramid',
          table_size: dto.tableSize as string | undefined,
          skill_level: dto.skillLevel as string | undefined,
          weaknesses: dto.weaknesses as string[] | undefined,
        }),
        game: (dto.game as string) ?? 'pyramid',
        count: (dto.count as number) ?? 1,
        hint: (dto.hint as string) ?? '',
        shown_shot_ids,
      });

      const primary = result.primary as { id?: string } | undefined;
      if (primary?.id) {
        await this.appendShownShotId(userId, primary.id);
      }

      return {
        ok: true,
        result,
        provider: 'realai',
        // UX contract: always surface why
        why:
          (primary as { why_helps_regular_play?: string; why_this_shot?: string } | undefined)
            ?.why_helps_regular_play ??
          (primary as { why_this_shot?: string } | undefined)?.why_this_shot ??
          null,
      };
    } catch (e) {
      // Offline: catalog map fallback (geometry only)
      const maps = listSotdMaps();
      const pick = maps[Math.floor(Date.now() / 86_400_000) % Math.max(1, maps.length)];
      return {
        ok: false,
        reason: 'realai_unreachable',
        fallback_map: pick ?? null,
        error: e instanceof Error ? e.message : String(e),
        shot: {
          description:
            'RealAI is unreachable; showing catalog geometry fallback.',
        },
      };
    }
  }

  async moderateChat(
    userId: string,
    text: string,
    context?: {
      channel?: string;
      match_id?: string;
      thread_id?: string;
      prior_flags?: number;
      recipient_id?: string;
    },
  ) {
    return realaiModerate({
      player: this.playerFromDto(userId),
      text,
      context,
    });
  }

  async leagueValidate(
    userId: string,
    payload: Record<string, unknown>,
    playerExtra?: Partial<RackUpPlayerContext>,
  ) {
    try {
      return await realaiLeagueValidate({
        player: this.playerFromDto(userId, playerExtra),
        payload,
      });
    } catch (e) {
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'league_validate unavailable',
      );
    }
  }

  async matchmakingSuggest(
    userId: string,
    body: {
      window?: number;
      candidates: Array<Record<string, unknown>>;
      player?: Partial<RackUpPlayerContext>;
    },
  ) {
    if (!body.candidates?.length) {
      throw new BadRequestException('candidates required (RackUp pre-filters)');
    }
    try {
      const result = await realaiMatchmaking({
        player: this.playerFromDto(userId, body.player),
        window: body.window,
        candidates: body.candidates,
      });
      return { ok: true, result, provider: 'realai' };
    } catch (e) {
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'matchmaking unavailable',
      );
    }
  }

  async pyramidRules(
    userId: string,
    body: {
      table_size?: string;
      skill_level?: string;
      rating?: number;
      my_score?: number;
      opp_score?: number;
      pocketed_balls?: number[];
    },
  ) {
    try {
      const result = await realaiPyramidRules({
        player: this.playerFromDto(userId, {
          table_size: body.table_size,
          skill_level: body.skill_level,
          rating: body.rating,
          discipline: 'pyramid',
        }),
        payload: {
          my_score: body.my_score,
          opp_score: body.opp_score,
          pocketed_balls: body.pocketed_balls,
        },
      });
      return { ok: true, result, provider: 'realai' };
    } catch (e) {
      // Offline pin: contract §5 matrix
      return {
        ok: false,
        reason: 'realai_unreachable',
        result: offlinePyramidMatrix(body.table_size, body.skill_level, body),
        provider: 'matrix_pin',
      };
    }
  }

  async videoAnalysis(
    userId: string,
    payload: Record<string, unknown>,
    playerExtra?: Partial<RackUpPlayerContext>,
  ) {
    try {
      const result = await realaiVideoAnalysis({
        player: this.playerFromDto(userId, playerExtra),
        payload,
      });
      return { ok: true, result, provider: 'realai' };
    } catch (e) {
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'video_analysis unavailable',
      );
    }
  }

  private async getShownShotIds(userId: string): Promise<string[]> {
    try {
      const redis = await getRedisClient();
      const raw = await redis.get(SHOWN_SOTD_KEY(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async appendShownShotId(userId: string, id: string): Promise<void> {
    try {
      const prev = await this.getShownShotIds(userId);
      const next = [...prev.filter((x) => x !== id), id].slice(-30);
      const redis = await getRedisClient();
      await redis.set(SHOWN_SOTD_KEY(userId), JSON.stringify(next), {
        EX: 60 * 60 * 24 * 45,
      });
    } catch {
      /* ignore */
    }
  }
}

/** Contract §5 pin when RealAI is down — version with RealAI together. */
function offlinePyramidMatrix(
  tableSize?: string,
  skillLevel?: string,
  scores?: { my_score?: number; opp_score?: number },
) {
  const table = tableSize === '9ft' || tableSize === '9' ? '9ft' : '7ft';
  const skill = (skillLevel ?? 'intermediate').toLowerCase();
  const matrix: Record<string, { '7ft': number; '9ft': number; call: string; w: number }> = {
    beginner: { '7ft': 25, '9ft': 40, call: 'no', w: 0.7 },
    intermediate: { '7ft': 35, '9ft': 55, call: 'no', w: 0.85 },
    advanced: { '7ft': 45, '9ft': 71, call: 'optional', w: 1.0 },
    pro: { '7ft': 50, '9ft': 71, call: 'yes', w: 1.15 },
  };
  const row = matrix[skill] ?? matrix.intermediate;
  const target = row[table as '7ft' | '9ft'];
  const rack = table === '9ft' ? 15 : 10;
  const my = scores?.my_score ?? 0;
  const opp = scores?.opp_score ?? 0;
  return {
    game: 'RackUp Pyramid',
    config: {
      table_size: table,
      rack_size: rack,
      skill_level: skill,
      points_to_win: target,
      call_shot: row.call,
      rating_weight: row.w,
      one_ball_value: 11,
    },
    race: {
      target,
      my_score: my,
      opp_score: opp,
      my_points_needed: Math.max(0, target - my),
      phase: my / target > 0.75 || opp / target > 0.75 ? 'endgame' : 'midgame',
    },
    coaching_summary: `${table} → ${rack}-ball | ${skill} first to ${target} | offline matrix pin`,
  };
}

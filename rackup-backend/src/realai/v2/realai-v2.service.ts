import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { realAiChatOrFallback, getRealAiStatus } from '../../ai/realai.client';
import { getRedisClient } from '../../config/redis.config';
import { keyForRealaiV2 } from '../../common/redis-keys';

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

@Injectable()
export class RealaiV2Service {
  private readonly logger = new Logger(RealaiV2Service.name);

  /**
   * Queue a match-summary job in Redis (realai:v2:{jobId}:job) and process best-effort.
   * Works offline via matchSummary rules fallback.
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
   * Structured SOTD map — always available offline via catalog_fallback.
   * When RealAI is reachable, attach optional enrichment flag (map geometry stays catalog-stable).
   */
  async getSotdMap(id: string): Promise<SotdShotMap & { realaiReachable: boolean }> {
    const map = getSotdMapById(id);
    if (!map) throw new NotFoundException(`SOTD map not found: ${id}`);

    const status = await getRealAiStatus();
    // Offline-safe: return catalog geometry even when RealAI is down.
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

  async coach(_userId: string, dto: CoachDto) {
    const fallback = () =>
      JSON.stringify({
        ok: false,
        reason: 'realai_unreachable',
        guidance: 'RealAI is unreachable; provide training tips manually.',
      });

    const messages = [
      { role: 'system' as const, content: 'You are Rack em Up coach. Return JSON only.' },
      { role: 'user' as const, content: JSON.stringify(dto) },
    ];

    const res = await realAiChatOrFallback(
      messages,
      fallback,
      { temperature: 0.4, maxTokens: 900 },
    );

    // Assume RealAI returns JSON string.
    try {
      return JSON.parse(res.content);
    } catch {
      return { ok: false, raw: res.content };
    }
  }

  async matchSummary(_userId: string, dto: MatchSummaryDto) {
    const fallback = () =>
      JSON.stringify({
        ok: false,
        reason: 'realai_unreachable',
        summary: 'RealAI is unreachable; unable to generate match summary.',
      });

    const messages = [
      { role: 'system' as const, content: 'Return JSON only. Provide match summary and key moments.' },
      { role: 'user' as const, content: JSON.stringify(dto) },
    ];

    const res = await realAiChatOrFallback(messages, fallback, { temperature: 0.3, maxTokens: 900 });
    try {
      return JSON.parse(res.content);
    } catch {
      return { ok: false, raw: res.content };
    }
  }

  async playerInsights(_userId: string, dto: PlayerInsightsDto) {
    const fallback = () =>
      JSON.stringify({ ok: false, reason: 'realai_unreachable', insights: [] });


    const messages = [
      { role: 'system' as const, content: 'Return JSON only. Provide 5-10 structured insights.' },
      { role: 'user' as const, content: JSON.stringify(dto) },
    ];

    const res = await realAiChatOrFallback(messages, fallback, { temperature: 0.35, maxTokens: 900 });
    try {
      return JSON.parse(res.content);
    } catch {
      return { ok: false, raw: res.content };
    }
  }

  async shotOfTheDay(_userId: string, dto: ShotOfTheDayDto) {
    const fallback = () =>
      JSON.stringify({
        ok: false,
        reason: 'realai_unreachable',
        shot: {
          ballCoordinates: [],
          cuePathSegments: [],
          finalPositions: [],
          description: 'RealAI is unreachable; cannot compute shot-of-the-day.',
        },
      });

    // RealAI V2 structured shot diagram format.
    const messages = [
      {
        role: 'system' as const,
        content:
          'Return JSON only with keys: ballCoordinates, cuePathSegments, finalPositions, description. ' +
          'ballCoordinates: [{ballId:number,x:number,y:number}], ' +
          'cuePathSegments: [{from:{x:number,y:number},to:{x:number,y:number}}], ' +
          'finalPositions: [{ballId:number,x:number,y:number}], ' +
          'description: string.',
      },
      { role: 'user' as const, content: JSON.stringify(dto) },
    ];

    const res = await realAiChatOrFallback(messages, fallback, { temperature: 0.25, maxTokens: 900 });
    try {
      const parsed = JSON.parse(res.content);
      return parsed;
    } catch {
      return fallback();
    }
  }
}


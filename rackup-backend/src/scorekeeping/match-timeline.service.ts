import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../config/redis.config';
import {
  keyForHallV2,
  keyForMatchTimelineV2,
  keyForSotdCandidatesV2,
} from '../common/redis-keys';
import { MatchTimelineEntity } from './match-timeline.entity';
import {
  AppendTimelineEventInput,
  isSotdCandidateEvent,
  MatchTimeline,
  MatchTimelineEvent,
  MatchTimelineEventType,
  summarizeTimelineForRealAi,
} from './match-timeline.types';
import { MatchesGateway } from '../matches/matches.gateway';
import { GameRulesService } from './game-rules.service';

@Injectable()
export class MatchTimelineService {
  private readonly logger = new Logger(MatchTimelineService.name);

  constructor(
    @InjectRepository(MatchTimelineEntity)
    private readonly repo: Repository<MatchTimelineEntity>,
    private readonly gameRules: GameRulesService,
    @Optional()
    @Inject(forwardRef(() => MatchesGateway))
    private readonly matchesGateway?: MatchesGateway,
  ) {}

  async startTimeline(input: {
    matchId: string;
    domain: MatchTimeline['domain'];
    entityId?: string | null;
    hallId?: string | null;
    playerAId?: string | null;
    playerBId?: string | null;
    gameType?: string | null;
  }): Promise<MatchTimeline> {
    let row = await this.repo.findOne({ where: { matchId: input.matchId } });
    if (!row) {
      row = this.repo.create({
        matchId: input.matchId,
        domain: input.domain,
        entityId: input.entityId ?? null,
        hallId: input.hallId ?? null,
        playerAId: input.playerAId ?? null,
        playerBId: input.playerBId ?? null,
        gameType: input.gameType ?? null,
        events: [],
        sotdCandidates: [],
        finalizedAt: null,
      });
    } else {
      row.domain = input.domain;
      row.entityId = input.entityId ?? row.entityId;
      row.hallId = input.hallId ?? row.hallId;
      row.playerAId = input.playerAId ?? row.playerAId;
      row.playerBId = input.playerBId ?? row.playerBId;
      row.gameType = input.gameType ?? row.gameType;
    }

    const hasStart = (row.events ?? []).some((e) => e.type === 'match_start');
    if (!hasStart) {
      row.events = [
        ...(row.events ?? []),
        this.makeEvent('match_start', {
          note: 'Timeline started',
          aScore: 0,
          bScore: 0,
        }),
      ];
    }

    const saved = await this.repo.save(row);
    const timeline = this.toDto(saved);
    await this.mirrorRedis(timeline);
    return timeline;
  }

  async appendEvent(input: AppendTimelineEventInput): Promise<MatchTimeline> {
    let row = await this.repo.findOne({ where: { matchId: input.matchId } });
    if (!row) {
      row = this.repo.create({
        matchId: input.matchId,
        domain: input.domain ?? 'standard',
        entityId: input.entityId ?? null,
        hallId: input.hallId ?? null,
        playerAId: input.playerAId ?? null,
        playerBId: input.playerBId ?? null,
        gameType: input.gameType ?? null,
        events: [],
        sotdCandidates: [],
        finalizedAt: null,
      });
    }

    if (row.finalizedAt && input.type !== 'note') {
      throw new BadRequestException('Timeline is finalized; only notes may be appended');
    }

    // Merge metadata if provided
    if (input.domain) row.domain = input.domain;
    if (input.entityId) row.entityId = input.entityId;
    if (input.hallId) row.hallId = input.hallId;
    if (input.playerAId) row.playerAId = input.playerAId;
    if (input.playerBId) row.playerBId = input.playerBId;
    if (input.gameType) row.gameType = input.gameType;

    let data = input.data ?? null;
    if (input.type === 'foul') {
      const classified = this.gameRules.classifyFoul(
        String((input.data as any)?.code ?? input.note ?? 'general'),
      );
      data = { ...(input.data ?? {}), foul: classified };
    }
    if (
      input.type === 'score_tick' ||
      input.type === 'rack_won' ||
      input.type === 'match_end'
    ) {
      if (
        typeof input.aScore === 'number' &&
        typeof input.bScore === 'number' &&
        row.gameType
      ) {
        // Soft validate when raceTo present in data
        const raceTo = Number((input.data as any)?.raceTo);
        if (Number.isFinite(raceTo) && raceTo > 0) {
          this.gameRules.assertValidRaceScore({
            game: row.gameType,
            raceTo,
            aScore: input.aScore,
            bScore: input.bScore,
            allowIncomplete: input.type !== 'match_end',
          });
        }
      }
    }

    const event = this.makeEvent(input.type, {
      playerId: input.playerId,
      rack: input.rack,
      aScore: input.aScore,
      bScore: input.bScore,
      data,
      note: input.note,
    });

    row.events = [...(row.events ?? []), event];

    if (isSotdCandidateEvent(event)) {
      const ids = new Set(row.sotdCandidates ?? []);
      ids.add(event.id);
      row.sotdCandidates = Array.from(ids);
      await this.trackSotdCandidate(input.matchId, event);
    }

    const saved = await this.repo.save(row);
    const timeline = this.toDto(saved);
    await this.mirrorRedis(timeline);
    this.emitLive(timeline, event);

    if (row.hallId && (input.type === 'rack_won' || input.type === 'score_tick')) {
      await this.pushHallFeedHint(row.hallId, {
        type: 'timeline_event',
        matchId: row.matchId,
        eventType: event.type,
        aScore: event.aScore,
        bScore: event.bScore,
      });
    }

    return timeline;
  }

  async getTimeline(matchId: string): Promise<MatchTimeline> {
    // Prefer Redis live, fall back to DB
    try {
      const redis = await getRedisClient();
      const raw = await redis.get(keyForMatchTimelineV2(matchId));
      if (raw) return JSON.parse(raw) as MatchTimeline;
    } catch {
      /* ignore */
    }

    const row = await this.repo.findOne({ where: { matchId } });
    if (!row) throw new NotFoundException('Timeline not found');
    return this.toDto(row);
  }

  async getTimelineOrNull(matchId: string): Promise<MatchTimeline | null> {
    try {
      return await this.getTimeline(matchId);
    } catch {
      return null;
    }
  }

  /**
   * Finalize timeline at processReport time; emit match_end if missing.
   */
  async finalizeOnReport(input: {
    matchId: string;
    domain: MatchTimeline['domain'];
    entityId?: string | null;
    hallId?: string | null;
    playerAId?: string | null;
    playerBId?: string | null;
    gameType?: string | null;
    aScore: number;
    bScore: number;
    winnerId?: string | null;
  }): Promise<MatchTimeline> {
    let row = await this.repo.findOne({ where: { matchId: input.matchId } });
    if (!row) {
      row = this.repo.create({
        matchId: input.matchId,
        domain: input.domain,
        entityId: input.entityId ?? null,
        hallId: input.hallId ?? null,
        playerAId: input.playerAId ?? null,
        playerBId: input.playerBId ?? null,
        gameType: input.gameType ?? null,
        events: [
          this.makeEvent('match_start', { note: 'Auto-started at report' }),
        ],
        sotdCandidates: [],
        finalizedAt: null,
      });
    }

    row.domain = input.domain;
    row.entityId = input.entityId ?? row.entityId;
    row.hallId = input.hallId ?? row.hallId;
    row.playerAId = input.playerAId ?? row.playerAId;
    row.playerBId = input.playerBId ?? row.playerBId;
    row.gameType = input.gameType ?? row.gameType;

    const hasEnd = (row.events ?? []).some((e) => e.type === 'match_end');
    if (!hasEnd) {
      row.events = [
        ...(row.events ?? []),
        this.makeEvent('match_end', {
          aScore: input.aScore,
          bScore: input.bScore,
          playerId: input.winnerId,
          note: 'Match completed',
          data: { winnerId: input.winnerId },
        }),
      ];
    }

    row.finalizedAt = new Date();
    const saved = await this.repo.save(row);
    const timeline = this.toDto(saved);
    await this.mirrorRedis(timeline);

    if (row.hallId) {
      await this.pushHallFeedHint(row.hallId, {
        type: 'match_completed',
        matchId: row.matchId,
        domain: row.domain,
        aScore: input.aScore,
        bScore: input.bScore,
        winnerId: input.winnerId,
        sotdCandidates: timeline.sotdCandidates.length,
      });
    }

    return timeline;
  }

  buildRealAiContext(timeline: MatchTimeline | null, baseContext?: string): string {
    const summary = summarizeTimelineForRealAi(timeline);
    const parts = [
      baseContext,
      `timeline_events=${summary.eventCount}`,
      `racks=${summary.racks}`,
      `fouls=${summary.fouls}`,
      `sotd_candidates=${summary.sotdCandidates}`,
    ].filter(Boolean);
    return parts.join(' ');
  }

  buildKeyShots(timeline: MatchTimeline | null): unknown[] {
    return summarizeTimelineForRealAi(timeline).keyShots;
  }

  private makeEvent(
    type: MatchTimelineEventType,
    partial: Partial<MatchTimelineEvent> = {},
  ): MatchTimelineEvent {
    return {
      id: randomUUID(),
      type,
      at: new Date().toISOString(),
      playerId: partial.playerId ?? null,
      rack: partial.rack ?? null,
      aScore: partial.aScore ?? null,
      bScore: partial.bScore ?? null,
      data: partial.data ?? null,
      note: partial.note ?? null,
    };
  }

  private toDto(row: MatchTimelineEntity): MatchTimeline {
    return {
      matchId: row.matchId,
      domain: row.domain,
      entityId: row.entityId,
      hallId: row.hallId,
      playerAId: row.playerAId,
      playerBId: row.playerBId,
      gameType: row.gameType,
      events: row.events ?? [],
      sotdCandidates: row.sotdCandidates ?? [],
      createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      finalizedAt: row.finalizedAt?.toISOString?.() ?? null,
    };
  }

  private async mirrorRedis(timeline: MatchTimeline): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.set(keyForMatchTimelineV2(timeline.matchId), JSON.stringify(timeline), {
        EX: 60 * 60 * 24 * 7,
      });
    } catch (e) {
      this.logger.warn(`timeline redis mirror failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async trackSotdCandidate(matchId: string, event: MatchTimelineEvent): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.lPush(
        keyForSotdCandidatesV2(),
        JSON.stringify({ matchId, eventId: event.id, at: event.at, type: event.type, data: event.data }),
      );
      await redis.lTrim(keyForSotdCandidatesV2(), 0, 199);
    } catch {
      /* ignore */
    }
  }

  private async pushHallFeedHint(hallId: string, item: Record<string, unknown>): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = keyForHallV2(hallId, 'feed');
      await redis.lPush(key, JSON.stringify({ ...item, at: new Date().toISOString() }));
      await redis.lTrim(key, 0, 99);
    } catch {
      /* ignore */
    }
  }

  private emitLive(timeline: MatchTimeline, event: MatchTimelineEvent): void {
    try {
      this.matchesGateway?.emitScoreUpdate({
        domain: timeline.domain,
        entityId: timeline.entityId ?? timeline.matchId,
        matchId: timeline.matchId,
        playerAId: timeline.playerAId ?? '',
        playerBId: timeline.playerBId ?? '',
        aScore: event.aScore ?? 0,
        bScore: event.bScore ?? 0,
        winnerId: null,
        hallId: timeline.hallId,
        occurredAt: event.at,
      });
    } catch {
      /* ignore */
    }
  }
}

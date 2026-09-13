import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchMemory } from '../memories/match-memory.entity';
import { User } from '../users/users.entity';
import {
  getRealAiStatus,
  realAiChatOrFallback,
} from '../ai/realai.client';
import { realaiCoach, realaiVideoAnalysis } from '../ai/realai-coach.client';
import { coachingTextFromResult, isUnusableRealAiText } from '../ai/realai-text-guard';
import { AnalyzeShotDto } from './dto/analyze-shot.dto';
import {
  drillsFromChatContent,
  drillsFromCoachResult,
  type DrillPlan,
} from './parse-coach-drills';
import { buildCoachAnalyzePayload } from './video-analysis-payload';
import { ObjectStorageService } from '../common/object-storage.service';
import { randomUUID } from 'crypto';

export type { DrillPlan } from './parse-coach-drills';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    @InjectRepository(MatchMemory)
    private readonly memoriesRepo: Repository<MatchMemory>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly storage: ObjectStorageService,
  ) {}

  async providerStatus() {
    return getRealAiStatus();
  }

  async todayDrills(userId: string): Promise<{ drills: DrillPlan[]; provider: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const rating = user?.rating ?? 500;
    const recent = await this.memoriesRepo.find({
      where: { participantUserId: userId },
      order: { createdAt: 'DESC' },
      take: 8,
    });
    const losses = recent.filter((m) => !m.isWinner).length;
    const games = recent.map((m) => m.game).filter(Boolean);

    const rulesDrills = this.ruleBasedDrills(rating, losses, games as string[]);

    const summary = recent
      .map(
        (m) =>
          `${m.matchType} ${m.game ?? '?'} ${m.isWinner ? 'W' : 'L'} race=${m.raceTo ?? '-'}`,
      )
      .join('; ');

    // Canonical path: POST /v1/plugins/rackup-coach ability=coach (not chat/completions).
    try {
      const result = await realaiCoach({
        ability: 'coach',
        goal: "Today's 3 focused practice drills",
        player: {
          player_id: userId,
          display_name: user?.displayName,
          rating,
          rd: user?.rd,
          volatility: user?.volatility,
          rating_system: 'rackup',
          skill_level: user?.ratingBand ?? undefined,
          discipline: (games[0] as string | undefined) ?? 'nine_ball',
          locale: 'en',
        },
        payload: {
          mode: 'practice_plan',
          minutes: 60,
          count: 3,
          recent_results: summary || 'none',
        },
      });
      const drills = drillsFromCoachResult(result);
      if (drills?.length) {
        return { drills, provider: 'realai' };
      }
      this.logger.warn(
        'rackup-coach returned a result but no drills were extractable; trying chat harvest',
      );
    } catch (e) {
      this.logger.warn(
        `rackup-coach drills failed: ${e instanceof Error ? e.message : e}`,
      );
    }

    // Chat/completions needs a local default_llm (Hive). Render API-only
    // hosts return a placeholder — skip unless explicitly opted in.
    const allowChat =
      process.env.REALAI_CHAT_FALLBACK === '1' ||
      process.env.REALAI_CHAT_FALLBACK === 'true';
    if (!allowChat) {
      return { drills: rulesDrills, provider: 'offline-rules-fallback' };
    }

    const ai = await realAiChatOrFallback(
      [
        {
          role: 'system',
          content:
            'You are a professional pool coach for the RackUp app. Reply with exactly 3 drills as JSON array: [{"title","focus","minutes","difficulty","description"}]. difficulty is Easy|Medium|Hard. minutes is number. No markdown.',
        },
        {
          role: 'user',
          content: `Player rating ${rating}. Recent results: ${summary || 'none'}. Suggest 3 focused practice drills for today.`,
        },
      ],
      () => JSON.stringify(rulesDrills),
      { temperature: 0.4, maxTokens: 700 },
    );

    if (ai.offlineFallback) {
      return { drills: rulesDrills, provider: 'offline-rules-fallback' };
    }

    const fromChat = drillsFromChatContent(ai.content);
    if (fromChat?.length) {
      return { drills: fromChat, provider: ai.model || 'realai' };
    }

    this.logger.warn('RealAI chat answered but drill text was unreadable — rules fallback');
    return { drills: rulesDrills, provider: 'realai-parse-fallback' };
  }

  async uploadClip(
    userId: string,
    file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number },
  ): Promise<{ url: string; key: string; backend: string }> {
    const mime = (file.mimetype ?? '').toLowerCase();
    const allowed = new Set([
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v',
      'video/mpeg',
    ]);
    if (!allowed.has(mime)) {
      throw new BadRequestException('Upload an mp4, webm, or mov clip');
    }
    if ((file.size ?? file.buffer.length) > 80 * 1024 * 1024) {
      throw new BadRequestException('Clip must be 80MB or smaller');
    }
    const ext =
      mime.includes('webm') ? 'webm' : mime.includes('quicktime') ? 'mov' : 'mp4';
    const stored = await this.storage.putBytes({
      prefix: `clips/${userId}`,
      filename: `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`,
      body: file.buffer,
      contentType: mime,
    });
    return { url: stored.url, key: stored.key, backend: stored.backend };
  }

  async analyzeShot(userId: string, dto: AnalyzeShotDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const rating = user?.rating ?? 500;
    const player = {
      player_id: userId,
      display_name: user?.displayName,
      rating,
      rd: user?.rd,
      volatility: user?.volatility,
      rating_system: 'rackup' as const,
      skill_level: user?.ratingBand ?? undefined,
      discipline: dto.game ?? 'nine_ball',
      locale: 'en',
    };
    const payload = buildCoachAnalyzePayload(dto);
    const ability = dto.videoUrl ? 'video_analysis' : 'coach';

    // Canonical: POST /v1/plugins/rackup-coach — never chat/completions
    // (Render has no default_llm; Hive GPU stays on the operator PC).
    try {
      const result = dto.videoUrl
        ? await realaiVideoAnalysis({ player, payload })
        : await realaiCoach({
            ability: 'coach',
            goal: 'Shot analysis: aim, speed, spin, consistency, 3 fixes',
            player,
            payload,
          });
      const text = coachingTextFromResult(result);
      if (text && !isUnusableRealAiText(text)) {
        const persisted = await this.persistCoachResult(userId, ability, result, payload);
        return {
          analysis: text,
          provider: 'realai',
          model: 'rackup-coach',
          offlineFallback: false,
          status: 'realai',
          reason: null,
          videoUrl: dto.videoUrl ?? null,
          ability,
          result,
          persistUrl: persisted,
        };
      }
      this.logger.warn('rackup-coach analyze returned no usable coaching text');
    } catch (e) {
      this.logger.warn(
        `rackup-coach analyze failed: ${e instanceof Error ? e.message : e}`,
      );
    }

    const fallback = this.fallbackAnalysis(dto, rating);
    return {
      analysis: fallback,
      provider: 'rules-fallback',
      model: 'rules-fallback',
      offlineFallback: true,
      status: 'rules-fallback',
      reason: 'plugin_unavailable',
      videoUrl: dto.videoUrl ?? null,
      ability,
      result: null,
      persistUrl: null,
    };
  }

  /** RackUp persists RealAI's result; Nest does not recompute coach math. */
  private async persistCoachResult(
    userId: string,
    ability: string,
    result: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    try {
      const stored = await this.storage.putBytes({
        prefix: `analyses/${userId}`,
        filename: `${Date.now()}-${randomUUID().slice(0, 8)}.json`,
        body: Buffer.from(
          JSON.stringify({
            ability,
            player_id: userId,
            result,
            video_meta: payload.video_meta ?? null,
            persisted_at: new Date().toISOString(),
          }),
        ),
        contentType: 'application/json',
      });
      return stored.url;
    } catch (e) {
      this.logger.warn(
        `Could not persist rackup-coach result: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  async scoutOpponent(viewerId: string, opponentUserId: string) {
    const [viewer, opponent, headToHead, opponentRecent] = await Promise.all([
      this.usersRepo.findOne({ where: { id: viewerId } }),
      this.usersRepo.findOne({ where: { id: opponentUserId } }),
      this.memoriesRepo.find({
        where: { participantUserId: viewerId, opponentUserId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.memoriesRepo.find({
        where: { participantUserId: opponentUserId },
        order: { createdAt: 'DESC' },
        take: 15,
      }),
    ]);

    const h2hWins = headToHead.filter((m) => m.isWinner).length;
    const h2hLosses = headToHead.length - h2hWins;
    const oppForm = opponentRecent.slice(0, 5).map((m) => (m.isWinner ? 'W' : 'L'));
    const winPct =
      headToHead.length > 0 ? Math.round((h2hWins / headToHead.length) * 100) : null;

    const statsBlock = {
      opponent: opponent
        ? { id: opponent.id, displayName: opponent.displayName, rating: opponent.rating, reputation: opponent.reputation }
        : { id: opponentUserId, displayName: 'Unknown', rating: null, reputation: null },
      viewerRating: viewer?.rating ?? null,
      headToHead: { wins: h2hWins, losses: h2hLosses, winPct },
      opponentRecentForm: oppForm,
      gamesSeen: [...new Set(opponentRecent.map((m) => m.game).filter(Boolean))],
    };

    const ai = await realAiChatOrFallback(
      [
        {
          role: 'system',
          content:
            'You are a pool match scout. Give a short pre-match brief: strengths to attack, risks, and one strategy. 120 words max.',
        },
        {
          role: 'user',
          content: JSON.stringify(statsBlock),
        },
      ],
      () => {
        const form = oppForm.join('') || 'unknown';
        return `Scout brief (offline): Opponent ${statsBlock.opponent.displayName} rating ${statsBlock.opponent.rating ?? 'n/a'}. H2H ${h2hWins}-${h2hLosses}${winPct != null ? ` (${winPct}%)` : ''}. Recent form ${form}. Play solid safety; force long pots if they struggle under pace.`;
      },
    );

    return {
      ...statsBlock,
      brief: ai.content,
      provider: ai.offlineFallback ? 'rules-fallback' : 'realai',
      model: ai.model,
      offlineFallback: ai.offlineFallback,
    };
  }

  private ruleBasedDrills(rating: number, recentLosses: number, games: string[]): DrillPlan[] {
    const primary = games[0] ?? '9-ball';
    const hard = rating >= 600 || recentLosses >= 3;
    return [
      {
        id: 'r1',
        title: hard ? 'Pressure long pot ladder' : 'Long straight stun',
        focus: 'Cue ball control',
        minutes: 12,
        difficulty: hard ? 'Hard' : 'Medium',
        description: `15 straight-ins on ${primary}. Leave the CB in the center zone. Track make %.`,
        source: 'rules',
      },
      {
        id: 'r2',
        title: 'Bank ladder',
        focus: 'Banks',
        minutes: 10,
        difficulty: 'Hard',
        description: 'Cross-corner banks from 5 spots. Stop at 8/10 makes.',
        source: 'rules',
      },
      {
        id: 'r3',
        title: 'Break box',
        focus: 'Break',
        minutes: 8,
        difficulty: 'Easy',
        description: '10 breaks. Log second-ball pocket + table run count.',
        source: 'rules',
      },
    ];
  }

  private fallbackAnalysis(dto: AnalyzeShotDto, rating: number): string {
    return [
      `Shot analysis (offline rules · rating ${rating})`,
      `Focus: ${dto.focus ?? 'general'} · Game: ${dto.game ?? 'n/a'}`,
      dto.videoUrl ? `Clip: ${dto.videoUrl}` : 'No video — text-only tips.',
      '',
      'Aim: Pause on the final alignment; eye on object ball last.',
      'Speed: Prefer firm-enough for position over soft misses.',
      'Spin: Minimize unnecessary english on long shots.',
      'Consistency: Same bridge height and pre-shot routine every stroke.',
      '',
      'Fixes: (1) 10 stop-shots (2) 10 follow/draw pairs (3) film one make from side view.',
      '',
      'When RealAI is online, this endpoint upgrades to provider analysis automatically.',
    ].join('\n');
  }
}
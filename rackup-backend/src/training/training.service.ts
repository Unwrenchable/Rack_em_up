import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchMemory } from '../memories/match-memory.entity';
import { User } from '../users/users.entity';
import {
  getRealAiStatus,
  realAiChatOrFallback,
} from '../ai/realai.client';
import { realaiCoach } from '../ai/realai-coach.client';
import { AnalyzeShotDto } from './dto/analyze-shot.dto';
import {
  drillsFromChatContent,
  drillsFromCoachResult,
  type DrillPlan,
} from './parse-coach-drills';

export type { DrillPlan } from './parse-coach-drills';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    @InjectRepository(MatchMemory)
    private readonly memoriesRepo: Repository<MatchMemory>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
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

    // Secondary harvest: OpenAI-compatible chat, with a tolerant parser
    // (fenced JSON / practice_plan / numbered prose) — not a bare-array parse.
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

  async analyzeShot(userId: string, dto: AnalyzeShotDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const rating = user?.rating ?? 500;

    const ai = await realAiChatOrFallback(
      [
        {
          role: 'system',
          content:
            'You are a pool shot coach. Given notes and optional video URL context, give structured feedback: aim, speed, spin, consistency, and 3 concrete fixes. Plain text, concise, no fluff.',
        },
        {
          role: 'user',
          content: [
            `Player rating: ${rating}`,
            `Game: ${dto.game ?? 'unspecified'}`,
            `Focus: ${dto.focus ?? 'general'}`,
            `Video URL: ${dto.videoUrl ?? 'none (text-only analysis)'}`,
            `Notes: ${dto.notes ?? 'none'}`,
            'Analyze and coach.',
          ].join('\n'),
        },
      ],
      () =>
        this.fallbackAnalysis(dto, rating),
      { temperature: 0.45, maxTokens: 900 },
    );

    return {
      analysis: ai.content,
      provider: ai.offlineFallback ? 'rules-fallback' : 'realai',
      model: ai.model,
      offlineFallback: ai.offlineFallback,
      videoUrl: dto.videoUrl ?? null,
      // Future: RealAI vision / multi-agent task once analysis-clean stabilizes
      future: {
        visionPipeline: 'POST RealAI /v1/chat/completions multimodal or /v1/tasks',
        status: 'scaffold-ready',
      },
    };
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
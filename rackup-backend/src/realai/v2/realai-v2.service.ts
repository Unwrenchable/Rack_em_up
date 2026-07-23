import { Injectable } from '@nestjs/common';

import { realAiChatOrFallback } from '../../ai/realai.client';

import { CoachDto } from './dto/coach.dto';
import { MatchSummaryDto } from './dto/match-summary.dto';
import { PlayerInsightsDto } from './dto/player-insights.dto';
import { ShotOfTheDayDto } from './dto/shot-of-the-day.dto';

@Injectable()
export class RealaiV2Service {
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


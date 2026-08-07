import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RealaiV2Service } from './realai-v2.service';
import { CoachDto } from './dto/coach.dto';
import { MatchSummaryDto } from './dto/match-summary.dto';
import { PlayerInsightsDto } from './dto/player-insights.dto';
import { ShotOfTheDayDto } from './dto/shot-of-the-day.dto';
import type { RackUpCoachRequest } from '../../ai/realai-coach.client';

@Controller('realai/v2')
export class RealaiV2Controller {
  constructor(private readonly realaiV2: RealaiV2Service) {}

  /**
   * Public structured maps (catalog fallback) — work when RealAI is offline.
   */
  @Get('sotd/maps')
  async listSotdMaps() {
    return this.realaiV2.getSotdMaps();
  }

  @Get('sotd/map/:id')
  async getSotdMap(@Param('id') id: string) {
    return this.realaiV2.getSotdMap(id);
  }

  @Get('summary-job/:jobId')
  async getSummaryJob(@Param('jobId') jobId: string) {
    return this.realaiV2.getSummaryJob(jobId);
  }

  @Post('summary-job')
  @UseGuards(AuthGuard('jwt'))
  async submitSummaryJob(@Req() req: any, @Body() dto: MatchSummaryDto) {
    return this.realaiV2.submitSummaryJob({ ...dto, userId: req.user?.id });
  }

  /**
   * Canonical ability passthrough — body matches contract §2 envelope.
   * POST /api/v1/realai/v2/coach-plugin
   */
  @Post('coach-plugin')
  @UseGuards(AuthGuard('jwt'))
  async coachPlugin(@Req() req: any, @Body() body: RackUpCoachRequest) {
    const player = {
      ...body.player,
      player_id: body.player?.player_id ?? req.user.id,
    };
    return this.realaiV2.invoke({ ...body, player });
  }

  @Post('coach')
  @UseGuards(AuthGuard('jwt'))
  async coach(@Req() req: any, @Body() dto: CoachDto) {
    return this.realaiV2.coach(req.user.id, dto as any);
  }

  @Post('match-summary')
  @UseGuards(AuthGuard('jwt'))
  async matchSummary(@Req() req: any, @Body() dto: MatchSummaryDto) {
    return this.realaiV2.matchSummary(req.user.id, dto);
  }

  @Post('player-insights')
  @UseGuards(AuthGuard('jwt'))
  async playerInsights(@Req() req: any, @Body() dto: PlayerInsightsDto) {
    return this.realaiV2.playerInsights(req.user.id, dto);
  }

  @Post('shot-of-the-day')
  @UseGuards(AuthGuard('jwt'))
  async shotOfTheDay(@Req() req: any, @Body() dto: ShotOfTheDayDto) {
    return this.realaiV2.shotOfTheDay(req.user.id, dto as any);
  }

  /** ability: moderation */
  @Post('moderate')
  @UseGuards(AuthGuard('jwt'))
  async moderate(
    @Req() req: any,
    @Body()
    body: {
      text: string;
      context?: {
        channel?: string;
        match_id?: string;
        thread_id?: string;
        prior_flags?: number;
        recipient_id?: string;
      };
    },
  ) {
    return this.realaiV2.moderateChat(req.user.id, body.text ?? '', body.context);
  }

  /** ability: league_validate */
  @Post('league-validate')
  @UseGuards(AuthGuard('jwt'))
  async leagueValidate(
    @Req() req: any,
    @Body()
    body: {
      payload: Record<string, unknown>;
      player?: Record<string, unknown>;
    },
  ) {
    return this.realaiV2.leagueValidate(
      req.user.id,
      body.payload ?? body,
      body.player as any,
    );
  }

  /** ability: matchmaking — RackUp supplies pre-filtered candidates */
  @Post('matchmaking')
  @UseGuards(AuthGuard('jwt'))
  async matchmaking(
    @Req() req: any,
    @Body()
    body: {
      window?: number;
      candidates: Array<Record<string, unknown>>;
      player?: Record<string, unknown>;
    },
  ) {
    return this.realaiV2.matchmakingSuggest(req.user.id, body as any);
  }

  /** ability: pyramid_rules */
  @Post('pyramid-rules')
  @UseGuards(AuthGuard('jwt'))
  async pyramidRules(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.realaiV2.pyramidRules(req.user.id, body as any);
  }

  /** ability: video_analysis */
  @Post('video-analysis')
  @UseGuards(AuthGuard('jwt'))
  async videoAnalysis(
    @Req() req: any,
    @Body()
    body: {
      payload?: Record<string, unknown>;
      player?: Record<string, unknown>;
    },
  ) {
    return this.realaiV2.videoAnalysis(
      req.user.id,
      body.payload ?? (body as Record<string, unknown>),
      body.player as any,
    );
  }
}

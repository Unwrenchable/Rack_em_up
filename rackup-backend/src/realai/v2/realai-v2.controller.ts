import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RealaiV2Service } from './realai-v2.service';
import { CoachDto } from './dto/coach.dto';
import { MatchSummaryDto } from './dto/match-summary.dto';
import { PlayerInsightsDto } from './dto/player-insights.dto';
import { ShotOfTheDayDto } from './dto/shot-of-the-day.dto';

@Controller('realai/v2')
export class RealaiV2Controller {
  constructor(private readonly realaiV2: RealaiV2Service) {}

  /**
   * Public structured maps (catalog fallback) — work when RealAI is offline.
   * GET /api/v1/realai/v2/sotd/maps
   * GET /api/v1/realai/v2/sotd/map/:id
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

  @Post('coach')
  @UseGuards(AuthGuard('jwt'))
  async coach(@Req() req: any, @Body() dto: CoachDto) {
    return this.realaiV2.coach(req.user.id, dto);
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
    return this.realaiV2.shotOfTheDay(req.user.id, dto);
  }
}


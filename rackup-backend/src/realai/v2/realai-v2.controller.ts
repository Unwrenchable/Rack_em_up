import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RealaiV2Service } from './realai-v2.service';
import { CoachDto } from './dto/coach.dto';
import { MatchSummaryDto } from './dto/match-summary.dto';
import { PlayerInsightsDto } from './dto/player-insights.dto';
import { ShotOfTheDayDto } from './dto/shot-of-the-day.dto';

@Controller('realai/v2')
@UseGuards(AuthGuard('jwt'))
export class RealaiV2Controller {
  constructor(private readonly realaiV2: RealaiV2Service) {}

  @Post('coach')
  async coach(@Req() req: any, @Body() dto: CoachDto) {
    return this.realaiV2.coach(req.user.id, dto);
  }

  @Post('match-summary')
  async matchSummary(@Req() req: any, @Body() dto: MatchSummaryDto) {
    return this.realaiV2.matchSummary(req.user.id, dto);
  }

  @Post('player-insights')
  async playerInsights(@Req() req: any, @Body() dto: PlayerInsightsDto) {
    return this.realaiV2.playerInsights(req.user.id, dto);
  }

  @Post('shot-of-the-day')
  async shotOfTheDay(@Req() req: any, @Body() dto: ShotOfTheDayDto) {
    return this.realaiV2.shotOfTheDay(req.user.id, dto);
  }
}


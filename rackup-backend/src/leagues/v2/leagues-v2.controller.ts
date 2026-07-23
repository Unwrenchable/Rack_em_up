import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { LeaguesV2Service } from './leagues-v2.service';
import { CreateLeagueSeasonV2Dto } from './dto/create-league-season-v2.dto';
import { StartLeagueSeasonV2Dto } from './dto/start-league-season-v2.dto';
import { ScheduleLeagueMatchV2Dto } from './dto/schedule-league-match-v2.dto';
import { ReportLeagueMatchV2Dto } from './dto/report-league-match-v2.dto';
import { RatingsImportV2Dto } from './dto/ratings-import-v2.dto';

@Controller('leagues/v2')
@UseGuards(AuthGuard('jwt'))
export class LeaguesV2Controller {
  constructor(private readonly leaguesV2: LeaguesV2Service) {}

  @Post('season/create')
  async createSeason(@Req() req: any, @Body() dto: CreateLeagueSeasonV2Dto) {
    return this.leaguesV2.createSeason(req.user.id, dto);
  }

  @Post('season/start')
  async startSeason(@Req() req: any, @Body() dto: StartLeagueSeasonV2Dto) {
    return this.leaguesV2.startSeason(req.user.id, dto);
  }

  @Get('season/:id/standings')
  async standings(@Param('id', new ParseUUIDPipe()) seasonId: string) {
    return this.leaguesV2.getStandings(seasonId);
  }

  @Post('season/:id/schedule-match')
  async scheduleMatch(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) seasonId: string,
    @Body() dto: ScheduleLeagueMatchV2Dto,
  ) {
    return this.leaguesV2.scheduleMatch(req.user.id, seasonId, dto);
  }

  @Post('season/:id/report-match')
  async reportMatch(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) seasonId: string,
    @Body() dto: ReportLeagueMatchV2Dto,
  ) {
    return this.leaguesV2.reportMatch(req.user.id, seasonId, dto);
  }

  @Post('ratings/import')
  async importRatings(@Req() req: any, @Body() dto: RatingsImportV2Dto) {
    return this.leaguesV2.importExternalRatings(req.user.id, dto);
  }

  @Get('ratings/player/:playerId')
  async playerRatings(@Param('playerId', new ParseUUIDPipe()) playerId: string) {
    return this.leaguesV2.getUnifiedPlayerRating(playerId);
  }
}


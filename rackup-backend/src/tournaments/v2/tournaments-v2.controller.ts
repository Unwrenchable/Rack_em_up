import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { TournamentsV2Service } from './tournaments-v2.service';
import { CreateTournamentV2Dto } from './dto/create-tournament-v2.dto';
import { RegisterTournamentV2Dto } from './dto/register-tournament-v2.dto';
import { StartTournamentV2Dto } from './dto/start-tournament-v2.dto';
import { ReportMatchV2Dto } from './dto/report-match-v2.dto';
import {
  AdminReseedDto,
  AdminSwapPlayersDto,
  AdminUpdateMatchScoreDto,
} from './dto/admin-bracket.dto';

@Controller('tournaments/v2')
export class TournamentsV2Controller {
  constructor(private readonly tournamentsV2: TournamentsV2Service) {}

  /** Public TV / spectator board JSON */
  @Get('tv/:id')
  async tv(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getTvPayload(id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async list(@Query('limit') limit?: string) {
    return this.tournamentsV2.list(limit ? Number(limit) : 40);
  }

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  async create(@Req() req: any, @Body() dto: CreateTournamentV2Dto) {
    return this.tournamentsV2.create(req.user.id, dto);
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  async register(@Req() req: any, @Body() dto: RegisterTournamentV2Dto) {
    return this.tournamentsV2.register(req.user.id, dto);
  }

  @Post('start')
  @UseGuards(AuthGuard('jwt'))
  async start(@Req() req: any, @Body() dto: StartTournamentV2Dto) {
    return this.tournamentsV2.start(req.user.id, dto);
  }

  @Post('report-match')
  @UseGuards(AuthGuard('jwt'))
  async reportMatch(@Req() req: any, @Body() dto: ReportMatchV2Dto) {
    return this.tournamentsV2.reportMatch(req.user.id, dto);
  }

  @Get('bracket/:id')
  @UseGuards(AuthGuard('jwt'))
  async bracket(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getBracket(id);
  }

  @Get('rounds/:id')
  @UseGuards(AuthGuard('jwt'))
  async rounds(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getRounds(id);
  }

  @Get('standings/:id')
  @UseGuards(AuthGuard('jwt'))
  async standings(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getStandings(id);
  }

  // --- Admin (organizer) ---

  @Post('admin/update-score')
  @UseGuards(AuthGuard('jwt'))
  async adminUpdateScore(@Req() req: any, @Body() dto: AdminUpdateMatchScoreDto) {
    return this.tournamentsV2.adminUpdateMatchScore(req.user.id, dto);
  }

  @Post('admin/swap-players')
  @UseGuards(AuthGuard('jwt'))
  async adminSwap(@Req() req: any, @Body() dto: AdminSwapPlayersDto) {
    return this.tournamentsV2.adminSwapPlayers(req.user.id, dto);
  }

  @Post('admin/reseed')
  @UseGuards(AuthGuard('jwt'))
  async adminReseed(@Req() req: any, @Body() dto: AdminReseedDto) {
    return this.tournamentsV2.adminReseed(req.user.id, dto);
  }

  @Post('admin/advance-swiss')
  @UseGuards(AuthGuard('jwt'))
  async advanceSwiss(@Req() req: any, @Body() body: { tournamentId: string }) {
    return this.tournamentsV2.advanceSwissRound(req.user.id, body.tournamentId);
  }
}

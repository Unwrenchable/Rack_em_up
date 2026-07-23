import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { TournamentsV2Service } from './tournaments-v2.service';
import { CreateTournamentV2Dto } from './dto/create-tournament-v2.dto';
import { RegisterTournamentV2Dto } from './dto/register-tournament-v2.dto';
import { StartTournamentV2Dto } from './dto/start-tournament-v2.dto';
import { ReportMatchV2Dto } from './dto/report-match-v2.dto';

@Controller('tournaments/v2')
@UseGuards(AuthGuard('jwt'))
export class TournamentsV2Controller {
  constructor(private readonly tournamentsV2: TournamentsV2Service) {}

  @Post('create')
  async create(@Req() req: any, @Body() dto: CreateTournamentV2Dto) {
    return this.tournamentsV2.create(req.user.id, dto);
  }

  @Post('register')
  async register(@Req() req: any, @Body() dto: RegisterTournamentV2Dto) {
    return this.tournamentsV2.register(req.user.id, dto);
  }

  @Post('start')
  async start(@Req() req: any, @Body() dto: StartTournamentV2Dto) {
    return this.tournamentsV2.start(req.user.id, dto);
  }

  @Post('report-match')
  async reportMatch(@Req() req: any, @Body() dto: ReportMatchV2Dto) {
    return this.tournamentsV2.reportMatch(req.user.id, dto);
  }

  @Get('bracket/:id')
  async bracket(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getBracket(id);
  }

  @Get('rounds/:id')
  async rounds(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getRounds(id);
  }

  @Get('standings/:id')
  async standings(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsV2.getStandings(id);
  }
}


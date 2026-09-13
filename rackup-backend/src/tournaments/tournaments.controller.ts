import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { RegisterTournamentDto } from './dto/register-tournament.dto';
import { ReportTournamentMatchDto } from './dto/report-tournament-match.dto';
import { TOURNAMENT_V1_UUID_PARAM } from './tournament-route.constants';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  async listTournaments() {
    return this.tournamentsService.listTournaments();
  }

  @Post()
  async createTournament(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.createTournament(dto);
  }

  @Get(TOURNAMENT_V1_UUID_PARAM)
  async getTournament(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsService.getTournament(id);
  }

  @Post(`${TOURNAMENT_V1_UUID_PARAM}/register`)
  async register(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RegisterTournamentDto,
  ) {
    return this.tournamentsService.registerToTournament(id, dto);
  }

  @Post(`${TOURNAMENT_V1_UUID_PARAM}/report-match`)
  async reportMatch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReportTournamentMatchDto,
  ) {
    return this.tournamentsService.reportTournamentMatch(id, dto);
  }

  // ⭐ NEW — bracket visualizer
  @Get(`${TOURNAMENT_V1_UUID_PARAM}/bracket`)
  async bracket(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tournamentsService.generateBracket(id);
  }

  // ⭐ NEW — advance round
  @Post(`${TOURNAMENT_V1_UUID_PARAM}/advance`)
  async advance(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { round: number },
  ) {
    return this.tournamentsService.advanceRound(id, body.round);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateLeagueDto } from './dto/create-league.dto';
import { CreateLeagueTeamDto } from './dto/create-league-team.dto';
import { LeagueStatus } from './leagues.entity';
import { LeaguesService } from './leagues.service';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  async list() {
    return this.leaguesService.listLeagues();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreateLeagueDto, @Req() req: any) {
    return this.leaguesService.createLeague(dto, req.user.id);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.leaguesService.getLeague(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/teams')
  async createTeam(@Param('id') leagueId: string, @Body() dto: CreateLeagueTeamDto) {
    return this.leaguesService.createTeam(leagueId, dto);
  }

  @Get(':id/teams')
  async listTeams(@Param('id') leagueId: string) {
    return this.leaguesService.listTeams(leagueId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  async setStatus(
    @Param('id') leagueId: string,
    @Query('status') status: LeagueStatus,
  ) {
    return this.leaguesService.setLeagueStatus(leagueId, status);
  }
}

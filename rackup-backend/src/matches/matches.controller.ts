import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePoolMatchDto } from './dto/create-pool-match.dto';
import { ReportPoolMatchDto } from './dto/report-pool-match.dto';
import { PyramidPocketDto } from './dto/pyramid-pocket.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /** Pyramid skill × table presets for match creation UI */
  @Get('pyramid/presets')
  pyramidPresets() {
    return this.matchesService.listPyramidPresets();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreatePoolMatchDto) {
    return this.matchesService.create(dto);
  }

  @Get(':id/scoreboard')
  async scoreboard(@Param('id') id: string) {
    return this.matchesService.getScoreboard(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/pyramid/pocket')
  async pyramidPocket(@Param('id') id: string, @Body() dto: PyramidPocketDto) {
    return this.matchesService.pyramidPocket(id, dto.playerId, dto.balls);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/report')
  async report(@Param('id') id: string, @Body() dto: ReportPoolMatchDto) {
    return this.matchesService.reportResult(id, dto);
  }
}

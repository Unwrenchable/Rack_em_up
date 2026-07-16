import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePoolMatchDto } from './dto/create-pool-match.dto';
import { ReportPoolMatchDto } from './dto/report-pool-match.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreatePoolMatchDto) {
    return this.matchesService.create(dto);
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
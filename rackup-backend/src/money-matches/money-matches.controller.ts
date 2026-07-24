import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MoneyMatchesService } from './money-matches.service';
import { CreateMoneyMatchDto } from './dto/create-money-match.dto';
import { ConfirmMoneyMatchDto } from './dto/confirm-money-match.dto';
import { DisputeMoneyMatchDto } from './dto/dispute-money-match.dto';
import { CompleteMoneyMatchDto } from './dto/complete-money-match.dto';

@Controller('money-matches')
export class MoneyMatchesController {
  constructor(private readonly moneyMatchesService: MoneyMatchesService) {}

  @Post()
  async create(@Body() dto: CreateMoneyMatchDto) {
    return this.moneyMatchesService.create(dto);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @Body() dto: ConfirmMoneyMatchDto) {
    dto.matchId = id;
    return this.moneyMatchesService.confirm(dto);
  }

  @Post(':id/dispute')
  async dispute(@Param('id') id: string, @Body() dto: DisputeMoneyMatchDto) {
    dto.matchId = id;
    return this.moneyMatchesService.dispute(dto);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() dto: CompleteMoneyMatchDto) {
    return this.moneyMatchesService.complete({ ...dto, matchId: id });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.moneyMatchesService.findOne(id);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('playerId') playerId?: string,
    @Query('hallId') hallId?: string,
  ) {
    return this.moneyMatchesService.findAll({ status, playerId, hallId });
  }
}

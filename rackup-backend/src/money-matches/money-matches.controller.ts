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
import { MoneyMatchesService } from './money-matches.service';
import { CreateMoneyMatchDto } from './dto/create-money-match.dto';
import { ConfirmMoneyMatchDto } from './dto/confirm-money-match.dto';
import { DisputeMoneyMatchDto } from './dto/dispute-money-match.dto';
import { CompleteMoneyMatchDto } from './dto/complete-money-match.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('money-matches')
export class MoneyMatchesController {
  constructor(private readonly moneyMatchesService: MoneyMatchesService) {}

  /** Static paths before :id params */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('playerId') playerId?: string,
    @Query('hallId') hallId?: string,
  ) {
    return this.moneyMatchesService.findAll({ status, playerId, hallId });
  }

  @Get('audit/export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'HALL_OWNER', 'ORGANIZER')
  async exportAudit(
    @Query('matchId') matchId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moneyMatchesService.exportAudit({
      matchId,
      action,
      limit: limit ? Number(limit) : 200,
    });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() dto: CreateMoneyMatchDto) {
    return this.moneyMatchesService.create(dto);
  }

  @Post(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  async confirm(@Param('id') id: string, @Body() dto: ConfirmMoneyMatchDto) {
    dto.matchId = id;
    return this.moneyMatchesService.confirm(dto);
  }

  @Post(':id/dispute')
  @UseGuards(AuthGuard('jwt'))
  async dispute(
    @Param('id') id: string,
    @Body() dto: DisputeMoneyMatchDto,
    @Req() req: any,
  ) {
    dto.matchId = id;
    return this.moneyMatchesService.dispute({
      ...dto,
      filedBy: req.user?.id,
    });
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard('jwt'))
  async complete(@Param('id') id: string, @Body() dto: CompleteMoneyMatchDto) {
    return this.moneyMatchesService.complete({ ...dto, matchId: id });
  }

  /**
   * Arbiter resolve DISPUTED match.
   * Roles: ADMIN | HALL_OWNER | ORGANIZER
   */
  @Post(':id/resolve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'HALL_OWNER', 'ORGANIZER')
  async resolve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: any,
  ) {
    if (req.user?.id) dto.arbiterId = req.user.id;
    return this.moneyMatchesService.resolveDispute(id, dto, req.user?.role);
  }

  @Get(':id/audit')
  @UseGuards(AuthGuard('jwt'))
  async audit(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.moneyMatchesService.getAudit(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.moneyMatchesService.findOne(id);
  }
}

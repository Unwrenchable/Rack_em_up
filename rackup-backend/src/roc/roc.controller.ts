import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { RocLeagueService } from './roc-league.service';
import { RocPaymentService } from './roc-payment.service';
import { RocPayoutService } from './roc-payout.service';
import { RocBalanceService } from './roc-balance.service';
import { RocLedgerService } from './roc-ledger.service';
import { RocLedgerAuditService } from './roc-ledger-audit.service';
import type { RocPayMethod } from './entities/roc-payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RocSession } from './entities/roc-session.entity';
import { NotFoundException } from '@nestjs/common';

class CreateLeagueDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

class CreateSessionDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  entryFeeUsdCents!: number;

  @IsOptional()
  @IsString()
  gameStyle?: string;

  @IsOptional()
  @IsString()
  format?: string;
}

class CheckoutDto {
  @IsUUID()
  entryId!: string;

  @IsIn(['card', 'apple_pay', 'google_pay', 'usdc'])
  method!: RocPayMethod;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

class StandingDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsInt()
  wins?: number;

  @IsOptional()
  @IsInt()
  losses?: number;

  @IsOptional()
  @IsInt()
  points?: number;

  @IsOptional()
  @IsInt()
  place?: number;
}

class PayoutPrefsDto {
  @IsOptional()
  @IsIn(['stripe_bank', 'usdc'])
  preferredPayoutMethod?: 'stripe_bank' | 'usdc';

  @IsOptional()
  @IsString()
  usdcWalletAddress?: string;

  @IsOptional()
  @IsString()
  stripeConnectAccountId?: string;
}

@Controller('roc')
@UseGuards(AuthGuard('jwt'))
export class RocController {
  constructor(
    private readonly leagues: RocLeagueService,
    private readonly payments: RocPaymentService,
    private readonly payouts: RocPayoutService,
    private readonly balances: RocBalanceService,
    private readonly ledger: RocLedgerService,
    private readonly audit: RocLedgerAuditService,
    @InjectRepository(RocSession)
    private readonly sessions: Repository<RocSession>,
  ) {}

  // ─── Profile wallet ─────────────────────────────────────────────────────

  @Get('wallet')
  wallet(@Req() req: { user: { id: string } }) {
    return this.balances.profileMoney(req.user.id);
  }

  @Patch('wallet/preferences')
  walletPrefs(
    @Req() req: { user: { id: string } },
    @Body() body: PayoutPrefsDto,
  ) {
    return this.balances.updatePreferences(req.user.id, body);
  }

  // ─── Leagues ────────────────────────────────────────────────────────────

  @Post('leagues')
  createLeague(
    @Req() req: { user: { id: string } },
    @Body() body: CreateLeagueDto,
  ) {
    return this.leagues.create(req.user.id, body);
  }

  @Get('leagues/mine')
  myLeagues(@Req() req: { user: { id: string } }) {
    return this.leagues.listForUser(req.user.id);
  }

  @Get('leagues/:id')
  getLeague(@Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.get(id);
  }

  @Get('leagues/:id/dashboard')
  dashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.leagues.operatorDashboard(req.user.id, id);
  }

  @Get('leagues/:id/ledger')
  async ledgerView(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
    @Query('sessionId') sessionId?: string,
  ) {
    await this.leagues.assertOperator(id, req.user.id);
    const rows = await this.ledger.listEntries(id, { sessionId, limit: 200 });
    const bar = await this.ledger.moneyBar(id);
    return { moneyBar: bar, entries: rows };
  }

  // ─── Sessions ───────────────────────────────────────────────────────────

  @Post('leagues/:id/sessions')
  createSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
    @Body() body: CreateSessionDto,
  ) {
    return this.leagues.createSession(req.user.id, id, body);
  }

  @Post('sessions/:id/open')
  openSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.leagues.openSession(req.user.id, id);
  }

  @Post('sessions/:id/enter')
  enterSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.leagues.createSessionEntry(req.user.id, id);
  }

  @Get('sessions/:id/projections')
  projections(@Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.projections(id);
  }

  @Post('sessions/:id/standings')
  setStanding(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
    @Body() body: StandingDto,
  ) {
    return this.leagues.setStanding(req.user.id, id, body);
  }

  /**
   * End session → RealAI ledger_audit + payout_sanity → auto payout if clear.
   * Body: { acknowledgeWarnings?: boolean, overrideNote?: string }
   */
  @Post('sessions/:id/close')
  closeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
    @Body()
    body?: { acknowledgeWarnings?: boolean; overrideNote?: string },
  ) {
    return this.payouts.closeSessionAndPayout({
      sessionId: id,
      actorUserId: req.user.id,
      acknowledgeWarnings: body?.acknowledgeWarnings,
      overrideNote: body?.overrideNote,
    });
  }

  /** Re-run RealAI ledger_audit + payout_sanity (read-only). */
  @Post('sessions/:id/audit')
  async runAudit(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    await this.leagues.assertOperator(session.rocLeagueId, req.user.id);
    const bundle = await this.audit.runSessionAudit(id);
    return {
      ...bundle,
      // authorize_payout always false from RealAI
      authorize_payout: false,
      owns_ledger: false,
      label:
        bundle.uiStatus === 'pass'
          ? 'Pass'
          : bundle.uiStatus === 'warnings'
            ? 'Warnings'
            : 'Blocked',
    };
  }

  /** Stored audit status + plain-language findings for operator UI */
  @Get('sessions/:id/audit')
  async getAudit(@Param('id', ParseUUIDPipe) id: string) {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return {
      sessionId: id,
      sessionStatus: session.status,
      ...this.audit.getStoredAudit(session),
      authorize_payout: false,
      owns_ledger: false,
    };
  }

  /**
   * Release payout after warnings (or re-attempt after investigate).
   * Blockers cannot be overridden without re-audit clearing them.
   */
  @Post('sessions/:id/release-payout')
  releasePayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
    @Body() body?: { overrideNote?: string },
  ) {
    return this.payouts.closeSessionAndPayout({
      sessionId: id,
      actorUserId: req.user.id,
      acknowledgeWarnings: true,
      overrideNote: body?.overrideNote ?? 'Operator released payout after audit',
      skipReaudit: false,
    });
  }

  // ─── Checkout ───────────────────────────────────────────────────────────

  @Post('checkout')
  checkout(
    @Req() req: { user: { id: string } },
    @Body() body: CheckoutDto,
  ) {
    return this.payments.startCheckout({
      payerUserId: req.user.id,
      entryId: body.entryId,
      method: body.method,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  /** Dev mock: confirm without Stripe webhook */
  @Post('checkout/:paymentId/mock-confirm')
  mockConfirm(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.payments.mockConfirm(paymentId, req.user.id);
  }
}

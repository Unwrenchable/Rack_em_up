import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { RocPayment, type RocPayMethod } from './entities/roc-payment.entity';
import { RocEntry } from './entities/roc-entry.entity';
import { RocLeague, ROC_DEFAULT_SPLIT } from './entities/roc-league.entity';
import { RocSession } from './entities/roc-session.entity';
import { RocLedgerService } from './roc-ledger.service';
import { RocStripeService } from './roc-stripe.service';
import { cents, centsStr, formatUsd, normalizeSplit } from './roc-money.util';

@Injectable()
export class RocPaymentService {
  private readonly logger = new Logger(RocPaymentService.name);

  constructor(
    @InjectRepository(RocPayment)
    private readonly payments: Repository<RocPayment>,
    @InjectRepository(RocEntry)
    private readonly entries: Repository<RocEntry>,
    @InjectRepository(RocLeague)
    private readonly leagues: Repository<RocLeague>,
    @InjectRepository(RocSession)
    private readonly sessions: Repository<RocSession>,
    private readonly ledger: RocLedgerService,
    private readonly stripe: RocStripeService,
  ) {}

  /**
   * Start in-app checkout for a due entry (single USD amount).
   * Player chooses card or USDC; Stripe Checkout / Payment Sheet handles rails.
   */
  async startCheckout(input: {
    payerUserId: string;
    entryId: string;
    method: RocPayMethod;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    const entry = await this.entries.findOne({ where: { id: input.entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.userId !== input.payerUserId) {
      throw new BadRequestException('Not your entry');
    }
    if (entry.status === 'PAID') {
      throw new BadRequestException('Entry already paid');
    }

    const due = cents(entry.amountDueCents) - cents(entry.amountPaidCents);
    if (due <= 0) throw new BadRequestException('Nothing due');

    const league = await this.leagues.findOne({ where: { id: entry.rocLeagueId } });
    if (!league) throw new NotFoundException('ROC league not found');

    const paymentId = randomUUID();
    const idempotencyKey = `entry:${entry.id}:pay:${paymentId.slice(0, 8)}`;

    const payment = await this.payments.save(
      this.payments.create({
        id: paymentId,
        rocLeagueId: entry.rocLeagueId,
        sessionId: entry.sessionId,
        entryId: entry.id,
        payerUserId: input.payerUserId,
        amountUsdCents: centsStr(due),
        currency: 'USD',
        method: input.method,
        status: 'pending',
        idempotencyKey,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        stripeClientSecret: null,
        checkoutUrl: null,
        splitJson: null,
        ledgerGroupId: null,
        confirmedAt: null,
        metadataJson: {
          entry_kind: entry.entryKind,
          label: entry.label,
        },
      }),
    );

    const checkout = await this.stripe.createCheckout({
      amountUsdCents: due,
      method: input.method,
      paymentId: payment.id,
      payerUserId: input.payerUserId,
      rocLeagueId: entry.rocLeagueId,
      entryId: entry.id,
      sessionId: entry.sessionId,
      description:
        entry.label ??
        `ROC ${entry.entryKind.replace(/_/g, ' ').toLowerCase()} — ${formatUsd(due)}`,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    payment.stripeCheckoutSessionId = checkout.checkoutSessionId;
    payment.stripePaymentIntentId = checkout.paymentIntentId;
    payment.stripeClientSecret = checkout.clientSecret;
    payment.checkoutUrl = checkout.checkoutUrl;
    await this.payments.save(payment);

    const splitPreview = normalizeSplit(
      entry.sessionId
        ? (
            await this.sessions.findOne({ where: { id: entry.sessionId } })
          )?.splitSnapshot ?? league.defaultSplit
        : league.defaultSplit,
    );

    return {
      paymentId: payment.id,
      amountUsdCents: due,
      amountUsd: formatUsd(due),
      currency: 'USD',
      method: input.method,
      status: payment.status,
      checkoutUrl: payment.checkoutUrl,
      clientSecret: payment.stripeClientSecret,
      stripeMode: checkout.mode,
      /** Shown on pay confirm UI before charge */
      splitPreview: {
        playersFundBps: splitPreview.players_fund_bps,
        operatorBps: splitPreview.operator_bps,
        platformBps: splitPreview.platform_bps,
        label: '45% Players Fund · 35% ROC Operator · 20% RackUp',
      },
    };
  }

  /**
   * ONLY path that credits the ROC USD ledger for pay-ins.
   * Invoked from Stripe webhook (or mock confirm for local dev).
   */
  async confirmFromWebhook(input: {
    paymentId?: string;
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    method?: RocPayMethod;
  }): Promise<{ ok: true; paymentId: string; already?: boolean }> {
    let payment: RocPayment | null = null;
    if (input.paymentId) {
      payment = await this.payments.findOne({ where: { id: input.paymentId } });
    }
    if (!payment && input.stripePaymentIntentId) {
      payment = await this.payments.findOne({
        where: { stripePaymentIntentId: input.stripePaymentIntentId },
      });
    }
    if (!payment && input.stripeCheckoutSessionId) {
      payment = await this.payments.findOne({
        where: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
      });
    }
    if (!payment) throw new NotFoundException('ROC payment not found for webhook');

    if (payment.status === 'confirmed' || payment.status === 'paid') {
      return { ok: true, paymentId: payment.id, already: true };
    }

    if (input.method) payment.method = input.method;
    if (input.stripePaymentIntentId) {
      payment.stripePaymentIntentId = input.stripePaymentIntentId;
    }

    const league = await this.leagues.findOne({ where: { id: payment.rocLeagueId } });
    let split = normalizeSplit(league?.defaultSplit ?? ROC_DEFAULT_SPLIT);
    if (payment.sessionId) {
      const session = await this.sessions.findOne({ where: { id: payment.sessionId } });
      if (session?.splitSnapshot) split = normalizeSplit(session.splitSnapshot);
    }

    const amount = cents(payment.amountUsdCents);
    const credited = await this.ledger.creditPaymentSplit({
      rocLeagueId: payment.rocLeagueId,
      paymentId: payment.id,
      amountUsdCents: amount,
      split,
      payerUserId: payment.payerUserId,
      sessionId: payment.sessionId,
      entryId: payment.entryId,
      method: payment.method,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      entryType:
        payment.metadataJson?.entry_kind === 'SEASON_DUES'
          ? 'DUES_IN'
          : 'SESSION_ENTRY_IN',
    });

    payment.status = 'confirmed';
    payment.confirmedAt = new Date();
    payment.ledgerGroupId = credited.groupId;
    payment.splitJson = {
      players_fund_cents: credited.players_fund_cents,
      operator_cents: credited.operator_cents,
      platform_cents: credited.platform_cents,
      bps: split,
    };
    await this.payments.save(payment);

    if (payment.entryId) {
      const entry = await this.entries.findOne({ where: { id: payment.entryId } });
      if (entry) {
        const paid = cents(entry.amountPaidCents) + amount;
        entry.amountPaidCents = centsStr(paid);
        entry.status =
          paid >= cents(entry.amountDueCents) ? 'PAID' : 'PARTIAL';
        await this.entries.save(entry);
      }
    }

    this.logger.log(`payment confirmed ${payment.id} amount=${amount} method=${payment.method}`);
    return { ok: true, paymentId: payment.id };
  }

  /** Dev-only: simulate Stripe success without webhook. */
  async mockConfirm(paymentId: string, userId: string) {
    const payment = await this.payments.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.payerUserId !== userId) throw new BadRequestException('Not your payment');
    if (this.stripe.isLive()) {
      throw new BadRequestException('Mock confirm disabled when Stripe is live');
    }
    return this.confirmFromWebhook({
      paymentId,
      stripePaymentIntentId: payment.stripePaymentIntentId ?? undefined,
      method: payment.method,
    });
  }
}

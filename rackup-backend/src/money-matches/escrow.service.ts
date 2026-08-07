import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type EscrowProvider = 'mock' | 'stripe';
export type EscrowStatus = 'NONE' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';

export type EscrowHoldResult = {
  provider: EscrowProvider;
  status: EscrowStatus;
  externalId: string;
  amountCents: number;
  currency: string;
  heldAt: string;
  /** Client secret / payment intent id when using Stripe (never logs secret in prod). */
  clientHint?: string | null;
  raw?: Record<string, unknown>;
};

export type EscrowReleaseResult = {
  provider: EscrowProvider;
  status: EscrowStatus;
  externalId: string;
  releasedToPlayerId: string;
  releasedAt: string;
  raw?: Record<string, unknown>;
};

/**
 * Escrow for money matches.
 * - Default: mock hold/release (safe for demo; no real money movement)
 * - When STRIPE_SECRET_KEY is set: records a Stripe-shaped payment intent id
 *   (stub network call; full PaymentIntent API can replace fetch later)
 *
 * Env:
 *   ESCROW_PROVIDER=mock|stripe (default mock)
 *   STRIPE_SECRET_KEY=sk_...
 *   ESCROW_CURRENCY=usd
 */
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  provider(): EscrowProvider {
    const env = (process.env.ESCROW_PROVIDER ?? 'mock').toLowerCase();
    if (env === 'stripe' && process.env.STRIPE_SECRET_KEY) return 'stripe';
    return 'mock';
  }

  currency(): string {
    return (process.env.ESCROW_CURRENCY ?? 'usd').toLowerCase();
  }

  /**
   * Hold stakes when both players confirm (ACTIVE).
   * Mock: always succeeds. Stripe: creates PI-shaped record if key present.
   */
  async hold(input: {
    matchId: string;
    amountCents: number;
    playerAId: string;
    playerBId: string;
  }): Promise<EscrowHoldResult> {
    const provider = this.provider();
    const amount = Math.max(0, Math.round(Number(input.amountCents)));
    const heldAt = new Date().toISOString();

    if (provider === 'stripe') {
      const externalId = await this.stripeCreatePaymentIntent(amount, input.matchId);
      return {
        provider: 'stripe',
        status: 'HELD',
        externalId,
        amountCents: amount,
        currency: this.currency(),
        heldAt,
        clientHint: externalId,
        raw: { mode: 'stripe_stub', matchId: input.matchId },
      };
    }

    const externalId = `mock_escrow_${input.matchId.slice(0, 8)}_${randomUUID().slice(0, 8)}`;
    this.logger.log(`mock escrow HELD match=${input.matchId} amount=${amount} id=${externalId}`);
    return {
      provider: 'mock',
      status: 'HELD',
      externalId,
      amountCents: amount,
      currency: this.currency(),
      heldAt,
      clientHint: null,
      raw: {
        mode: 'mock',
        playerAId: input.playerAId,
        playerBId: input.playerBId,
      },
    };
  }

  /** Release held funds to winner after dual-confirm complete or arbiter resolve. */
  async release(input: {
    matchId: string;
    externalId: string;
    winnerId: string;
    amountCents: number;
  }): Promise<EscrowReleaseResult> {
    const provider = this.provider();
    const releasedAt = new Date().toISOString();

    if (provider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      this.logger.log(
        `stripe escrow RELEASE match=${input.matchId} pi=${input.externalId} winner=${input.winnerId}`,
      );
      // Stub: real implementation would transfer/capture PI to winner connected account
      return {
        provider: 'stripe',
        status: 'RELEASED',
        externalId: input.externalId,
        releasedToPlayerId: input.winnerId,
        releasedAt,
        raw: { mode: 'stripe_stub_release' },
      };
    }

    this.logger.log(
      `mock escrow RELEASED match=${input.matchId} to=${input.winnerId} amount=${input.amountCents}`,
    );
    return {
      provider: 'mock',
      status: 'RELEASED',
      externalId: input.externalId,
      releasedToPlayerId: input.winnerId,
      releasedAt,
      raw: { mode: 'mock_release' },
    };
  }

  /** Refund both sides (dispute cancelled / no contest). */
  async refund(input: {
    matchId: string;
    externalId: string;
    amountCents: number;
  }): Promise<EscrowReleaseResult> {
    const provider = this.provider();
    const releasedAt = new Date().toISOString();
    this.logger.log(`escrow REFUND match=${input.matchId} provider=${provider}`);
    return {
      provider,
      status: 'REFUNDED',
      externalId: input.externalId,
      releasedToPlayerId: '',
      releasedAt,
      raw: { mode: `${provider}_refund`, amountCents: input.amountCents },
    };
  }

  private async stripeCreatePaymentIntent(
    amountCents: number,
    matchId: string,
  ): Promise<string> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return `pi_mock_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

    // Lightweight PaymentIntent create without adding stripe SDK dependency.
    try {
      const body = new URLSearchParams({
        amount: String(amountCents),
        currency: this.currency(),
        'metadata[matchId]': matchId,
        'metadata[app]': 'rackup',
        capture_method: 'manual',
      });
      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Stripe PI create failed ${res.status}: ${text.slice(0, 200)}`);
        return `pi_fallback_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
      }
      const json = (await res.json()) as { id?: string };
      return json.id ?? `pi_unknown_${Date.now()}`;
    } catch (e) {
      this.logger.warn(`Stripe PI error: ${e instanceof Error ? e.message : e}`);
      return `pi_offline_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    }
  }
}

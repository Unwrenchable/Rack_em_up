import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { RocPayMethod } from './entities/roc-payment.entity';

/**
 * Stripe rails for ROC (cards, Apple/Google Pay, USDC).
 * Uses REST fetch so we don't require stripe SDK; mock mode when no key.
 *
 * Env:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET (optional verify stub)
 *   ROC_STRIPE_SUCCESS_URL / ROC_STRIPE_CANCEL_URL
 *   ROC_USDC_ENABLED=true — prefer crypto payment method options when set
 */
@Injectable()
export class RocStripeService {
  private readonly logger = new Logger(RocStripeService.name);

  isLive(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  mode(): 'stripe' | 'mock' {
    return this.isLive() ? 'stripe' : 'mock';
  }

  private secret(): string {
    return process.env.STRIPE_SECRET_KEY ?? '';
  }

  /**
   * Create Checkout Session (hosted) or PaymentIntent for Payment Sheet.
   * amountUsdCents is the sole charge amount — always USD.
   */
  async createCheckout(input: {
    amountUsdCents: number;
    currency?: string;
    method: RocPayMethod;
    paymentId: string;
    payerUserId: string;
    rocLeagueId: string;
    entryId?: string | null;
    sessionId?: string | null;
    description: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{
    mode: 'stripe' | 'mock';
    checkoutUrl: string | null;
    checkoutSessionId: string | null;
    paymentIntentId: string | null;
    clientSecret: string | null;
  }> {
    const amount = Math.max(50, Math.round(input.amountUsdCents)); // Stripe min ~$0.50
    const currency = (input.currency ?? 'usd').toLowerCase();
    const success =
      input.successUrl ??
      process.env.ROC_STRIPE_SUCCESS_URL ??
      'http://localhost:5173/wallet?roc_pay=success';
    const cancel =
      input.cancelUrl ??
      process.env.ROC_STRIPE_CANCEL_URL ??
      'http://localhost:5173/wallet?roc_pay=cancel';

    if (!this.isLive()) {
      const mockPi = `pi_mock_${input.paymentId.slice(0, 8)}_${randomUUID().slice(0, 8)}`;
      const mockCs = `cs_mock_${input.paymentId.slice(0, 8)}`;
      this.logger.log(
        `mock checkout payment=${input.paymentId} amount=${amount} method=${input.method}`,
      );
      return {
        mode: 'mock',
        checkoutUrl: `${success}${success.includes('?') ? '&' : '?'}mock_payment_id=${input.paymentId}`,
        checkoutSessionId: mockCs,
        paymentIntentId: mockPi,
        clientSecret: `${mockPi}_secret_mock`,
      };
    }

    // Prefer Checkout Session for in-app redirect flow
    try {
      const params = new URLSearchParams();
      params.set('mode', 'payment');
      params.set('success_url', `${success}&session_id={CHECKOUT_SESSION_ID}`);
      params.set('cancel_url', cancel);
      params.set('client_reference_id', input.paymentId);
      params.set('metadata[roc_payment_id]', input.paymentId);
      params.set('metadata[roc_league_id]', input.rocLeagueId);
      params.set('metadata[payer_user_id]', input.payerUserId);
      if (input.entryId) params.set('metadata[entry_id]', input.entryId);
      if (input.sessionId) params.set('metadata[session_id]', input.sessionId);
      params.set('metadata[method]', input.method);
      params.set('line_items[0][price_data][currency]', currency);
      params.set('line_items[0][price_data][product_data][name]', input.description);
      params.set('line_items[0][price_data][unit_amount]', String(amount));
      params.set('line_items[0][quantity]', '1');

      // Payment method types
      if (input.method === 'usdc') {
        // Crypto / USDC when enabled on Stripe account (Solana preferred when available)
        params.append('payment_method_types[]', 'card');
        if (process.env.ROC_USDC_ENABLED === 'true') {
          // Stripe crypto payment methods vary by account; card fallback always present
          params.set('metadata[prefer_usdc]', '1');
          params.set('metadata[usdc_network]', process.env.ROC_USDC_NETWORK ?? 'solana');
        }
      } else {
        params.append('payment_method_types[]', 'card');
        // Apple Pay / Google Pay ride on card via Checkout when wallets enabled
      }

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secret()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `roc_cs_${input.paymentId}`,
        },
        body: params.toString(),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Stripe Checkout create failed ${res.status}: ${text.slice(0, 240)}`);
        throw new Error(`Stripe Checkout failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        id?: string;
        url?: string;
        payment_intent?: string | { id?: string };
      };
      const pi =
        typeof data.payment_intent === 'string'
          ? data.payment_intent
          : data.payment_intent?.id ?? null;

      return {
        mode: 'stripe',
        checkoutUrl: data.url ?? null,
        checkoutSessionId: data.id ?? null,
        paymentIntentId: pi,
        clientSecret: null,
      };
    } catch (e) {
      this.logger.warn(`createCheckout: ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }

  /** Create Transfer / payout to winner (Connect or mock). */
  async createTransfer(input: {
    amountUsdCents: number;
    payeeUserId: string;
    payoutId: string;
    connectAccountId?: string | null;
    description: string;
    rail: 'stripe_bank' | 'usdc' | 'wallet_credit';
  }): Promise<{ transferId: string; status: 'paid' | 'pending' | 'failed'; raw?: unknown }> {
    const amount = Math.max(0, Math.round(input.amountUsdCents));
    if (amount <= 0) {
      return { transferId: `noop_${input.payoutId}`, status: 'paid' };
    }

    if (!this.isLive() || input.rail === 'wallet_credit') {
      const id = `tr_mock_${input.payoutId.slice(0, 8)}_${randomUUID().slice(0, 6)}`;
      this.logger.log(
        `mock transfer payout=${input.payoutId} amount=${amount} rail=${input.rail} → ${input.payeeUserId}`,
      );
      return { transferId: id, status: 'paid', raw: { mode: 'mock', rail: input.rail } };
    }

    if (!input.connectAccountId) {
      // Credit in-app wallet only when no Connect account
      return {
        transferId: `wallet_${input.payoutId.slice(0, 8)}`,
        status: 'paid',
        raw: { mode: 'wallet_credit_no_connect' },
      };
    }

    try {
      const params = new URLSearchParams();
      params.set('amount', String(amount));
      params.set('currency', 'usd');
      params.set('destination', input.connectAccountId);
      params.set('transfer_group', input.payoutId);
      params.set('metadata[roc_payout_id]', input.payoutId);
      params.set('metadata[payee_user_id]', input.payeeUserId);
      params.set('description', input.description.slice(0, 200));

      const res = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secret()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `roc_tr_${input.payoutId}`,
        },
        body: params.toString(),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Stripe transfer failed ${res.status}: ${text.slice(0, 200)}`);
        return { transferId: '', status: 'failed', raw: { error: text.slice(0, 200) } };
      }
      const data = (await res.json()) as { id?: string };
      return { transferId: data.id ?? `tr_${input.payoutId}`, status: 'paid', raw: data };
    } catch (e) {
      return {
        transferId: '',
        status: 'failed',
        raw: { error: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  /** Minimal webhook signature check (production should use stripe SDK constructEvent). */
  verifyWebhookSignature(_rawBody: string, signature: string | undefined): boolean {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      // Dev: accept without secret
      return true;
    }
    // Stub: require presence of signature header when secret configured
    return Boolean(signature && signature.length > 8);
  }
}

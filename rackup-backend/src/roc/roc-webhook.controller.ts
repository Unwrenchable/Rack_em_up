import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { RocPaymentService } from './roc-payment.service';
import { RocStripeService } from './roc-stripe.service';
import type { RocPayMethod } from './entities/roc-payment.entity';

/**
 * Stripe webhooks — the ONLY production path that credits ROC ledger for pay-ins.
 * Glicko ratings / score validation never touch this controller.
 *
 * POST /api/v1/roc/webhooks/stripe
 */
@Controller('roc/webhooks')
export class RocWebhookController {
  private readonly logger = new Logger(RocWebhookController.name);

  constructor(
    private readonly payments: RocPaymentService,
    private readonly stripe: RocStripeService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers('stripe-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const raw =
      typeof req.rawBody === 'object' && req.rawBody
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body ?? {});

    if (!this.stripe.verifyWebhookSignature(raw, signature)) {
      throw new UnauthorizedException('Invalid Stripe signature');
    }

    const event = body as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const type = event.type ?? '';
    const obj = event.data?.object ?? {};

    this.logger.log(`stripe webhook type=${type}`);

    // Checkout completed
    if (
      type === 'checkout.session.completed' ||
      type === 'checkout.session.async_payment_succeeded'
    ) {
      const paymentId =
        (obj.client_reference_id as string) ||
        ((obj.metadata as Record<string, string> | undefined)?.roc_payment_id);
      const pi =
        typeof obj.payment_intent === 'string'
          ? obj.payment_intent
          : (obj.payment_intent as { id?: string } | undefined)?.id;
      const method = this.mapMethod(
        (obj.metadata as Record<string, string> | undefined)?.method,
      );

      if (!paymentId && !pi && !obj.id) {
        return { received: true, ignored: true };
      }

      try {
        const result = await this.payments.confirmFromWebhook({
          paymentId: paymentId || undefined,
          stripePaymentIntentId: pi,
          stripeCheckoutSessionId: obj.id as string | undefined,
          method,
        });
        return { received: true, ...result };
      } catch (e) {
        this.logger.warn(
          `webhook confirm failed: ${e instanceof Error ? e.message : e}`,
        );
        // Still 200 to avoid infinite Stripe retries on unknown ids in dev
        return {
          received: true,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    // PaymentIntent succeeded (Payment Sheet path)
    if (type === 'payment_intent.succeeded') {
      const pi = obj.id as string | undefined;
      const paymentId = (obj.metadata as Record<string, string> | undefined)
        ?.roc_payment_id;
      const method = this.mapMethod(
        (obj.metadata as Record<string, string> | undefined)?.method,
      );
      try {
        const result = await this.payments.confirmFromWebhook({
          paymentId,
          stripePaymentIntentId: pi,
          method,
        });
        return { received: true, ...result };
      } catch (e) {
        this.logger.warn(
          `PI webhook failed: ${e instanceof Error ? e.message : e}`,
        );
        return { received: true, error: e instanceof Error ? e.message : String(e) };
      }
    }

    return { received: true, ignored: true, type };
  }

  private mapMethod(raw?: string): RocPayMethod | undefined {
    if (!raw) return undefined;
    if (raw === 'usdc' || raw === 'apple_pay' || raw === 'google_pay' || raw === 'card') {
      return raw;
    }
    return 'card';
  }
}

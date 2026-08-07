import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** How the player paid (all settle to USD on ledger). */
export type RocPayMethod = 'card' | 'apple_pay' | 'google_pay' | 'usdc';

export type RocPaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/**
 * Checkout attempt. Ledger is credited ONLY from Stripe webhook (or mock confirm).
 * Unit of account: USD cents. USDC is a pay-in rail, not a separate ledger.
 */
@Entity({ name: 'roc_payments' })
@Index(['stripePaymentIntentId'])
@Index(['rocLeagueId', 'payerUserId'])
@Index(['entryId'])
export class RocPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roc_league_id', type: 'uuid' })
  rocLeagueId!: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @Column({ name: 'entry_id', type: 'uuid', nullable: true })
  entryId!: string | null;

  @Column({ name: 'payer_user_id', type: 'uuid' })
  payerUserId!: string;

  /** USD cents — sole unit of account on ROC ledger */
  @Column({ name: 'amount_usd_cents', type: 'bigint' })
  amountUsdCents!: string;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 24, default: 'card' })
  method!: RocPayMethod;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: RocPaymentStatus;

  @Column({ name: 'stripe_checkout_session_id', type: 'varchar', length: 128, nullable: true })
  stripeCheckoutSessionId!: string | null;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 128, nullable: true })
  stripePaymentIntentId!: string | null;

  @Column({ name: 'stripe_client_secret', type: 'varchar', length: 256, nullable: true })
  stripeClientSecret!: string | null;

  /** Checkout URL when using Stripe Checkout */
  @Column({ name: 'checkout_url', type: 'text', nullable: true })
  checkoutUrl!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 80, unique: true })
  idempotencyKey!: string;

  /** Split lines recorded after webhook confirm */
  @Column({ name: 'split_json', type: 'jsonb', nullable: true })
  splitJson!: {
    players_fund_cents: number;
    operator_cents: number;
    platform_cents: number;
    bps: { players_fund_bps: number; operator_bps: number; platform_bps: number };
  } | null;

  @Column({ name: 'ledger_group_id', type: 'uuid', nullable: true })
  ledgerGroupId!: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'metadata_json', type: 'jsonb', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

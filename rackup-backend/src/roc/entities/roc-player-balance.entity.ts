import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RocPreferredPayoutMethod = 'stripe_bank' | 'usdc';

/**
 * Player wallet snapshot (USD only).
 * available = credits from session payouts not yet withdrawn
 * pending = projected / in open sessions (not yet paid)
 * lifetime_paid_out = sum of successful external transfers
 */
@Entity({ name: 'roc_player_balances' })
@Index(['userId'])
export class RocPlayerBalance {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'available_usd_cents', type: 'bigint', default: 0 })
  availableUsdCents!: string;

  @Column({ name: 'pending_usd_cents', type: 'bigint', default: 0 })
  pendingUsdCents!: string;

  @Column({ name: 'lifetime_paid_out_usd_cents', type: 'bigint', default: 0 })
  lifetimePaidOutUsdCents!: string;

  @Column({ name: 'lifetime_earned_usd_cents', type: 'bigint', default: 0 })
  lifetimeEarnedUsdCents!: string;

  @Column({
    name: 'preferred_payout_method',
    type: 'varchar',
    length: 24,
    default: 'stripe_bank',
  })
  preferredPayoutMethod!: RocPreferredPayoutMethod;

  /** Stripe Connect / Customer for bank payouts */
  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 64, nullable: true })
  stripeCustomerId!: string | null;

  @Column({ name: 'stripe_connect_account_id', type: 'varchar', length: 64, nullable: true })
  stripeConnectAccountId!: string | null;

  /** Solana USDC wallet when preferred_payout_method = usdc */
  @Column({ name: 'usdc_wallet_address', type: 'varchar', length: 128, nullable: true })
  usdcWalletAddress!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

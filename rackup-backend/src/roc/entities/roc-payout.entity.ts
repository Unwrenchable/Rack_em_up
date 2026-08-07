import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RocPayoutStatus =
  | 'projected'
  | 'finalized'
  | 'transferring'
  | 'paid'
  | 'failed'
  | 'void';

export type RocPayoutRail = 'stripe_bank' | 'usdc' | 'wallet_credit' | 'manual';

@Entity({ name: 'roc_payouts' })
@Index(['sessionId', 'place'])
@Index(['rocLeagueId', 'status'])
export class RocPayout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roc_league_id', type: 'uuid' })
  rocLeagueId!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'int' })
  place!: number;

  @Column({ name: 'payee_user_id', type: 'uuid' })
  payeeUserId!: string;

  @Column({ name: 'competitor_type', type: 'varchar', length: 16, default: 'USER' })
  competitorType!: string;

  @Column({ name: 'competitor_id', type: 'uuid' })
  competitorId!: string;

  @Column({ name: 'gross_usd_cents', type: 'bigint' })
  grossUsdCents!: string;

  @Column({ type: 'varchar', length: 24, default: 'finalized' })
  status!: RocPayoutStatus;

  @Column({ name: 'payout_rail', type: 'varchar', length: 24, default: 'wallet_credit' })
  payoutRail!: RocPayoutRail;

  @Column({ name: 'stripe_transfer_id', type: 'varchar', length: 128, nullable: true })
  stripeTransferId!: string | null;

  @Column({ name: 'usdc_tx_ref', type: 'varchar', length: 128, nullable: true })
  usdcTxRef!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 120, unique: true })
  idempotencyKey!: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'metadata_json', type: 'jsonb', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type RocLedgerDirection = 'CREDIT' | 'DEBIT';

export type RocLedgerEntryType =
  | 'DUES_IN'
  | 'SESSION_ENTRY_IN'
  | 'EVENT_ENTRY_IN'
  | 'SIDE_POT_IN'
  | 'SPONSOR_IN'
  | 'SPLIT_PLAYERS_FUND'
  | 'SPLIT_OPERATOR'
  | 'SPLIT_PLATFORM'
  | 'PAYOUT_OUT'
  | 'PAYOUT_TO_WALLET'
  | 'OPERATOR_WITHDRAWAL'
  | 'PLATFORM_SETTLEMENT'
  | 'REFUND_OUT'
  | 'TRANSFER'
  | 'ADJUSTMENT_IN';

export type RocLedgerStatus = 'pending' | 'confirmed' | 'paid' | 'refunded' | 'void';

/**
 * Immutable append-only ledger. Unit: USD cents only.
 * Card and USDC pay-ins both credit the same USD ledger.
 */
@Entity({ name: 'roc_ledger_entries' })
@Index(['rocLeagueId', 'createdAt'])
@Index(['accountId', 'createdAt'])
@Index(['sessionId'])
@Index(['idempotencyKey'], { unique: true })
export class RocLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roc_league_id', type: 'uuid' })
  rocLeagueId!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ type: 'varchar', length: 8 })
  direction!: RocLedgerDirection;

  /** Always USD cents */
  @Column({ name: 'amount_usd_cents', type: 'bigint' })
  amountUsdCents!: string;

  @Column({ name: 'balance_after_cents', type: 'bigint', nullable: true })
  balanceAfterCents!: string | null;

  @Column({ name: 'entry_type', type: 'varchar', length: 32 })
  entryType!: RocLedgerEntryType;

  @Column({ type: 'varchar', length: 16, default: 'confirmed' })
  status!: RocLedgerStatus;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @Column({ name: 'entry_id', type: 'uuid', nullable: true })
  entryId!: string | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'payout_id', type: 'uuid', nullable: true })
  payoutId!: string | null;

  @Column({ name: 'payer_user_id', type: 'uuid', nullable: true })
  payerUserId!: string | null;

  @Column({ name: 'payee_user_id', type: 'uuid', nullable: true })
  payeeUserId!: string | null;

  /** card | apple_pay | google_pay | usdc | transfer | system */
  @Column({ type: 'varchar', length: 24, nullable: true })
  method!: string | null;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 128, nullable: true })
  stripePaymentIntentId!: string | null;

  @Column({ name: 'stripe_transfer_id', type: 'varchar', length: 128, nullable: true })
  stripeTransferId!: string | null;

  /** Links the 3-way split credits for one payment */
  @Column({ name: 'related_group_id', type: 'uuid', nullable: true })
  relatedGroupId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 120 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 280 })
  memo!: string;

  @Column({ name: 'metadata_json', type: 'jsonb', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64, default: 'SYSTEM' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RocLeagueStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type RocVisibility = 'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY';

/** Default split in basis points (must sum 10000). */
export type RocSplitBps = {
  players_fund_bps: number;
  operator_bps: number;
  platform_bps: number;
};

export const ROC_DEFAULT_SPLIT: RocSplitBps = {
  players_fund_bps: 4500,
  operator_bps: 3500,
  platform_bps: 2000,
};

@Entity({ name: 'roc_leagues' })
@Index(['slug'], { unique: true })
@Index(['ownerUserId'])
export class RocLeague {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'ACTIVE' })
  status!: RocLeagueStatus;

  @Column({ type: 'varchar', length: 24, default: 'PUBLIC' })
  visibility!: RocVisibility;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'home_hall_id', type: 'uuid', nullable: true })
  homeHallId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  region!: string | null;

  /** JSON split bps — default 45/35/20 */
  @Column({ name: 'default_split', type: 'jsonb', default: () => "'{}'" })
  defaultSplit!: RocSplitBps;

  @Column({ name: 'enabled_formats', type: 'jsonb', default: () => "'[\"SINGLES\"]'" })
  enabledFormats!: string[];

  @Column({ name: 'enabled_game_styles', type: 'jsonb', default: () => "'[]'" })
  enabledGameStyles!: string[];

  @Column({ name: 'currency', type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  @Column({ name: 'stripe_connect_account_id', type: 'varchar', length: 64, nullable: true })
  stripeConnectAccountId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

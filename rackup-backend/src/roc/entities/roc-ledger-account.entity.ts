import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type RocLedgerAccountKind =
  | 'PLAYERS_FUND'
  | 'OPERATOR_REVENUE'
  | 'PLATFORM_REVENUE'
  | 'HOLDING'
  | 'PAYOUT_CLEARING'
  | 'PLAYER_WALLET'
  | 'SIDE_POT';

@Entity({ name: 'roc_ledger_accounts' })
@Index(['rocLeagueId', 'kind'])
@Index(['rocLeagueId', 'userId'], { unique: true, where: '"user_id" IS NOT NULL AND kind = \'PLAYER_WALLET\'' })
export class RocLedgerAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roc_league_id', type: 'uuid' })
  rocLeagueId!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: RocLedgerAccountKind;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** For PLAYER_WALLET accounts */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  @Column({ name: 'is_system', type: 'boolean', default: true })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

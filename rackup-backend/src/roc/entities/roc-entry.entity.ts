import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RocEntryKind = 'SEASON_DUES' | 'SESSION_ENTRY' | 'EVENT_ENTRY' | 'SIDE_POT';
export type RocEntryStatus =
  | 'DUE'
  | 'PARTIAL'
  | 'PAID'
  | 'WAIVED'
  | 'REFUNDED'
  | 'VOID';

@Entity({ name: 'roc_entries' })
@Index(['rocLeagueId', 'userId'])
@Index(['sessionId'])
export class RocEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roc_league_id', type: 'uuid' })
  rocLeagueId!: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @Column({ name: 'season_id', type: 'uuid', nullable: true })
  seasonId!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** For team formats later; singles = user */
  @Column({ name: 'competitor_type', type: 'varchar', length: 16, default: 'USER' })
  competitorType!: 'USER' | 'TEAM';

  @Column({ name: 'competitor_id', type: 'uuid' })
  competitorId!: string;

  @Column({ name: 'entry_kind', type: 'varchar', length: 24 })
  entryKind!: RocEntryKind;

  /** USD cents due */
  @Column({ name: 'amount_due_cents', type: 'bigint' })
  amountDueCents!: string;

  @Column({ name: 'amount_paid_cents', type: 'bigint', default: 0 })
  amountPaidCents!: string;

  @Column({ type: 'varchar', length: 16, default: 'DUE' })
  status!: RocEntryStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

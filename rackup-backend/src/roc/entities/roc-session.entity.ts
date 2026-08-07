import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { RocSplitBps } from './roc-league.entity';

export type RocSessionStatus =
  | 'SCHEDULED'
  | 'REGISTRATION'
  | 'LIVE'
  | 'SCORING'
  | 'AUDIT_HOLD'
  | 'PAYING_OUT'
  | 'CLOSED'
  | 'CANCELLED';

/** Operator-facing RealAI audit gate (not a payment authorization). */
export type RocAuditUiStatus = 'none' | 'pass' | 'warnings' | 'blocked';

export type RocPayoutStructure = {
  mode: 'PERCENT_OF_FUND' | 'FIXED_CENTS';
  places: Array<{ place: number; bps?: number; amount_cents?: number }>;
  shortfall_policy?: 'SCALE' | 'HOLD';
};

@Entity({ name: 'roc_sessions' })
@Index(['rocLeagueId', 'status'])
export class RocSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roc_league_id', type: 'uuid' })
  rocLeagueId!: string;

  @Column({ name: 'season_id', type: 'uuid', nullable: true })
  seasonId!: string | null;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'session_index', type: 'int', default: 1 })
  sessionIndex!: number;

  @Column({ type: 'varchar', length: 24, default: 'SCHEDULED' })
  status!: RocSessionStatus;

  @Column({ name: 'game_style', type: 'varchar', length: 32, default: 'nine_ball' })
  gameStyle!: string;

  @Column({ type: 'varchar', length: 32, default: 'SINGLES' })
  format!: string;

  @Column({ name: 'entry_fee_cents', type: 'bigint', default: 0 })
  entryFeeCents!: string;

  /** Frozen at open — never change mid-session */
  @Column({ name: 'split_snapshot', type: 'jsonb', nullable: true })
  splitSnapshot!: RocSplitBps | null;

  @Column({ name: 'payout_structure_snapshot', type: 'jsonb', nullable: true })
  payoutStructureSnapshot!: RocPayoutStructure | null;

  @Column({ name: 'auto_payout', type: 'boolean', default: true })
  autoPayout!: boolean;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'close_summary_json', type: 'jsonb', nullable: true })
  closeSummaryJson!: Record<string, unknown> | null;

  /** RealAI ledger_audit + payout_sanity gate */
  @Column({ name: 'audit_status', type: 'varchar', length: 16, default: 'none' })
  auditStatus!: RocAuditUiStatus;

  @Column({ name: 'audit_id', type: 'uuid', nullable: true })
  auditId!: string | null;

  @Column({ name: 'audit_result_json', type: 'jsonb', nullable: true })
  auditResultJson!: Record<string, unknown> | null;

  @Column({ name: 'audit_at', type: 'timestamptz', nullable: true })
  auditAt!: Date | null;

  /** Operator acknowledged warnings and released payout */
  @Column({ name: 'audit_operator_override', type: 'boolean', default: false })
  auditOperatorOverride!: boolean;

  @Column({ name: 'audit_override_by', type: 'uuid', nullable: true })
  auditOverrideBy!: string | null;

  @Column({ name: 'audit_override_note', type: 'text', nullable: true })
  auditOverrideNote!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

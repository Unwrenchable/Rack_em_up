import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TapStats } from './player-card.types';

/**
 * Cross-league identity row. `id` is `unified_id`.
 *
 * Does NOT store ROC Glicko-2 — that remains on `users.rating` / rd / etc.
 * Shadow columns are a Fargo-like display pair only.
 */
@Entity({ name: 'player_identities' })
@Index(['userId'], { unique: true })
@Index(['nameNormalized'])
@Index(['fargoId'])
@Index(['fargoReadableId'])
@Index(['apaMemberId'])
export class PlayerIdentity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'name_normalized', type: 'text' })
  nameNormalized!: string;

  @Column({ name: 'fargo_id', type: 'varchar', length: 64, nullable: true })
  fargoId!: string | null;

  @Column({ name: 'fargo_readable_id', type: 'varchar', length: 32, nullable: true })
  fargoReadableId!: string | null;

  @Column({ name: 'apa_member_id', type: 'varchar', length: 64, nullable: true })
  apaMemberId!: string | null;

  @Column({ name: 'bca_id', type: 'varchar', length: 64, nullable: true })
  bcaId!: string | null;

  @Column({ name: 'tap_id', type: 'varchar', length: 64, nullable: true })
  tapId!: string | null;

  /** Last non-negative FargoRate published rating from the public API (or seed). */
  @Column({ name: 'fargo_rating', type: 'double precision', nullable: true })
  fargoRating!: number | null;

  @Column({ name: 'fargo_robustness', type: 'double precision', nullable: true })
  fargoRobustness!: number | null;

  @Column({ name: 'fargo_effective_rating', type: 'double precision', nullable: true })
  fargoEffectiveRating!: number | null;

  @Column({ name: 'fargo_fetched_at', type: 'timestamptz', nullable: true })
  fargoFetchedAt!: Date | null;

  @Column({ name: 'apa_sl', type: 'double precision', nullable: true })
  apaSl!: number | null;

  @Column({ name: 'bca_elo', type: 'double precision', nullable: true })
  bcaElo!: number | null;

  @Column({ name: 'tap_stats', type: 'jsonb', nullable: true })
  tapStats!: TapStats | null;

  @Column({ name: 'shadow_rating', type: 'double precision', nullable: true })
  shadowRating!: number | null;

  @Column({ name: 'shadow_robustness', type: 'double precision', nullable: true })
  shadowRobustness!: number | null;

  @Column({ name: 'shadow_provisional', type: 'boolean', default: true })
  shadowProvisional!: boolean;

  @Column({ name: 'shadow_confidence_low', type: 'double precision', nullable: true })
  shadowConfidenceLow!: number | null;

  @Column({ name: 'shadow_confidence_high', type: 'double precision', nullable: true })
  shadowConfidenceHigh!: number | null;

  @Column({ name: 'shadow_computed_at', type: 'timestamptz', nullable: true })
  shadowComputedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

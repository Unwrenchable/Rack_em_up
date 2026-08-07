import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PoolMatchStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

@Entity({ name: 'pool_matches' })
export class PoolMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'player_a_id', type: 'uuid' })
  playerAId!: string;

  @Column({ name: 'player_b_id', type: 'uuid' })
  playerBId!: string;

  @Column({ name: 'hall_id', type: 'uuid', nullable: true })
  hallId!: string | null;

  /** Game style string — e.g. 8-ball, 9-ball, rackup-pyramid */
  @Column({ type: 'text' })
  game!: string;

  /**
   * Race-to racks (standard games) OR points-to-win (RackUp Pyramid).
   */
  @Column({ name: 'race_to', type: 'int' })
  raceTo!: number;

  @Column({ type: 'text', default: 'PENDING' })
  status!: PoolMatchStatus;

  @Column({ name: 'a_score', type: 'int', nullable: true })
  aScore!: number | null;

  @Column({ name: 'b_score', type: 'int', nullable: true })
  bScore!: number | null;

  /** 7 or 9 for American tables (Pyramid + future styles). */
  @Column({ name: 'table_size_ft', type: 'int', nullable: true })
  tableSizeFt!: number | null;

  /** Pyramid skill tier (BEGINNER…PRO); null for non-pyramid. */
  @Column({ name: 'skill_level', type: 'varchar', length: 32, nullable: true })
  skillLevel!: string | null;

  /**
   * Style-specific live state.
   * For pyramid: PyramidLiveState (balls remaining, pocketed map, points, …).
   */
  @Column({ name: 'state_json', type: 'jsonb', nullable: true })
  stateJson!: Record<string, any> | null;

  /** Elo K multiplier for this match (pyramid skill weight); default 1. */
  @Column({
    name: 'rating_weight',
    type: 'float',
    default: 1,
  })
  ratingWeight!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

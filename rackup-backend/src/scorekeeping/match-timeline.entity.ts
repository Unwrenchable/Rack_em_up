import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MatchTimelineDomain, MatchTimelineEvent } from './match-timeline.types';

/**
 * Durable match timeline (racks, fouls, shots, SOTD candidates).
 * Redis holds a live mirror; this table is source of truth after finalize.
 */
@Entity({ name: 'match_timelines' })
@Index(['matchId'], { unique: true })
@Index(['domain', 'entityId'])
export class MatchTimelineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ type: 'varchar', length: 32 })
  domain!: MatchTimelineDomain;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ name: 'hall_id', type: 'uuid', nullable: true })
  hallId!: string | null;

  @Column({ name: 'player_a_id', type: 'uuid', nullable: true })
  playerAId!: string | null;

  @Column({ name: 'player_b_id', type: 'uuid', nullable: true })
  playerBId!: string | null;

  @Column({ name: 'game_type', type: 'varchar', nullable: true })
  gameType!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  events!: MatchTimelineEvent[];

  @Column({ name: 'sotd_candidates', type: 'jsonb', default: () => "'[]'" })
  sotdCandidates!: string[];

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

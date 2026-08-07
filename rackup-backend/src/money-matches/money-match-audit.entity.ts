import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Durable money-match audit trail (Postgres).
 * Complements Redis `audit:v2:money:*` for long-term export / arbiter review.
 */
@Entity({ name: 'money_match_audits' })
@Index(['matchId', 'createdAt'])
@Index(['action'])
export class MoneyMatchAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

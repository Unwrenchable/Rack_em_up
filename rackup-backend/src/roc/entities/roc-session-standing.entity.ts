import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Lightweight standings for payout place assignment (singles v1). */
@Entity({ name: 'roc_session_standings' })
@Index(['sessionId', 'place'])
@Index(['sessionId', 'userId'], { unique: true })
export class RocSessionStanding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'int', default: 0 })
  wins!: number;

  @Column({ type: 'int', default: 0 })
  losses!: number;

  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({ type: 'int', nullable: true })
  place!: number | null;

  @Column({ name: 'payout_cents', type: 'bigint', default: 0 })
  payoutCents!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

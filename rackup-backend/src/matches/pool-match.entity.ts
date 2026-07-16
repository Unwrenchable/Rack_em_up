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

  @Column({ type: 'text' })
  game!: string;

  @Column({ name: 'race_to', type: 'int' })
  raceTo!: number;

  @Column({ type: 'text', default: 'PENDING' })
  status!: PoolMatchStatus;

  @Column({ name: 'a_score', type: 'int', nullable: true })
  aScore!: number | null;

  @Column({ name: 'b_score', type: 'int', nullable: true })
  bScore!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
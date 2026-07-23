import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'hall_leaderboard_entries_v2' })
export class HallLeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'hall_id', type: 'uuid' })
  hallId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'int', default: 1500 })
  elo!: number;

  @Column({ name: 'wins', type: 'int', default: 0 })
  wins!: number;

  @Column({ name: 'activity_score', type: 'int', default: 0 })
  activityScore!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}


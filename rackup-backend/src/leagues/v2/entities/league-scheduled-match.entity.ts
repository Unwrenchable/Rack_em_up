import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum LeagueScheduledMatchStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
}

@Entity('league_scheduled_matches_v2')
@Index(['seasonId', 'weekIndex'])
export class LeagueScheduledMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  seasonId!: string;

  @Column({ type: 'int' })
  weekIndex!: number;

  @Column({ type: 'uuid' })
  playerAId!: string;

  @Column({ type: 'uuid' })
  playerBId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  playerAScore?: number | null;

  @Column({ type: 'int', nullable: true })
  playerBScore?: number | null;

  @Column({ type: 'varchar' })
  status!: LeagueScheduledMatchStatus;

  @Column({ type: 'timestamptz', nullable: true })
  reportedAt?: Date | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}


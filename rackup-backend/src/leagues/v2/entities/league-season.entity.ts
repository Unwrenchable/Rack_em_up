import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum LeagueSeasonStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('league_seasons_v2')
@Index(['organizerId'])
export class LeagueSeason {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizerId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  region!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  weeklySchedule?: any[];

  @Column({ type: 'varchar' })
  status!: LeagueSeasonStatus;

  @Column({ type: 'int', default: 0 })
  weekIndex!: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date | null;
}


import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('league_standings_v2')
@Index(['seasonId', 'playerId'], { unique: true })
export class LeagueStanding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  seasonId!: string;

  @Column({ type: 'uuid' })
  playerId!: string;

  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}


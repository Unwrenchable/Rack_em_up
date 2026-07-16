import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'league_teams' })
export class LeagueTeam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'league_id', type: 'uuid' })
  leagueId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'captain_id', type: 'uuid' })
  captainId!: string;

  @Column({ name: 'roster_json', type: 'jsonb', nullable: true })
  rosterJson!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}


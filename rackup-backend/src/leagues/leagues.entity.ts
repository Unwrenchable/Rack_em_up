import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type LeagueStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

@Entity({ name: 'leagues' })
export class League {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organizer_id', type: 'uuid' })
  organizerId!: string;

  @Column({ name: 'hall_id', type: 'uuid' })
  hallId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  game!: string;

  @Column({ type: 'text' })
  season!: string;

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt!: Date | null;

  @Column({ type: 'text', default: 'DRAFT' })
  status!: LeagueStatus;

  @Column({ name: 'config_json', type: 'jsonb', nullable: true })
  configJson!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

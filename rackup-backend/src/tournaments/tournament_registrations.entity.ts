import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tournament } from './tournaments.entity';

@Entity({ name: 'tournament_registrations' })
export class TournamentRegistration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId!: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId!: string;

  @ManyToOne(() => Tournament, (t) => t.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;
}


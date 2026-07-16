import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Tournament } from './tournaments.entity';

@Entity({ name: 'tournament_matches' })
export class TournamentMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId!: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @Column({ type: 'int' })
  round!: number;

  @Column({ name: 'match_index', type: 'int' })
  matchIndex!: number;

  @Column({ name: 'player_a_id', type: 'uuid', nullable: true })
  playerAId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'player_a_id' })
  playerA!: User | null;

  @Column({ name: 'player_b_id', type: 'uuid', nullable: true })
  playerBId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'player_b_id' })
  playerB!: User | null;

  @Column({ name: 'a_score', type: 'int', default: 0 })
  aScore!: number;

  @Column({ name: 'b_score', type: 'int', default: 0 })
  bScore!: number;

  @Column({ type: 'text', default: 'PENDING' })
  status!: 'PENDING' | 'COMPLETED';

  @Column({ name: 'next_match_id', type: 'uuid', nullable: true })
  nextMatchId!: string | null;
}

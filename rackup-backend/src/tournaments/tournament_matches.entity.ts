import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tournament } from './tournaments.entity';

export enum TournamentMatchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TournamentBracketSide {
  WINNERS = 'WINNERS',
  LOSERS = 'LOSERS',
}

@Entity({ name: 'tournament_matches' })
export class TournamentMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId!: string;

  @ManyToOne(() => Tournament, (t) => t.matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @Column({ type: 'int' })
  round!: number;

  @Column({ name: 'match_index', type: 'int' })
  matchIndex!: number;

  @Column({ name: 'player_a_id', type: 'uuid', nullable: true })
  playerAId!: string | null;

  @Column({ name: 'player_b_id', type: 'uuid', nullable: true })
  playerBId!: string | null;

  @Column({ name: 'a_score', type: 'int', nullable: true })
  aScore!: number | null;

  @Column({ name: 'b_score', type: 'int', nullable: true })
  bScore!: number | null;

  @Column({ type: 'text', default: TournamentMatchStatus.PENDING })
  status!: TournamentMatchStatus;

  @Column({ name: 'next_match_id', type: 'uuid', nullable: true })
  nextMatchId!: string | null;

  @ManyToOne(() => TournamentMatch, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'next_match_id' })
  nextMatch!: TournamentMatch | null;

  @Column({ type: 'text', default: TournamentBracketSide.WINNERS })
  bracket!: TournamentBracketSide;

  get winnerId(): string | null {
    if (this.aScore == null || this.bScore == null) return null;
    return this.aScore > this.bScore ? this.playerAId : this.playerBId;
  }
}


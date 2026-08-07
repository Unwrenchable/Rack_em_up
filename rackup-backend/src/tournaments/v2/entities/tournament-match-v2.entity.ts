import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TournamentBracketSide {
  WINNERS = 'WINNERS',
  LOSERS = 'LOSERS',
  /** Double-elim championship (and optional reset series game 2) */
  GRAND_FINAL = 'GRAND_FINAL',
}

export enum TournamentMatchStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('tournament_matches_v2')
@Index(['tournamentId', 'round'])
export class TournamentMatchV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tournamentId!: string;

  @Column({ type: 'int' })
  round!: number;

  @Column({ type: 'int' })
  matchIndex!: number;

  @Column({ type: 'uuid', nullable: true })
  playerAId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  playerBId?: string | null;

  @Column({ type: 'int', nullable: true })
  aScore?: number | null;

  @Column({ type: 'int', nullable: true })
  bScore?: number | null;

  @Column({ type: 'varchar' })
  status!: TournamentMatchStatus;

  @Column({ type: 'varchar' })
  bracket!: TournamentBracketSide;

  @Column({ type: 'uuid', nullable: true })
  winnerId?: string | null;
}


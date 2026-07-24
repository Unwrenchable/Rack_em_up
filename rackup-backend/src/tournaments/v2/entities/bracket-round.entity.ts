import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tournament_bracket_rounds_v2')
@Index(['tournamentId', 'roundNumber'])
export class BracketRound {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tournamentId!: string;

  @Column({ type: 'int' })
  roundNumber!: number;
}


import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tournament_bracket_nodes_v2')
@Index(['tournamentId', 'roundNumber', 'nodeIndex'])
export class BracketNode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tournamentId!: string;

  @Column({ type: 'int' })
  roundNumber!: number;

  @Column({ type: 'int' })
  nodeIndex!: number;

  @Column({ type: 'uuid', nullable: true })
  matchId?: string | null;
}


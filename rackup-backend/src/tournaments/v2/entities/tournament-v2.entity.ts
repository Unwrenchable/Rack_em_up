import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TournamentV2Mode {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SWISS = 'SWISS',
}

/** How entrants are ordered before bracket generation. */
export type SeedStrategy = 'manual' | 'random' | 'elo';

export enum TournamentV2Status {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('tournaments_v2')
export class TournamentV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizerId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  game!: string;

  @Column({ type: 'varchar' })
  mode!: TournamentV2Mode;

  @Column({ type: 'varchar' })
  status!: TournamentV2Status;

  @Column({ type: 'jsonb', nullable: true })
  entrants?: string[];

  @Column({ type: 'jsonb', nullable: true })
  formatConfigJson?: Record<string, any>;

  // convenience mirror (not persisted); used by DTO mapping only.
  get format_config(): Record<string, any> | undefined {
    return this.formatConfigJson;
  }
}


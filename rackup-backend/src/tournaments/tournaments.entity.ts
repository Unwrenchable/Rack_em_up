import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { TournamentMatch } from './tournament_matches.entity';
import { TournamentRegistration } from './tournament_registrations.entity';

export enum TournamentFormat {
  SINGLE_ELIM = 'SINGLE_ELIM',
  DOUBLE_ELIM = 'DOUBLE_ELIM',
  SWISS = 'SWISS',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity({ name: 'tournaments' })
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organizer_id', type: 'uuid' })
  organizerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @Column({ name: 'hall_id', type: 'uuid', nullable: true })
  hallId!: string | null;

  @Column({ type: 'text', default: TournamentFormat.SINGLE_ELIM })
  format!: TournamentFormat;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  game!: string;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt!: Date;

  @Column({ type: 'text', default: TournamentStatus.DRAFT })
  status!: TournamentStatus;

  @Column({ name: 'config_json', type: 'jsonb', default: {} })
  configJson!: {
    raceTo?: number;
    entrants?: string[];
    bracket?: Array<{
      round: number;
      matchIndex: number;
      nextMatchIndex?: number | null;
      nextRound?: number | null;
    }>;
  };

  @OneToMany(() => TournamentMatch, (match) => match.tournament)
  matches!: TournamentMatch[];

  @OneToMany(
    () => TournamentRegistration,
    (registration) => registration.tournament,
  )
  registrations!: TournamentRegistration[];
}


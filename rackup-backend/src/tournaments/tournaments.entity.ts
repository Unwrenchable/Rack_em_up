import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

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

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  format!: 'SINGLE_ELIM' | 'DOUBLE_ELIM';

  @Column({ type: 'text' })
  game!: string;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt!: Date;

  @Column({ type: 'text', default: 'DRAFT' })
  status!: 'DRAFT' | 'ACTIVE' | 'COMPLETED';

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
}

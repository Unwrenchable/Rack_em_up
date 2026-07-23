import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MatchmakingSessionStatus =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED';

@Entity({ name: 'matchmaking_sessions_v2' })
export class MatchmakingSessionV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'requester_user_id', type: 'uuid' })
  requesterUserId!: string;

  @Index()
  @Column({ name: 'opponent_user_id', type: 'uuid' })
  opponentUserId!: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId!: string | null;

  @Column({ type: 'text' })
  game!: string;

  @Column({ type: 'text' })
  stakes!: string;

  @Column({ name: 'hall_id', type: 'uuid', nullable: true })
  hallId!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({
    type: 'text',
    default: 'PENDING_CONFIRMATION',
  })
  status!: MatchmakingSessionStatus;

  @Column({ name: 'confirmed_by_requester', type: 'boolean', default: false })
  confirmedByRequester!: boolean;

  @Column({ name: 'confirmed_by_opponent', type: 'boolean', default: false })
  confirmedByOpponent!: boolean;

  @Column({ name: 'match_id', type: 'uuid', nullable: true })
  matchId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}


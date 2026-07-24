import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'matchmaking_request_v2' })
export class MatchmakingRequestV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lon!: number;

  @Column({ type: 'text' })
  game!: string;

  @Column({ type: 'text' })
  stakes!: string;

  /** Inclusive rating window */
  @Column({ name: 'min_rating', type: 'int' })
  minRating!: number;

  @Column({ name: 'max_rating', type: 'int' })
  maxRating!: number;

  /** Skill metric snapshot (ELO at time of search) */
  @Column({ name: 'elo_at_request', type: 'int' })
  eloAtRequest!: number;

  /** Max distance for pairing (meters). Default 20km. */
  @Column({ name: 'radius_meters', type: 'int', default: 20000 })
  radiusMeters!: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'text', default: 'PENDING' })
  status!: 'PENDING' | 'CANCELLED' | 'MATCHED' | 'EXPIRED';

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}


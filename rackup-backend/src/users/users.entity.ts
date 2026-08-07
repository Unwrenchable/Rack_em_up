import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', default: 'USER' })
  role!: 'USER' | 'ORGANIZER' | 'HALL_OWNER' | 'ADMIN';

  @Column({ type: 'int', default: 0 })
  reputation!: number;

  /**
   * ROC Glicko-2 continuous rating (RealAI-owned math).
   * Defaults: 500 / RD 175 / σ 0.06 — ROC_GLICKO2_RATING_CONTRACT.md
   */
  @Column({ type: 'double precision', default: 500 })
  rating!: number;

  /** Glicko-2 rating deviation */
  @Column({ type: 'double precision', default: 175 })
  rd!: number;

  /** Glicko-2 volatility (σ) */
  @Column({ type: 'double precision', default: 0.06 })
  volatility!: number;

  /** Rated matches completed on RackUp/ROC ladder */
  @Column({ type: 'int', default: 0 })
  matches!: number;

  /** Cached band label from last RealAI update (optional; derivable) */
  @Column({ name: 'rating_band', type: 'varchar', length: 32, nullable: true })
  ratingBand!: string | null;

  /** Cached "Advanced • 547" from last RealAI public payload */
  @Column({ name: 'rating_display', type: 'varchar', length: 64, nullable: true })
  ratingDisplay!: string | null;

  @Column({ name: 'rating_updated_at', type: 'timestamptz', nullable: true })
  ratingUpdatedAt!: Date | null;

  @Column({ name: 'last_match_delta', type: 'double precision', nullable: true })
  lastMatchDelta!: number | null;

  /** P3 premium tier: free | premium | hall_pro */
  @Column({ name: 'premium_tier', type: 'varchar', length: 32, default: 'free' })
  premiumTier!: 'free' | 'premium' | 'hall_pro';

  @Column({ name: 'premium_until', type: 'timestamptz', nullable: true })
  premiumUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt!: Date | null;
}


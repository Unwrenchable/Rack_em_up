import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'device_session_id', type: 'uuid' })
  @Index()
  deviceSessionId!: string;

  @Column({ name: 'hashed_token', type: 'text' })
  @Index({ unique: true })
  hashedToken!: string;

  @Column({ name: 'revoked', type: 'boolean', default: false })
  revoked!: boolean;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}


import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FriendshipStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'BLOCKED'
  | 'CANCELLED';

@Entity({ name: 'friendships' })
@Index(['requesterId', 'addresseeId'])
@Index(['status'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId!: string;

  @Column({ name: 'addressee_id', type: 'uuid' })
  addresseeId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: FriendshipStatus;

  /** When status=BLOCKED, who initiated the block */
  @Column({ name: 'blocked_by_id', type: 'uuid', nullable: true })
  blockedById!: string | null;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt!: Date | null;
}

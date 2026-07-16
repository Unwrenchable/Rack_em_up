import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

@Entity({ name: 'friendships' })
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId!: string;

  @Column({ name: 'addressee_id', type: 'uuid' })
  addresseeId!: string;

  @Column({ type: 'text', default: 'PENDING' })
  status!: FriendshipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
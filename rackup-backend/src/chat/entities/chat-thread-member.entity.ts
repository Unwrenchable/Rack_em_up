import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ChatMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

@Entity({ name: 'chat_thread_members' })
@Index(['threadId', 'userId'], { unique: true })
export class ChatThreadMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 16, default: 'MEMBER' })
  role!: ChatMemberRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt!: Date | null;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt!: Date | null;
}

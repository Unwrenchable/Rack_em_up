import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ChatMessageType =
  | 'TEXT'
  | 'MATCH_INVITE'
  | 'CHECKIN_SHARE'
  | 'MEETUP_ACTION'
  | 'SYSTEM';

@Entity({ name: 'chat_messages' })
@Index(['threadId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId!: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  @Column({ type: 'varchar', length: 24, default: 'TEXT' })
  type!: ChatMessageType;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ name: 'payload_json', type: 'jsonb', nullable: true })
  payloadJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

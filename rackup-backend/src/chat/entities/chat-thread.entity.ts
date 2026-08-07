import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ChatThreadKind = 'DM' | 'GROUP';

@Entity({ name: 'chat_threads' })
@Index(['kind', 'dmKey'], { unique: true, where: `"dm_key" IS NOT NULL` })
export class ChatThread {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  kind!: ChatThreadKind;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  /** sorted userIdA:userIdB for DMs — uniqueness */
  @Column({ name: 'dm_key', type: 'varchar', length: 80, nullable: true })
  dmKey!: string | null;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ name: 'last_message_preview', type: 'varchar', length: 240, nullable: true })
  lastMessagePreview!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

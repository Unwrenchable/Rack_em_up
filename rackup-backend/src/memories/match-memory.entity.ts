import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'match_memories' })
export class MatchMemory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ name: 'participant_user_id', type: 'uuid' })
  participantUserId!: string;

  @Column({ name: 'opponent_user_id', type: 'uuid', nullable: true })
  opponentUserId!: string | null;

  @Column({ type: 'text' })
  matchType!: 'STANDARD' | 'TOURNAMENT' | 'MONEY';

  @Column({ name: 'is_winner', type: 'boolean', default: false })
  isWinner!: boolean;

  @Column({ name: 'game', type: 'text', nullable: true })
  game!: string | null;

  @Column({ name: 'race_to', type: 'int', nullable: true })
  raceTo!: number | null;

  @Column({ name: 'stakes', type: 'text', nullable: true })
  stakes!: string | null;

  @Column({ name: 'scoreline', type: 'jsonb', nullable: true })
  scoreline!: Record<string, any> | null;

  @Column({
    name: 'highlight_video_urls',
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  highlightVideoUrls!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

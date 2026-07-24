import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('sotd_completions')
@Unique(['userId', 'completedOn'])
@Index(['userId'])
export class SotdCompletion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'shot_id', type: 'varchar', length: 64 })
  shotId!: string;

  @Column({ name: 'completed_on', type: 'date' })
  completedOn!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
